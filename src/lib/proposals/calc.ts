import type { ProposalExtra } from "@/db/schema/deals";

// "R$ 7.000,00", "7000" ou "1.500,5" → número. NaN se não der para entender.
export function parseMoney(value: string) {
  const text = value.replace(/R\$|\s/g, "");
  if (!text) return NaN;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized);
}

// Total = setup + serviços extras, arredondado em centavos.
export function proposalTotal(setupValue: number, extras: ProposalExtra[]) {
  const sum = extras.reduce((total, extra) => total + extra.value, setupValue);
  return Math.round(sum * 100) / 100;
}

// Serviços extras de co-produção sugeridos (seção 3.8), com valor livre.
export const SUGGESTED_EXTRAS = ["Estratégia de marketing", "Tráfego", "Lançamento"];
