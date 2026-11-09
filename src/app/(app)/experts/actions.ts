"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isUniqueViolation } from "@/db/errors";
import { activities, experts } from "@/db/schema";
import { platform } from "@/db/schema/enums";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { closeActiveEnrollment } from "@/lib/cadences/enrollment-status";
import { CadenceError, enrollExpert } from "@/lib/cadences/mutations";
import { getInitialStage, replaceExpertTags } from "@/lib/experts/mutations";
import { isUuid, normalizeHandle } from "@/lib/experts/normalize";
import { findDuplicate } from "@/lib/experts/queries";
import { expertFormSchema, firstFieldErrors } from "@/lib/experts/validation";
import { MANUAL_ACTIVITY_TYPES } from "@/lib/labels";
import { MoveError } from "@/lib/pipeline/move";
import { AnalysisError, createForAnalysis } from "@/lib/research/analysis";
import { computeScore } from "@/lib/score";
import { getScoreWeights } from "@/lib/settings";

export type ExpertFormState = {
  fieldErrors?: Record<string, string>;
};

const FORM_FIELDS = Object.keys(expertFormSchema.shape).filter((key) => key !== "tags");

// Cadastro (expertId = null) ou edição de expert.
export async function saveExpert(
  expertId: string | null,
  _prev: ExpertFormState,
  formData: FormData,
): Promise<ExpertFormState> {
  const user = await getCurrentUser();

  const values = Object.fromEntries(FORM_FIELDS.map((key) => [key, String(formData.get(key) ?? "")]));
  const parsed = expertFormSchema.safeParse({ ...values, tags: formData.getAll("tags").map(String) });
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  const { tags: tagNames, ...data } = parsed.data;

  let savedId: string;
  try {
    savedId = await queryAsUser(async (tx) => {
      // Score calculado a cada gravação (seção 3.2).
      const values = { ...data, ...computeScore(data, await getScoreWeights(tx)) };

      if (expertId) {
        // A etapa não muda aqui: mudanças de etapa ficam no Pipeline.
        const [updated] = await tx
          .update(experts)
          .set(values)
          .where(and(eq(experts.id, expertId), isNull(experts.deletedAt)))
          .returning({ id: experts.id });
        if (!updated) throw new Error("Expert não encontrado.");
        await replaceExpertTags(tx, updated.id, tagNames);
        return updated.id;
      }

      const stage = await getInitialStage(tx);
      const [created] = await tx
        .insert(experts)
        .values({ ...values, stageId: stage.id })
        .returning({ id: experts.id });
      await replaceExpertTags(tx, created.id, tagNames);
      await tx.insert(activities).values({
        expertId: created.id,
        userId: user.id,
        type: "stage_change",
        description: `Lead cadastrado na etapa "${stage.name}".`,
        metadata: { fromStageId: null, toStageId: stage.id },
      });
      return created.id;
    });
  } catch (error) {
    if (isUniqueViolation(error, "experts_platform_handle_unique")) {
      return { fieldErrors: { handle: "Já existe um lead com esse @ nesta plataforma." } };
    }
    throw error;
  }

  redirect(`/experts/${savedId}`);
}

export type LinkFormState = {
  error?: string;
  existingId?: string;
};

// Cadastro pelo link: cria o lead só com o @ e a plataforma e o põe na fila de
// análise da IA (o /analisar do Claude Code preenche o resto).
export async function createFromLink(_prev: LinkFormState, formData: FormData): Promise<LinkFormState> {
  const user = await getCurrentUser();
  const url = String(formData.get("profileUrl") ?? "").slice(0, 500);

  let createdId: string;
  try {
    createdId = await queryAsUser((tx) => createForAnalysis(tx, url, user.id));
  } catch (error) {
    if (error instanceof AnalysisError) return { error: error.message, existingId: error.existingId };
    if (isUniqueViolation(error, "experts_platform_handle_unique")) {
      return { error: "Esse perfil já está no sistema." };
    }
    throw error;
  }
  redirect(`/experts/${createdId}`);
}

// Exclusão lógica (soft delete), restrita ao Admin (regra 9).
export async function deleteExpert(expertId: string) {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Só o Admin pode excluir leads.");
  if (!isUuid(expertId)) throw new Error("Expert inválido.");

  await queryAsUser((tx) =>
    tx
      .update(experts)
      .set({ deletedAt: new Date() })
      .where(and(eq(experts.id, expertId), isNull(experts.deletedAt))),
  );
  redirect("/experts");
}

export type ActivityFormState = {
  error?: string;
  savedAt?: number;
};

const activitySchema = z.object({
  type: z.enum(MANUAL_ACTIVITY_TYPES, "Escolha o tipo de interação."),
  description: z.string().trim().min(1, "Descreva o que aconteceu.").max(5000, "Texto muito longo."),
});

// Registro manual na linha do tempo (nota, ligação, DM etc.).
export async function addActivity(
  expertId: string,
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const user = await getCurrentUser();
  if (!isUuid(expertId)) return { error: "Expert inválido." };

  const parsed = activitySchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await queryAsUser((tx) =>
    tx.insert(activities).values({ expertId, userId: user.id, ...parsed.data }),
  );
  refresh();
  return { savedAt: Date.now() };
}

// Aviso de duplicidade enquanto o usuário preenche o formulário.
export async function checkDuplicate(handle: string, platformValue: string, excludeId: string | null) {
  const parsedPlatform = z.enum(platform.enumValues).safeParse(platformValue);
  if (!parsedPlatform.success) return null;
  return findDuplicate(
    normalizeHandle(String(handle)),
    parsedPlatform.data,
    isUuid(excludeId) ? excludeId : null,
  );
}

// Inscreve o lead numa cadência (gera as tarefas).
export async function enrollInCadence(expertId: string, cadenceId: string | null): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!isUuid(expertId) || !isUuid(cadenceId)) return { error: "Escolha a cadência." };
  try {
    await queryAsUser((tx) => enrollExpert(tx, expertId, cadenceId, user.id));
  } catch (error) {
    if (error instanceof CadenceError || error instanceof MoveError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

// Encerra a cadência ativa do lead (as tarefas pendentes são puladas).
export async function endCadence(expertId: string) {
  const user = await getCurrentUser();
  if (!isUuid(expertId)) throw new Error("Expert inválido.");
  await queryAsUser(async (tx) => {
    if (await closeActiveEnrollment(tx, expertId, "finished")) {
      await tx.insert(activities).values({ expertId, userId: user.id, type: "note", description: "Cadência encerrada manualmente." });
    }
  });
  refresh();
}
