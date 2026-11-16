import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Roda em todas as rotas, exceto arquivos estáticos, imagens e os arquivos da
  // apresentação (public/apresentacao), que o link curto abre sem login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apresentacao/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
