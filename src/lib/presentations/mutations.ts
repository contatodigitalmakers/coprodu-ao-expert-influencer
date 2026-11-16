import { and, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { activities, experts, presentations } from "@/db/schema";

export class PresentationError extends Error {}

// Sem 0/o, 1/i/l: o código é fácil de ler e de digitar. Com 8 caracteres são
// ~850 bilhões de combinações, então não dá para adivinhar o link de outra pessoa.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

export function newPresentationCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

async function log(tx: Tx, expertId: string, userId: string | null, description: string, presentationId: string) {
  await tx.insert(activities).values({ expertId, userId, type: "note", description, metadata: { presentationId } });
}

// Cria a apresentação com um código novo. Se o código já existir, tenta outro.
export async function createPresentation(tx: Tx, expertId: string, data: Record<string, string>, userId: string) {
  const [expert] = await tx
    .select({ id: experts.id })
    .from(experts)
    .where(and(eq(experts.id, expertId), isNull(experts.deletedAt)));
  if (!expert) throw new PresentationError("Lead não encontrado.");

  for (let attempt = 0; ; attempt++) {
    const code = newPresentationCode();
    try {
      // O savepoint deixa tentar de novo sem perder a transação.
      const [created] = await tx.transaction((sp) =>
        sp.insert(presentations).values({ expertId, userId, code, data }).returning({ id: presentations.id }),
      );
      await log(tx, expertId, userId, `Apresentação criada (link /a/${code}).`, created.id);
      return { id: created.id, code };
    } catch (error) {
      if (attempt < 4 && isUniqueViolation(error, "presentations_code_unique")) continue;
      throw error;
    }
  }
}

// Editar mantém o mesmo código: o link já enviado continua valendo.
export async function updatePresentation(tx: Tx, presentationId: string, data: Record<string, string>) {
  const [updated] = await tx
    .update(presentations)
    .set({ data })
    .where(and(eq(presentations.id, presentationId), isNull(presentations.deletedAt)))
    .returning({ id: presentations.id });
  if (!updated) throw new PresentationError("Apresentação não encontrada.");
}

// Exclusão lógica: o link deixa de abrir.
export async function deletePresentation(tx: Tx, presentationId: string, userId: string) {
  const [deleted] = await tx
    .update(presentations)
    .set({ deletedAt: new Date() })
    .where(and(eq(presentations.id, presentationId), isNull(presentations.deletedAt)))
    .returning({ id: presentations.id, expertId: presentations.expertId, code: presentations.code });
  if (!deleted) throw new PresentationError("Apresentação não encontrada.");
  await log(tx, deleted.expertId, userId, `Apresentação excluída (o link /a/${deleted.code} não abre mais).`, deleted.id);
  return deleted.expertId;
}
