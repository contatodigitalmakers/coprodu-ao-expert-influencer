"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { taskOutcome } from "@/db/schema/enums";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { CadenceError, completeTask, skipTask } from "@/lib/cadences/mutations";
import { getInitialStage } from "@/lib/experts/mutations";
import { isUuid } from "@/lib/experts/normalize";
import { MoveError, moveExpert } from "@/lib/pipeline/move";

// Ações da fila do dia: registrar resultado, pular tarefa, reativar lead.

type Result = { error?: string };

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof CadenceError || error instanceof MoveError) return { error: error.message };
    throw error;
  }
  refresh();
  return {};
}

export async function registerTaskOutcome(taskId: string, outcome: string): Promise<Result> {
  const user = await getCurrentUser();
  const parsed = z.enum(taskOutcome.enumValues).safeParse(outcome);
  if (!isUuid(taskId) || !parsed.success) return { error: "Resultado inválido." };
  return run(() => queryAsUser((tx) => completeTask(tx, taskId, parsed.data, user.id)));
}

export async function skipQueueTask(taskId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!isUuid(taskId)) return { error: "Tarefa inválida." };
  return run(() => queryAsUser((tx) => skipTask(tx, taskId, user.id)));
}

// Reativa um lead da fila de reativação: volta para "Novo lead".
export async function reactivateExpert(expertId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!isUuid(expertId)) return { error: "Lead inválido." };
  return run(() =>
    queryAsUser(async (tx) => {
      const stage = await getInitialStage(tx);
      await moveExpert(tx, { expertId, toStageId: stage.id }, user.id);
    }),
  );
}
