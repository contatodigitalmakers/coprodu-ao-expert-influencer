"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { templates } from "@/db/schema";
import { channel, templateStage } from "@/db/schema/enums";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import { firstFieldErrors } from "@/lib/experts/validation";
import { unknownVariables } from "@/lib/templates/render";

export type TemplateFormState = {
  fieldErrors?: Record<string, string>;
};

const templateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo."),
  channel: z.enum(channel.enumValues, "Escolha o canal."),
  stage: z.enum(templateStage.enumValues, "Escolha a categoria."),
  body: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem.")
    .max(5000, "Mensagem muito longa.")
    .refine((body) => unknownVariables(body).length === 0, {
      error: (issue) => `Variável desconhecida: ${unknownVariables(String(issue.input)).join(", ")}.`,
    }),
});

// Cadastro (templateId = null) ou edição de template.
export async function saveTemplate(
  templateId: string | null,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  await getCurrentUser();
  const parsed = templateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    channel: String(formData.get("channel") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };

  await queryAsUser(async (tx) => {
    if (templateId) {
      await tx
        .update(templates)
        .set(parsed.data)
        .where(and(eq(templates.id, templateId), isNull(templates.deletedAt)));
    } else {
      await tx.insert(templates).values(parsed.data);
    }
  });
  redirect("/templates");
}

// Exclusão lógica (o template pode estar ligado a passos de cadência).
export async function deleteTemplate(templateId: string) {
  await getCurrentUser();
  if (!isUuid(templateId)) throw new Error("Template inválido.");
  await queryAsUser((tx) =>
    tx.update(templates).set({ deletedAt: new Date() }).where(eq(templates.id, templateId)),
  );
  redirect("/templates");
}
