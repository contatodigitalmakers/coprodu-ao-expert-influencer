const TIME_ZONE = "America/Sao_Paulo";

const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// 7000 → "R$ 7.000,00"
export function formatCurrency(value: number) {
  return currency.format(value);
}

// "2026-11-06" → "06/11/2026" (datas sem horário, como due_date)
export function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// Hoje no fuso de São Paulo, no formato "2026-11-06".
export function todayInSaoPaulo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// 12500 → "12,5 mil"
export function formatFollowers(value: number | null) {
  return value === null ? "—" : compactNumber.format(value);
}

export function formatDateTime(value: Date) {
  return dateTime.format(value);
}

// 3.5 → "3,5%"
export function formatPercent(value: number | null) {
  return value === null ? "—" : `${percent.format(value)}%`;
}

// 5511999998888 → "+55 11 99999-8888"
export function formatWhatsapp(value: string) {
  const match = value.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `+55 ${match[1]} ${match[2]}-${match[3]}` : `+${value}`;
}
