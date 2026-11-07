"use client";

import { DownloadIcon } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useState, useTransition, type ReactNode } from "react";
import type { Platform } from "@/db/schema/enums";
import { SimpleSelect } from "@/components/simple-select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMPORT_FIELDS,
  IMPORT_MAX_ROWS,
  normalizeHeader,
  type ImportField,
  type ImportRow,
} from "@/lib/experts/import-fields";
import { PLATFORM_OPTIONS } from "@/lib/labels";
import { previewImport, runImport, type ImportSummary } from "./actions";

type CsvRow = Record<string, string>;
type Mapping = Partial<Record<ImportField, string>>;
type Step = "upload" | "map" | "preview" | "done";
type Result = { created: number; skipped: number; errorCount: number };

function parseCsv(file: File, encoding: string) {
  return new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      encoding,
      transformHeader: (header) => header.trim(),
      complete: resolve,
      error: reject,
    });
  });
}

// Caracteres "�" indicam que o arquivo não é UTF-8 (comum no Excel em português).
function hasBrokenAccents(result: Papa.ParseResult<CsvRow>) {
  const sample = JSON.stringify([result.meta.fields, result.data.slice(0, 50)]);
  return sample.includes("�");
}

// Sugere a coluna de cada campo pelo nome do cabeçalho.
function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const used = new Set<string>();
  for (const field of IMPORT_FIELDS) {
    const header = headers.find(
      (h) => !used.has(h) && (field.aliases as readonly string[]).includes(normalizeHeader(h)),
    );
    if (header) {
      mapping[field.key] = header;
      used.add(header);
    }
  }
  return mapping;
}

