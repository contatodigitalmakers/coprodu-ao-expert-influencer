"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import {
  createApp,
  createCost,
  createSale,
  deleteApp,
  deleteCost,
  deleteSale,
  FinanceError,
  updateApp,
  updateCost,
  updateSale,
} from "@/lib/finance/mutations";
import { appSchema, costSchema, saleSchema, type AppInput, type CostInput, type SaleInput } from "@/lib/finance/validation";

type Result = { error?: string };

const RESTRICTED = "Acesso restrito ao Admin.";

async function adminId() {
  const user = await getCurrentUser();
  return user.role === "admin" ? user.id : null;
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof FinanceError) return { error: error.message };
    throw error;
  }
  return {};
}

// Volta para a página de onde o formulário foi aberto (só dentro do financeiro).
const back = (returnTo: string, fallback: string) =>
  /^\/financeiro(\/[\w\-/?=&%.]*)?$/.test(returnTo) ? returnTo : fallback;

// ---------- Apps ----------

export async function createAppAction(input: AppInput): Promise<Result> {
  if (!(await adminId())) return { error: RESTRICTED };
  const parsed = appSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let appId = "";
  const result = await run(async () => {
    appId = await queryAsUser((tx) => createApp(tx, parsed.data));
  });
  if (result.error) return result;
  redirect(`/financeiro/apps/${appId}`);
}

export async function updateAppAction(appId: string, input: AppInput): Promise<Result> {
  if (!(await adminId())) return { error: RESTRICTED };
  if (!isUuid(appId)) return { error: "App inválido." };
  const parsed = appSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await run(() => queryAsUser((tx) => updateApp(tx, appId, parsed.data)));
  if (result.error) return result;
  redirect(`/financeiro/apps/${appId}`);
}

// Usada pelo ConfirmDeleteButton (o botão só aparece para app sem lançamentos).
export async function deleteAppAction(appId: string): Promise<void> {
  if ((await adminId()) && isUuid(appId)) await run(() => queryAsUser((tx) => deleteApp(tx, appId)));
  refresh();
  redirect("/financeiro/apps");
}

// ---------- Vendas ----------

export async function createSaleAction(returnTo: string, input: SaleInput): Promise<Result> {
  const userId = await adminId();
  if (!userId) return { error: RESTRICTED };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await run(() => queryAsUser((tx) => createSale(tx, parsed.data, userId)));
  if (result.error) return result;
  redirect(back(returnTo, `/financeiro/vendas?mes=${parsed.data.month.slice(0, 7)}`));
}

export async function updateSaleAction(saleId: string, returnTo: string, input: SaleInput): Promise<Result> {
  if (!(await adminId())) return { error: RESTRICTED };
  if (!isUuid(saleId)) return { error: "Lançamento inválido." };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await run(() => queryAsUser((tx) => updateSale(tx, saleId, parsed.data)));
  if (result.error) return result;
  redirect(back(returnTo, `/financeiro/vendas?mes=${parsed.data.month.slice(0, 7)}`));
}

export async function deleteSaleAction(saleId: string): Promise<void> {
  if ((await adminId()) && isUuid(saleId)) await queryAsUser((tx) => deleteSale(tx, saleId));
  refresh();
  redirect("/financeiro/vendas");
}

// ---------- Custos ----------

export async function createCostAction(returnTo: string, input: CostInput): Promise<Result> {
  const userId = await adminId();
  if (!userId) return { error: RESTRICTED };
  const parsed = costSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await run(() => queryAsUser((tx) => createCost(tx, parsed.data, userId)));
  if (result.error) return result;
  redirect(back(returnTo, `/financeiro/custos?mes=${parsed.data.spentOn.slice(0, 7)}`));
}

export async function updateCostAction(costId: string, returnTo: string, input: CostInput): Promise<Result> {
  if (!(await adminId())) return { error: RESTRICTED };
  if (!isUuid(costId)) return { error: "Lançamento inválido." };
  const parsed = costSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await run(() => queryAsUser((tx) => updateCost(tx, costId, parsed.data)));
  if (result.error) return result;
  redirect(back(returnTo, `/financeiro/custos?mes=${parsed.data.spentOn.slice(0, 7)}`));
}

export async function deleteCostAction(costId: string): Promise<void> {
  if ((await adminId()) && isUuid(costId)) await queryAsUser((tx) => deleteCost(tx, costId));
  refresh();
  redirect("/financeiro/custos");
}
