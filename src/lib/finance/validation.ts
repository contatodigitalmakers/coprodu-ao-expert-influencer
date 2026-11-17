import { z } from "zod";
import { appStatus, costCategory } from "@/db/schema/enums";
import { normalizeHandle } from "@/lib/experts/normalize";
import { parseMoney } from "@/lib/proposals/calc";
import { parseMonth } from "./calc";

// Validação dos formulários da Central Financeira. Os campos chegam como texto
// (como foram digitados) e saem no formato do banco.

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Preencha ${label}.`).max(max, `${label}: no máximo ${max} caracteres.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label}: no máximo ${max} caracteres.`)
    .transform((value) => value || null);

const optionalUuid = z
  .string()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

// "R$ 1.500,50", "1500.5" → 1500.5. Vazio vira 0 (campo de vendas) ou null.
function money(label: string, { empty }: { empty: 0 | null }) {
  return z
    .string()
    .transform((value) => (value.trim() ? parseMoney(value) : empty))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0), `${label}: valor inválido.`)
    .transform((value) => (value === null ? null : Math.round(value * 100) / 100));
}

// "1.200" ou "1200" → 1200. Vazio vira 0.
function count(label: string) {
  return z
    .string()
    .transform((value) => {
      const digits = value.replace(/[.\s]/g, "");
      return digits === "" ? 0 : /^\d+$/.test(digits) ? Number(digits) : NaN;
    })
    .refine((value) => Number.isSafeInteger(value), `${label}: use um número inteiro.`);
}

// "40" ou "40%" → 40.
function percent(label: string) {
  return z
    .string()
    .transform((value) => {
      const text = value.replace(/[%\s]/g, "");
      return /^\d{1,3}$/.test(text) ? Number(text) : NaN;
    })
    .refine((value) => value >= 0 && value <= 100, `${label}: use um número de 0 a 100.`);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (value: string) => DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().startsWith(value);

const optionalDate = (label: string) =>
  z
    .string()
    .transform((value) => value.trim() || null)
    .refine((value) => value === null || isRealDate(value), `${label}: data inválida.`);

export const appSchema = z.object({
  name: requiredText("o nome do app", 120),
  expertId: optionalUuid,
  partnerName: requiredText("o nome do influenciador", 120),
  partnerHandle: z
    .string()
    .transform((value) => normalizeHandle(value) || null)
    .refine((value) => value === null || value.length <= 100, "@ muito longo."),
  niche: optionalText("Nicho", 80),
  salesPlatform: optionalText("Plataforma de venda", 80),
  monthlyPrice: money("Ticket mensal", { empty: null }),
  companyShare: percent("% da empresa"),
  status: z.enum(appStatus.enumValues, "Escolha o status."),
  contractDate: optionalDate("Data do contrato"),
  launchDate: optionalDate("Data de lançamento"),
  notes: optionalText("Observações", 2000),
});

export type AppInput = z.input<typeof appSchema>;
export type AppData = z.output<typeof appSchema>;

export const saleSchema = z.object({
  appId: z.uuid("Escolha o app."),
  month: z
    .string()
    .transform(parseMonth)
    .refine((value) => value !== null, "Escolha o mês.")
    .transform((value) => value as string),
  newSales: count("Vendas novas"),
  activeSubscribers: count("Assinantes ativos"),
  cancellations: count("Cancelamentos"),
  grossRevenue: money("Faturamento bruto", { empty: 0 }).transform((value) => value ?? 0),
  platformFees: money("Taxas da plataforma", { empty: 0 }).transform((value) => value ?? 0),
  refunds: money("Reembolsos e chargebacks", { empty: 0 }).transform((value) => value ?? 0),
  companyShare: percent("% da empresa"),
  notes: optionalText("Observações", 500),
});

export type SaleInput = z.input<typeof saleSchema>;
export type SaleData = z.output<typeof saleSchema>;

export const costSchema = z
  .object({
    appId: optionalUuid, // vazio = custo geral da empresa
    spentOn: z.string().trim().refine(isRealDate, "Data inválida."),
    category: z.enum(costCategory.enumValues, "Escolha a categoria."),
    supplier: optionalText("Fornecedor", 120),
    description: optionalText("Descrição", 300),
    amount: money("Valor", { empty: null }).refine((value) => value !== null && value > 0, "Valor: informe um valor maior que zero."),
    shared: z.boolean(),
    partnerShare: z.string(), // % do influenciador, só quando rateado
  })
  .superRefine((data, ctx) => {
    if (data.shared && !data.appId) {
      ctx.addIssue({ code: "custom", path: ["shared"], message: "Custo geral da empresa não é rateado. Escolha o app ou desmarque o rateio." });
    }
    if (data.shared) {
      const result = percent("% do influenciador").safeParse(data.partnerShare);
      if (!result.success) ctx.addIssue({ code: "custom", path: ["partnerShare"], message: result.error.issues[0].message });
    }
  })
  .transform(({ partnerShare, ...data }) => ({
    ...data,
    amount: data.amount as number,
    partnerShare: data.shared ? Number(partnerShare.replace(/[%\s]/g, "")) : null,
  }));

export type CostInput = z.input<typeof costSchema>;
export type CostData = z.output<typeof costSchema>;
