"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { channel } from "@/db/schema/enums";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { CadenceError, saveCadence } from "@/lib/cadences/mutations";

const cadenceSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da cadência.").max(120, "Nome muito longo."),
  active: z.boolean(),
  steps: z
    .array(
      z.object({
        id: z.uuid().nullable(),
        dayOffset: z.coerce
          .number("Dia inválido.")
          .int("O dia deve ser um número inteiro.")
          .min(0, "O dia começa em 0 (D0).")
          .max(365, "Dia máximo é 365."),
        channel: z.enum(channel.enumValues, "Escolha o canal de cada passo."),
        templateId: z.uuid().nullable(),
      }),
    )
    .min(1, "A cadência precisa de pelo menos um passo.")
    .max(30, "No máximo 30 passos."),
});

export type CadenceInput = z.input<typeof cadenceSchema>;

export async function saveCadenceAction(cadenceId: string | null, input: CadenceInput) {
  await getCurrentUser();
  const parsed = cadenceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await queryAsUser((tx) => saveCadence(tx, cadenceId, parsed.data));
  } catch (error) {
    if (error instanceof CadenceError) return { error: error.message };
    throw error;
  }
  redirect("/cadencias");
}
