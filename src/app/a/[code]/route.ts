import type { NextRequest } from "next/server";
import { renderDeckHtml, renderDeckNotFound } from "@/lib/presentations/deck-html";
import { getPublicPresentation } from "@/lib/presentations/queries";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

// Link curto da apresentação (/a/<código>), aberto sem login.
// Conta a abertura, menos na janela do apresentador (?modo=apresentador).
export async function GET(request: NextRequest, ctx: RouteContext<"/a/[code]">) {
  const { code } = await ctx.params;
  const mode = request.nextUrl.searchParams.get("modo");
  const data = await getPublicPresentation(code, mode !== "apresentador" && mode !== "previa");
  if (!data) return new Response(renderDeckNotFound(), { status: 404, headers: HEADERS });
  return new Response(renderDeckHtml({ data, origin: request.nextUrl.origin }), { headers: HEADERS });
}
