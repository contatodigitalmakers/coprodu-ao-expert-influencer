"use client";

import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plural } from "@/lib/format";
import { createFromLink } from "../actions";

// Cadastro pelo link do perfil: a IA preenche o resto depois (/analisar).
export function LinkForm({ pendingCount, pendingHref }: { pendingCount: number; pendingHref: string | null }) {
  const [state, formAction, isPending] = useActionState(createFromLink, {});

  // Envia sem limpar o campo (assim o link não se perde se houver erro).
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Cadastrar pelo link</CardTitle>
        <CardDescription>
          Cole o link do perfil no Instagram, TikTok ou YouTube. O lead é criado na hora e a IA preenche nome,
          nicho, seguidores, qualificação, resumo, ideia do app e as 3 mensagens de prospecção quando você rodar <code>/analisar</code> no
          Claude Code.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row" noValidate>
          <Label htmlFor="profileUrl" className="sr-only">
            Link do perfil
          </Label>
          <Input
            id="profileUrl"
            name="profileUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/usuario/"
            aria-invalid={!!state.error || undefined}
            aria-describedby={state.error ? "profileUrl-error" : undefined}
            className="sm:flex-1"
          />
          <Button type="submit" disabled={isPending}>
            <SparklesIcon />
            {isPending ? "Cadastrando..." : "Cadastrar e analisar"}
          </Button>
        </form>
        {state.error && (
          <p id="profileUrl-error" className="text-sm text-destructive">
            {state.error}{" "}
            {state.existingId && (
              <Link href={`/experts/${state.existingId}`} className="font-medium underline underline-offset-4">
                Abrir o lead
              </Link>
            )}
          </p>
        )}
        {pendingCount > 0 && pendingHref && (
          <p className="text-sm text-muted-foreground">
            <Link href={pendingHref} className="font-medium text-foreground underline-offset-4 hover:underline">
              {plural(pendingCount, "perfil aguardando", "perfis aguardando")} análise
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
