"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import { createPresentation, deletePresentation, PresentationError, updatePresentation } from "@/lib/presentations/mutations";
import { presentationDataSchema } from "@/lib/presentations/validation";

type Result = { error?: string };

function parse(input: Record<string, string>) {
  const parsed = presentationDataSchema.safeParse(input);
  return parsed.success ? { data: parsed.data } : { error: parsed.error.issues[0].message };
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof PresentationError) return { error: error.message };
    throw error;
  }
  return {};
}

export async function createPresentationAction(expertId: string, input: Record<string, string>): Promise<Result> {
  const user = await getCurrentUser();
  if (!isUuid(expertId)) return { error: "Lead inválido." };
  const parsed = parse(input);
  if (!parsed.data) return { error: parsed.error };
  let presentationId = "";
  const result = await run(async () => {
    ({ id: presentationId } = await queryAsUser((tx) => createPresentation(tx, expertId, parsed.data, user.id)));
  });
  if (result.error) return result;
  redirect(`/apresentacoes/${presentationId}`);
}

export async function updatePresentationAction(presentationId: string, input: Record<string, string>): Promise<Result> {
  await getCurrentUser();
  if (!isUuid(presentationId)) return { error: "Apresentação inválida." };
  const parsed = parse(input);
  if (!parsed.data) return { error: parsed.error };
  const result = await run(() => queryAsUser((tx) => updatePresentation(tx, presentationId, parsed.data)));
  if (result.error) return result;
  redirect(`/apresentacoes/${presentationId}`);
}

// Usada pelo ConfirmDeleteButton. Apresentação já excluída só volta para a lista.
export async function deletePresentationAction(presentationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (isUuid(presentationId)) await run(() => queryAsUser((tx) => deletePresentation(tx, presentationId, user.id)));
  refresh();
  redirect("/apresentacoes");
}
