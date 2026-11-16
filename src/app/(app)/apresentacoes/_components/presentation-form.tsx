"use client";

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { encodeDeckData, readDeckLink } from "@/lib/presentations/encode";
import {
  CONFIG_DEFAULTS,
  DECK_FIELDS,
  FIELD_KEYS,
  fieldError,
  GROUP_NOTES,
  OPEN_GROUPS,
  parseDeckNumber,
  parseHiddenSlides,
  SLIDES,
  WIDE_FIELDS,
  type DeckField,
} from "@/lib/presentations/fields";
import { cn } from "@/lib/utils";

type Values = Record<string, string>;

const GROUPS = [...new Set(DECK_FIELDS.map((field) => field.group))];
const pad = (n: number) => String(n).padStart(2, "0");

function onlyFields(data: Values) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => FIELD_KEYS.has(key)));
}

// Gerador da apresentação: formulário por grupos, slides visíveis e prévia ao vivo.
// O mesmo do antigo gerar.html, agora salvando no CRM.
export function PresentationForm({
  expertName,
  initial,
  action,
  cancelHref,
  submitLabel,
}: {
  expertName: string;
  initial: Values;
  action: (input: Values) => Promise<{ error?: string }>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [values, setValues] = useState<Values>(() => onlyFields(initial));
  const [hidden, setHidden] = useState<Set<number>>(() => new Set(parseHiddenSlides(initial.ocultar)));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const payload = useMemo(() => {
    const out: Values = {};
    for (const [key, value] of Object.entries(values)) if (value.trim()) out[key] = value.trim();
    if (hidden.size) out.ocultar = [...hidden].sort((a, b) => a - b).join(",");
    return out;
  }, [values, hidden]);
  const errors = useMemo(
    () => Object.fromEntries(DECK_FIELDS.map((field) => [field.key, fieldError(field, payload[field.key] ?? "")])),
    [payload],
  );

  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const toggleSlide = (slide: number, visible: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (visible) next.delete(slide);
      else next.add(slide);
      return next;
    });

  function importLink() {
    const data = readDeckLink(importUrl);
    if (!data || !Object.keys(data).length) {
      setNotice("Esse link não tem dados de apresentação.");
      return;
    }
    setValues(onlyFields(data));
    setHidden(new Set(parseHiddenSlides(data.ocultar)));
    setImportUrl("");
    setNotice("Link carregado. Confira os campos e salve.");
  }

  function save() {
    setError(null);
    const firstError = DECK_FIELDS.find((field) => errors[field.key]);
    if (firstError) {
      setError(`Corrija o campo "${firstError.label}".`);
      return;
    }
    startTransition(async () => {
      const result = await action(payload);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="flex flex-col gap-2 rounded-lg border p-4" aria-label="Carregar de um link antigo">
          <Label htmlFor="import-url">Carregar de um link antigo</Label>
          <div className="flex gap-2">
            <Input
              id="import-url"
              type="url"
              placeholder="Cole aqui um link gerado no site antigo (…?d=…)"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={importLink} disabled={!importUrl.trim()}>
              Carregar
            </Button>
          </div>
          {notice && (
            <p role="status" className="text-xs text-muted-foreground">
              {notice}
            </p>
          )}
        </section>

        {GROUPS.map((group) => (
          <FieldGroup
            key={group}
            group={group}
            fields={DECK_FIELDS.filter((field) => field.group === group)}
            values={values}
            errors={errors}
            onChange={set}
          />
        ))}

        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <h2 className="font-heading font-semibold">Slides visíveis</h2>
            <span className="text-xs text-muted-foreground">{hidden.size ? `${hidden.size} oculto(s)` : ""}</span>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-4 pb-3 text-sm text-muted-foreground">
            Desmarque para ocultar do cliente. Os slides 3, 11, 12 e 13 também somem sozinhos quando faltam os dados deles.
          </p>
          <div className="grid gap-x-4 gap-y-1 px-4 pb-4 sm:grid-cols-2">
            {SLIDES.map(([slide, name]) => (
              <label key={slide} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={!hidden.has(slide)}
                  onChange={(event) => toggleSlide(slide, event.target.checked)}
                />
                <span className="w-6 font-mono text-xs text-muted-foreground">{pad(slide)}</span>
                {name}
              </label>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
          <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
            Cancelar
          </Link>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      <Preview expertName={expertName} payload={payload} />
    </div>
  );
}

function FieldGroup({
  group,
  fields,
  values,
  errors,
  onChange,
}: {
  group: string;
  fields: DeckField[];
  values: Values;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const filled = fields.filter((field) => values[field.key]?.trim()).length;
  return (
    <details className="group rounded-lg border" open={OPEN_GROUPS.has(group)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="flex-1 font-heading font-semibold">{group}</h2>
        <span className="font-mono text-xs text-muted-foreground">{filled ? `${filled} / ${fields.length}` : ""}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      {GROUP_NOTES[group] && <p className="-mt-1 px-4 pb-3 text-sm text-muted-foreground">{GROUP_NOTES[group]}</p>}
      <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            error={errors[field.key]}
            values={values}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
    </details>
  );
}

// "4000" → "R$ 4.000,00" para o texto do plano em destaque.
function money(value: string | undefined) {
  const number = parseDeckNumber(value ?? "");
  return Number.isFinite(number) ? formatCurrency(number) : "—";
}

function FieldInput({
  field,
  value,
  error,
  values,
  onChange,
}: {
  field: DeckField;
  value: string;
  error: string;
  values: Values;
  onChange: (value: string) => void;
}) {
  const id = `f-${field.key}`;
  const placeholder = CONFIG_DEFAULTS[field.key]
    ? `Padrão: ${CONFIG_DEFAULTS[field.key]}`
    : field.example
      ? `Ex.: ${field.example}`
      : "";
  const common = { id, value, placeholder, "aria-invalid": error ? true : undefined, onChange: (event: { target: { value: string } }) => onChange(event.target.value) };
  const numeric = field.type === "num" || field.type === "money" || field.type === "pct";

  let control;
  if (field.type === "textarea") {
    control = <Textarea {...common} rows={2} />;
  } else if (field.type === "select") {
    const options = [
      { value: "0", label: "Nenhum" },
      ...[1, 2, 3].map((n) => ({
        value: String(n),
        label: `Plano ${n}: ${values[`plano${n}_voce`] || "—"}% + caução de ${money(values[`plano${n}_caucao`])}`,
      })),
    ];
    control = (
      <SimpleSelect
        id={id}
        options={options}
        emptyLabel="Padrão (plano 1)"
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
      />
    );
  } else if (field.type === "color") {
    control = (
      <div className="flex gap-2">
        <Input {...common} spellCheck={false} />
        <input
          type="color"
          aria-label="Escolher cor"
          className="h-8 w-11 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#2bff88"}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  } else {
    const type = field.type === "date" ? "date" : field.type === "url" ? "url" : field.type === "tel" ? "tel" : "text";
    control = (
      <Input {...common} type={type} spellCheck={false} inputMode={numeric ? "decimal" : field.type === "tel" ? "tel" : undefined} />
    );
  }

  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", WIDE_FIELDS.has(field.key) && "sm:col-span-2")}>
      <Label htmlFor={id} className="flex flex-wrap items-baseline gap-x-1.5">
        {field.label}
        <span className="text-xs font-normal text-muted-foreground">
          {field.slides === "todos" ? "· todos os slides" : `· slide ${field.slides}`}
        </span>
      </Label>
      {control}
      {field.help && !error && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Prévia ao vivo: a apresentação de verdade num iframe, recarregada meio
// segundo depois da última mudança, no mesmo slide em que estava.
function Preview({ expertName, payload }: { expertName: string; payload: Values }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const slide = useRef(1);
  const lastBase = useRef("");
  const [draft, setDraft] = useState(false);
  const [src, setSrc] = useState("");
  const [count, setCount] = useState("01 / --");

  useEffect(() => {
    const base = `/apresentacoes/previa?d=${encodeDeckData(payload)}&modo=previa${draft ? "&rascunho=1" : ""}`;
    if (base === lastBase.current) return;
    const timer = setTimeout(() => {
      lastBase.current = base;
      setSrc(`${base}#/${pad(slide.current)}`);
    }, lastBase.current ? 450 : 0);
    return () => clearTimeout(timer);
  }, [payload, draft]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.dm !== "pos") return;
      slide.current = event.data.slide;
      setCount(`${pad(event.data.i + 1)} / ${pad(event.data.total)}`);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const go = (to: "prev" | "next") => frame.current?.contentWindow?.postMessage({ dm: "go", to }, window.location.origin);

  return (
    <section
      aria-label="Prévia"
      className="order-first flex min-w-0 flex-col gap-3 rounded-lg border p-4 lg:sticky lg:top-6 lg:order-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading font-semibold">Prévia · {expertName}</h2>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="size-4 accent-primary" checked={draft} onChange={(event) => setDraft(event.target.checked)} />
            Mostrar campos vazios
          </label>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Slide anterior" onClick={() => go("prev")}>
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-16 text-center font-mono text-xs text-muted-foreground" data-testid="preview-count">
            {count}
          </span>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Próximo slide" onClick={() => go("next")}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-md border bg-[#050706]">
        {src && <iframe ref={frame} src={src} title="Prévia da apresentação" className="absolute inset-0 size-full border-0" />}
      </div>
    </section>
  );
}
