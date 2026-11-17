import { and, count, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { apps, appSales, costs, experts } from "@/db/schema";
import { monthLongLabel } from "./calc";
import type { AppData, CostData, SaleData } from "./validation";

// Gravações da Central Financeira. Recebem a transação (queryAsUser) e lançam
// FinanceError com a mensagem para a tela.

export class FinanceError extends Error {}

async function activeApp(tx: Tx, appId: string) {
  const [app] = await tx.select().from(apps).where(and(eq(apps.id, appId), isNull(apps.deletedAt)));
  if (!app) throw new FinanceError("App não encontrado.");
  return app;
}

async function checkExpert(tx: Tx, expertId: string | null) {
  if (!expertId) return;
  const [expert] = await tx.select({ id: experts.id }).from(experts).where(and(eq(experts.id, expertId), isNull(experts.deletedAt)));
  if (!expert) throw new FinanceError("Lead do CRM não encontrado.");
}

// Grava dentro de um savepoint, para traduzir o erro de duplicidade sem
// estragar a transação de quem chamou.
async function guarded<T>(tx: Tx, constraint: string, message: () => string, fn: (tx: Tx) => Promise<T>) {
  try {
    return await tx.transaction(fn);
  } catch (error) {
    if (isUniqueViolation(error, constraint)) throw new FinanceError(message());
    throw error;
  }
}

// ---------- Apps ----------

const DUPLICATE_APP = () => "Já existe um app com esse nome.";

export async function createApp(tx: Tx, data: AppData) {
  await checkExpert(tx, data.expertId);
  const [row] = await guarded(tx, "apps_name_unique", DUPLICATE_APP, (sp) =>
    sp.insert(apps).values(data).returning({ id: apps.id }),
  );
  return row.id;
}

// Mudar o % do app vale para os próximos lançamentos; os antigos ficam como foram lançados.
export async function updateApp(tx: Tx, appId: string, data: AppData) {
  await activeApp(tx, appId);
  await checkExpert(tx, data.expertId);
  await guarded(tx, "apps_name_unique", DUPLICATE_APP, (sp) =>
    sp.update(apps).set(data).where(eq(apps.id, appId)),
  );
}

// Só sai o app sem lançamentos; com histórico, o caminho é o status Encerrado.
export async function deleteApp(tx: Tx, appId: string) {
  await activeApp(tx, appId);
  const [[sales], [appCosts]] = await Promise.all([
    tx.select({ n: count() }).from(appSales).where(and(eq(appSales.appId, appId), isNull(appSales.deletedAt))),
    tx.select({ n: count() }).from(costs).where(and(eq(costs.appId, appId), isNull(costs.deletedAt))),
  ]);
  if (sales.n + appCosts.n > 0) {
    throw new FinanceError("Este app tem lançamentos de vendas ou custos. Para tirá-lo dos resumos, mude o status para Encerrado.");
  }
  await tx.update(apps).set({ deletedAt: new Date() }).where(eq(apps.id, appId));
}

// ---------- Vendas do mês ----------

function duplicateSale(appName: string, month: string) {
  return () => `Já existe o lançamento de ${appName} em ${monthLongLabel(month)}. Edite o existente.`;
}

export async function createSale(tx: Tx, data: SaleData, userId: string) {
  const app = await activeApp(tx, data.appId);
  const [row] = await guarded(tx, "app_sales_app_month_unique", duplicateSale(app.name, data.month), (sp) =>
    sp.insert(appSales).values({ ...data, userId }).returning({ id: appSales.id }),
  );
  return row.id;
}

export async function updateSale(tx: Tx, saleId: string, data: SaleData) {
  const app = await activeApp(tx, data.appId);
  const updated = await guarded(tx, "app_sales_app_month_unique", duplicateSale(app.name, data.month), (sp) =>
    sp
      .update(appSales)
      .set(data)
      .where(and(eq(appSales.id, saleId), isNull(appSales.deletedAt)))
      .returning({ id: appSales.id }),
  );
  if (!updated.length) throw new FinanceError("Lançamento não encontrado.");
}

export async function deleteSale(tx: Tx, saleId: string) {
  await tx.update(appSales).set({ deletedAt: new Date() }).where(and(eq(appSales.id, saleId), isNull(appSales.deletedAt)));
}

// ---------- Custos ----------

export async function createCost(tx: Tx, data: CostData, userId: string) {
  if (data.appId) await activeApp(tx, data.appId);
  const [row] = await tx.insert(costs).values({ ...data, userId }).returning({ id: costs.id });
  return row.id;
}

export async function updateCost(tx: Tx, costId: string, data: CostData) {
  if (data.appId) await activeApp(tx, data.appId);
  const updated = await tx
    .update(costs)
    .set(data)
    .where(and(eq(costs.id, costId), isNull(costs.deletedAt)))
    .returning({ id: costs.id });
  if (!updated.length) throw new FinanceError("Lançamento não encontrado.");
}

export async function deleteCost(tx: Tx, costId: string) {
  await tx.update(costs).set({ deletedAt: new Date() }).where(and(eq(costs.id, costId), isNull(costs.deletedAt)));
}
