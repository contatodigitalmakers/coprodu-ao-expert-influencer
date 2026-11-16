import type { NextRequest } from "next/server";
import { renderDeckHtml } from "@/lib/presentations/deck-html";

// Prévia do gerador: a apresentação sem dados salvos, que lê os campos da URL
// (?d=...&modo=previa). Só abre com login (proxy) e só dentro do próprio CRM
// (cabeçalhos em next.config.ts).
export async function GET(request: NextRequest) {
  return new Response(renderDeckHtml({ data: null, origin: request.nextUrl.origin }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
