import { and, eq } from "drizzle-orm";
import type { Tx } from "@/db";
import { cadenceEnrollments, tasks } from "@/db/schema";

// Pausa ("paused": o lead respondeu) ou encerra ("finished") a cadência ativa
// do lead. As tarefas pendentes dela são puladas e saem da fila do dia.
export async function closeActiveEnrollment(tx: Tx, expertId: string, status: "paused" | "finished") {
  const closed = await tx
    .update(cadenceEnrollments)
    .set({ status })
    .where(and(eq(cadenceEnrollments.expertId, expertId), eq(cadenceEnrollments.status, "active")))
    .returning({ id: cadenceEnrollments.id });
  for (const enrollment of closed) {
    await tx
      .update(tasks)
      .set({ status: "skipped" })
      .where(and(eq(tasks.enrollmentId, enrollment.id), eq(tasks.status, "pending")));
  }
  return closed.length > 0;
}