export function ImportWizard({
  users,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [defaultPlatform, setDefaultPlatform] = useState<Platform>("instagram");
  const [ownerId, setOwnerId] = useState<string | null>(currentUserId);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      let parsed = await parseCsv(file, "UTF-8");
      if (hasBrokenAccents(parsed)) parsed = await parseCsv(file, "ISO-8859-1");
      const fields = (parsed.meta.fields ?? []).filter(Boolean);
      if (!fields.length) {
        return setError("Não encontrei o cabeçalho. A primeira linha precisa ter os nomes das colunas.");
      }
      if (!parsed.data.length) return setError("A planilha não tem nenhuma linha de dados.");
      if (parsed.data.length > IMPORT_MAX_ROWS) {
        return setError(
          `A planilha tem ${parsed.data.length} linhas. O limite é ${IMPORT_MAX_ROWS} por importação: divida o arquivo.`,
        );
      }
      setFileName(file.name);
      setHeaders(fields);
      setRows(parsed.data);
      setMapping(autoMap(fields));
      setStep("map");
    } catch {
      setError("Não consegui ler o arquivo. Confira se é um CSV.");
    }
  }

  function mappedRows(): ImportRow[] {
    const entries = Object.entries(mapping).filter(([, header]) => header) as [ImportField, string][];
    return rows.map((row) => Object.fromEntries(entries.map(([field, header]) => [field, row[header] ?? ""])));
  }

  function analyze() {
    if (!mapping.name || !mapping.handle) {
      return setError("Indique as colunas de Nome e de @ principal.");
    }
    setError(null);
    startTransition(async () => {
      const response = await previewImport({ rows: mappedRows(), defaultPlatform });
      if (!response.ok) return setError(response.error);
      setSummary(response.data);
      setStep("preview");
    });
  }

  function confirmImport() {
    setError(null);
    startTransition(async () => {
      const response = await runImport({ rows: mappedRows(), defaultPlatform, ownerId });
      if (!response.ok) return setError(response.error);
      setResult(response.data);
      setStep("done");
    });
  }

  function restart() {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setSummary(null);
    setResult(null);
    setError(null);
  }

  const errorBox = error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );

  if (step === "upload") {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>1. Envie a planilha</CardTitle>
          <CardDescription>
            Arquivo CSV com os nomes das colunas na primeira linha, separado por vírgula ou ponto e
            vírgula. Até {IMPORT_MAX_ROWS} linhas por importação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input type="file" accept=".csv,text/csv" onChange={(event) => onFile(event.target.files?.[0])} />
          {errorBox}
          <a
            href="/modelo-importacao-experts.csv"
            download
            className={buttonVariants({ variant: "outline", className: "self-start" })}
          >
            <DownloadIcon /> Baixar planilha modelo
          </a>
        </CardContent>
      </Card>
    );
  }

  if (step === "map") {
    const headerOptions = headers.map((header) => ({ value: header, label: header }));
    const firstRow = rows[0] ?? {};
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>2. Relacione as colunas</CardTitle>
          <CardDescription>
            {fileName}: {rows.length} linha(s). Já sugeri as colunas pelo nome; confira e ajuste.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            {IMPORT_FIELDS.map((field) => {
              const header = mapping[field.key];
              const example = header ? firstRow[header] : undefined;
              return (
                <div key={field.key} className="grid gap-1">
                  <Label>
                    {field.label}
                    {"required" in field && field.required && " *"}
                  </Label>
                  <SimpleSelect
                    aria-label={field.label}
                    emptyLabel="Não importar"
                    options={headerOptions}
                    value={header ?? null}
                    onValueChange={(value) => setMapping((current) => ({ ...current, [field.key]: value ?? undefined }))}
                  />
                  {example && <p className="truncate text-xs text-muted-foreground">Ex.: {example}</p>}
                </div>
              );
            })}
          </div>
          <div className="grid max-w-sm gap-1">
            <Label>Plataforma padrão</Label>
            <SimpleSelect
              aria-label="Plataforma padrão"
              options={PLATFORM_OPTIONS}
              value={defaultPlatform}
              onValueChange={(value) => setDefaultPlatform((value as Platform | null) ?? "instagram")}
            />
            <p className="text-xs text-muted-foreground">Usada quando a coluna de plataforma não existe ou está vazia.</p>
          </div>
          {errorBox}
          <div className="flex gap-2">
            <Button onClick={analyze} disabled={isPending}>
              {isPending ? "Analisando…" : "Analisar planilha"}
            </Button>
            <Button variant="ghost" onClick={restart} disabled={isPending}>
              Trocar arquivo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview" && summary) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>3. Confira antes de importar</CardTitle>
          <CardDescription>
            {summary.total} linha(s) analisadas. Duplicados e linhas com erro não são importados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Serão criados" value={summary.readyCount} highlight />
            <Stat label="Já cadastrados" value={summary.duplicatesInDbCount} />
            <Stat label="Repetidos na planilha" value={summary.duplicatesInFileCount} />
            <Stat label="Com erro" value={summary.errorCount} />
          </div>

          {(summary.newNiches.length > 0 || summary.newTags.length > 0) && (
            <div className="flex flex-col gap-2 text-sm">
              {summary.newNiches.length > 0 && (
                <NewNames label="Nichos novos que serão criados" names={summary.newNiches} />
              )}
              {summary.newTags.length > 0 && <NewNames label="Tags novas que serão criadas" names={summary.newTags} />}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Details title="Linhas com erro" count={summary.errorCount}>
              {summary.errors.map((item) => (
                <li key={item.line}>
                  Linha {item.line}: {item.message}
                </li>
              ))}
            </Details>
            <Details title="Já cadastrados no sistema" count={summary.duplicatesInDbCount}>
              {summary.duplicatesInDb.map((item) => (
                <li key={item.line}>
                  Linha {item.line}: @{item.handle} (já existe: {item.existingName})
                </li>
              ))}
            </Details>
            <Details title="Repetidos na planilha" count={summary.duplicatesInFileCount}>
              {summary.duplicatesInFile.map((item) => (
                <li key={item.line}>
                  Linha {item.line}: @{item.handle} (igual à linha {item.firstLine})
                </li>
              ))}
            </Details>
          </div>

          <div className="grid max-w-sm gap-1">
            <Label>Responsável pelos leads importados</Label>
            <SimpleSelect
              aria-label="Responsável"
              emptyLabel="Sem responsável (fila Não atribuídos)"
              options={users.map((user) => ({ value: user.id, label: user.name }))}
              value={ownerId}
              onValueChange={setOwnerId}
            />
          </div>

          {errorBox}
          <div className="flex gap-2">
            <Button onClick={confirmImport} disabled={isPending || summary.readyCount === 0}>
              {isPending ? "Importando…" : `Importar ${summary.readyCount} lead(s)`}
            </Button>
            <Button variant="ghost" onClick={() => setStep("map")} disabled={isPending}>
              Voltar ao mapeamento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Importação concluída</CardTitle>
        <CardDescription>Os leads entraram na etapa “Novo lead”.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Criados" value={result?.created ?? 0} highlight />
          <Stat label="Ignorados (duplicados)" value={result?.skipped ?? 0} />
          <Stat label="Com erro" value={result?.errorCount ?? 0} />
        </div>
        <div className="flex gap-2">
          <Link href="/experts" className={buttonVariants()}>
            Ver experts
          </Link>
          <Button variant="ghost" onClick={restart}>
            Importar outra planilha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "bg-muted/60" : ""}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function NewNames({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      {names.map((name) => (
        <Badge key={name} variant="outline" className="font-normal">
          {name}
        </Badge>
      ))}
    </div>
  );
}

function Details({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    <details className="rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        {title} ({count})
      </summary>
      <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto text-muted-foreground">{children}</ul>
      {count > 100 && <p className="mt-2 text-xs text-muted-foreground">Mostrando as 100 primeiras.</p>}
    </details>
  );
}
