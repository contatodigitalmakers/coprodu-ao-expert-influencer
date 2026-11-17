import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { adminCan, deletedAt, id, timestamps } from "./common";
import { appStatus, costCategory } from "./enums";
import { experts } from "./experts";
import { users } from "./users";

// Central Financeira: apps em coprodução, vendas do mês e custos.
// Veio da planilha Controle_Apps_Coproducao.xlsx. Só o Admin lê e grava, e a
// exclusão é lógica (sem política de delete).

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

export const apps = pgTable(
  "apps",
  {
    id: id(),
    name: text("name").notNull(),
    expertId: uuid("expert_id").references(() => experts.id), // lead do CRM (opcional)
    partnerName: text("partner_name").notNull(), // influenciador
    partnerHandle: text("partner_handle"),
    niche: text("niche"),
    salesPlatform: text("sales_platform"), // Hotmart, Kiwify...
    monthlyPrice: money("monthly_price"), // ticket mensal
    companyShare: integer("company_share").notNull(), // % da empresa; o resto é do influenciador
    status: appStatus("status").notNull().default("in_development"),
    contractDate: date("contract_date"),
    launchDate: date("launch_date"),
    notes: text("notes"),
    deletedAt: deletedAt(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("apps_name_unique").on(sql`lower(${t.name})`).where(sql`${t.deletedAt} is null`),
    check("apps_company_share_range", sql`${t.companyShare} between 0 and 100`),
    check("apps_monthly_price_positive", sql`${t.monthlyPrice} >= 0`),
    index("apps_expert_id_idx").on(t.expertId),
    ...adminCan("select", "insert", "update"),
  ],
);

// Números do mês tirados do relatório da plataforma de vendas. Um lançamento
// por app por mês. O % da empresa é copiado do app e fica congelado.
export const appSales = pgTable(
  "app_sales",
  {
    id: id(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id),
    month: date("month").notNull(), // sempre o dia 1 do mês de referência
    newSales: integer("new_sales").notNull(),
    activeSubscribers: integer("active_subscribers").notNull(), // no fim do mês
    cancellations: integer("cancellations").notNull(),
    grossRevenue: money("gross_revenue").notNull(),
    platformFees: money("platform_fees").notNull(),
    refunds: money("refunds").notNull(), // reembolsos e chargebacks
    companyShare: integer("company_share").notNull(),
    notes: text("notes"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // quem lançou
    deletedAt: deletedAt(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("app_sales_app_month_unique").on(t.appId, t.month).where(sql`${t.deletedAt} is null`),
    check("app_sales_month_first_day", sql`extract(day from ${t.month}) = 1`),
    check(
      "app_sales_counts_positive",
      sql`${t.newSales} >= 0 and ${t.activeSubscribers} >= 0 and ${t.cancellations} >= 0`,
    ),
    check(
      "app_sales_values_positive",
      sql`${t.grossRevenue} >= 0 and ${t.platformFees} >= 0 and ${t.refunds} >= 0`,
    ),
    check("app_sales_company_share_range", sql`${t.companyShare} between 0 and 100`),
    index("app_sales_month_idx").on(t.month),
    ...adminCan("select", "insert", "update"),
  ],
);

// Uma linha por despesa. Sem app = custo geral da empresa. Custo rateado: o
// influenciador devolve a parte dele (% congelado no lançamento).
export const costs = pgTable(
  "costs",
  {
    id: id(),
    appId: uuid("app_id").references(() => apps.id),
    spentOn: date("spent_on").notNull(),
    category: costCategory("category").notNull(),
    supplier: text("supplier"),
    description: text("description"),
    amount: money("amount").notNull(),
    shared: boolean("shared").notNull().default(false), // rateado com o influenciador
    partnerShare: integer("partner_share"), // % do influenciador, só quando rateado
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // quem lançou
    deletedAt: deletedAt(),
    ...timestamps,
  },
  (t) => [
    check("costs_amount_positive", sql`${t.amount} > 0`),
    // Custo geral não é rateado; rateado precisa do app e do %.
    check(
      "costs_shared_rules",
      sql`(${t.shared} and ${t.appId} is not null and ${t.partnerShare} between 0 and 100) or (not ${t.shared} and ${t.partnerShare} is null)`,
    ),
    index("costs_app_id_idx").on(t.appId),
    index("costs_spent_on_idx").on(t.spentOn),
    ...adminCan("select", "insert", "update"),
  ],
);

export type App = typeof apps.$inferSelect;
