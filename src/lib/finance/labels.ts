import type { AppStatus, CostCategory } from "@/db/schema";

// Listas fixas da Central Financeira (as da aba Config da planilha).

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  prospecting: "Prospecção",
  negotiating: "Negociação",
  contract_signed: "Contrato assinado",
  in_development: "Em desenvolvimento",
  beta: "Beta",
  launching: "Lançamento",
  operating: "Em operação",
  paused: "Pausado",
  closed: "Encerrado",
};

export const APP_STATUS_OPTIONS = Object.entries(APP_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export type CostGroup = "app" | "company" | "tax";

export const COST_GROUP_LABELS: Record<CostGroup, string> = {
  app: "Custos do app",
  company: "Custos da empresa",
  tax: "Impostos",
};

// Categoria → texto e grupo. O grupo diz onde a categoria costuma ser lançada
// (no app ou em Geral); o resumo separa pelo app do lançamento.
export const COST_CATEGORIES: Record<CostCategory, { label: string; group: CostGroup }> = {
  paid_traffic: { label: "Tráfego pago", group: "app" },
  ai_app: { label: "IA no app (API)", group: "app" },
  infrastructure: { label: "Infraestrutura", group: "app" },
  sales_tools: { label: "Ferramentas de venda", group: "app" },
  app_freelancers: { label: "Freelancers do app", group: "app" },
  app_other: { label: "Outros do app", group: "app" },
  ai_development: { label: "IA de desenvolvimento", group: "company" },
  software: { label: "Softwares", group: "company" },
  people: { label: "Pessoas", group: "company" },
  services: { label: "Serviços", group: "company" },
  taxes: { label: "Impostos", group: "tax" },
  company_other: { label: "Outros da empresa", group: "company" },
};

export const COST_CATEGORY_OPTIONS = Object.entries(COST_CATEGORIES).map(([value, { label, group }]) => ({
  value,
  label: `${label} · ${COST_GROUP_LABELS[group]}`,
}));

// % padrão da empresa quando o app não vem de uma proposta aceita.
export const DEFAULT_COMPANY_SHARE = 40;

export const SALES_PLATFORM_SUGGESTIONS = ["Hotmart", "Kiwify", "Eduzz", "App Store", "Google Play"];

// Valor do filtro de app que representa os custos gerais da empresa.
export const GENERAL_COSTS = "geral";
