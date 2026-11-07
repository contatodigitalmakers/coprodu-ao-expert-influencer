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
