import { and, asc, count, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { cadenceEnrollments, cadenceSteps, cadences, tasks, templates } from "@/db/schema";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";

// Cadências com os passos (D0, D1...) e quantos leads estão nelas agora.
export async function listCadences() {
  return queryAsUser(async (tx) => {
    const [rows, steps, enrolled] = await Promise.all([
      tx.select().from(cadences).orderBy(asc(cadences.name)),
      tx
        .select({ cadenceId: cadenceSteps.cadenceId, dayOffset: cadenceSteps.dayOffset })
        .from(cadenceSteps)
        .orderBy(asc(cadenceSteps.order)),
      tx
        .select({ cadenceId: cadenceEnrollments.cadenceId, total: count() })
        .from(cadenceEnrollments)
        .where(eq(cadenceEnrollments.status, "active"))
        .groupBy(cadenceEnrollments.cadenceId),
    ]);
    return rows.map((cadence) => ({
      ...cadence,
      days: steps.filter((step) => step.cadenceId === cadence.id).map((step) => step.dayOffset),
      activeEnrollments: enrolled.find((row) => row.cadenceId === cadence.id)?.total ?? 0,
    }));
  });
}

export async function getCadence(id: string) {
  if (!isUuid(id)) return null;
  return queryAsUser(async (tx) => {
    const [cadence] = await tx.select().from(cadences).where(eq(cadences.id, id));
    if (!cadence) return null;
    const steps = await tx.select().from(cadenceSteps).where(eq(cadenceSteps.cadenceId, id)).orderBy(asc(cadenceSteps.order));
    return { ...cadence, steps };
  });
}

export const getActiveCadenceOptions = cache(async () =>
  queryAsUser((tx) =>
    tx
      .select({ id: cadences.id, name: cadences.name })
      .from(cadences)
      .where(eq(cadences.active, true))
      .orderBy(asc(cadences.name)),
  ),
);

// Última inscrição do lead em cadência, com as tarefas (para a ficha).
export async function getExpertCadence(expertId: string) {
  if (!isUuid(expertId)) return null;
  return queryAsUser(async (tx) => {
    const [enrollment] = await tx
      .select({
        id: cadenceEnrollments.id,
        status: cadenceEnrollments.status,
        startedAt: cadenceEnrollments.startedAt,
        cadenceName: cadences.name,
      })
      .from(cadenceEnrollments)
      .innerJoin(cadences, eq(cadences.id, cadenceEnrollments.cadenceId))
      .where(eq(cadenceEnrollments.expertId, expertId))
      .orderBy(desc(cadenceEnrollments.startedAt))
      .limit(1);
    if (!enrollment) return null;

    const enrollmentTasks = await tx
      .select({
        id: tasks.id,
        dueDate: tasks.dueDate,
        channel: tasks.channel,
        status: tasks.status,
        outcome: tasks.outcome,
        dayOffset: cadenceSteps.dayOffset,
        templateName: templates.name,
      })
      .from(tasks)
      .leftJoin(cadenceSteps, eq(cadenceSteps.id, tasks.stepId))
      .leftJoin(templates, eq(templates.id, cadenceSteps.templateId))
      .where(and(eq(tasks.enrollmentId, enrollment.id)))
      .orderBy(asc(tasks.dueDate), asc(cadenceSteps.order));
    return { ...enrollment, tasks: enrollmentTasks };
  });
}

export type ExpertCadence = NonNullable<Awaited<ReturnType<typeof getExpertCadence>>>;
