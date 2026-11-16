"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, MessageCircleIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

const noop = () => () => {};

// Endereço completo do link curto (o domínio só é conhecido no navegador).
function useShortUrl(code: string) {
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  return `${origin}/a/${code}`;
}

export function CopyLinkButton({ code, size = "default" }: { code: string; size?: "default" | "sm" }) {
  const url = useShortUrl(code);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={copy} aria-label={`Copiar link /a/${code}`}>
      {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Link copiado!" : "Copiar link"}
    </Button>
  );
}

// Link curto em destaque, com copiar, abrir e enviar no WhatsApp do lead.
export function PresentationLink({ code, whatsapp }: { code: string; whatsapp: string | null }) {
  const url = useShortUrl(code);
  const digits = whatsapp?.replace(/\D/g, "") ?? "";
  const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm" data-testid="short-link">
        {url}
      </p>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton code={code} />
        <a href={`/a/${code}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost" })}>
          <ExternalLinkIcon /> Abrir apresentação
        </a>
        <a href={waUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost" })}>
          <MessageCircleIcon /> {digits ? "Enviar no WhatsApp do lead" : "Enviar no WhatsApp"}
        </a>
      </div>
    </div>
  );
}
