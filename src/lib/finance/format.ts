import { formatCurrency, formatPercent } from "@/lib/format";

// Formatação dos números da Central Financeira. Sem valor (divisão por zero)
// aparece "—".

export const money = (value: number) => formatCurrency(value);

// 0.5657 → "56,6%"
export const pct = (ratio: number | null) => (ratio === null ? "—" : formatPercent(Math.round(ratio * 1000) / 10));

// 17.5675 → "17,57"
export const decimal = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 49.9 → "49,90" (para preencher campos de valor)
export const moneyInput = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
