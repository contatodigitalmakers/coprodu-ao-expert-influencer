"use server";

import { refresh } from "next/cache";
import { respondToProposal } from "@/lib/proposals/queries";

// Resposta do expert na página pública (sem login).
export async function respondAction(token: string, accept: boolean) {
  const result = await respondToProposal(token, accept);
  refresh();
  return result === "unavailable" ? { error: "Esta proposta não está mais disponível para resposta." } : {};
}
