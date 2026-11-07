"use client";

import { useState, type ReactNode } from "react";

// Gráficos do dashboard em HTML (guia de dataviz): uma cor para série única,
// barras finas (<= 24px) com ponta arredondada e base reta, grade em hairline,
// valor na ponta da barra, dica no hover/foco e tabela equivalente embaixo.

export type BarItem = { label: string; value: number; note?: string };

// Barras horizontais (funil e motivos de perda).
export function BarList({
  items,
  label,
  formatValue = (value) => value.toLocaleString("pt-BR"),
  noteHeader,
}: {
  items: BarItem[];
  label: string;
  formatValue?: (value: number) => string;
  noteHeader?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((item) => item.value));
  // Colunas de largura fixa: todas as barras usam a mesma escala.
  const columns = noteHeader
    ? "grid-cols-[minmax(6rem,11rem)_1fr_2.5rem_7rem]"
    : "grid-cols-[minmax(6rem,11rem)_1fr_2.5rem]";

  return (
    <figure className="flex flex-col gap-3" aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li
            key={item.label}
            tabIndex={0}
            aria-label={`${item.label}: ${formatValue(item.value)}${item.note ? ` (${item.note})` : ""}`}
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            className={`relative grid ${columns} items-center gap-3 rounded-md px-1 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
          >
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="relative h-4">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-opacity"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  minWidth: item.value > 0 ? 2 : 0,
                  background: "var(--viz-series-1)",
                  opacity: active === null || active === index ? 1 : 0.55,
                }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{formatValue(item.value)}</span>
            {noteHeader && <span className="text-xs text-muted-foreground">{item.note ?? ""}</span>}
            {active === index && <Tooltip title={item.label} value={formatValue(item.value)} note={item.note} />}
          </li>
        ))}
      </ul>
      <TableView
        columns={[label, "Valor", ...(noteHeader ? [noteHeader] : [])]}
        rows={items.map((item) => [item.label, formatValue(item.value), ...(noteHeader ? [item.note ?? "—"] : [])])}
      />
    </figure>
  );
}

// Colunas por dia (toques por dia).
export function ColumnChart({ days, label, unit }: { days: { day: string; value: number }[]; label: string; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.value));
  const top = niceMax(max);
  const short = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(days.length / 6);

  return (
    <figure className="flex flex-col gap-3" aria-label={label}>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <div className="relative h-40 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (tick / top) * 100}%` }}>
              {tick.toLocaleString("pt-BR")}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <div className="relative h-40" style={{ borderBottom: "1px solid var(--viz-axis)" }}>
            {ticks.slice(1).map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0"
                style={{ top: `${100 - (tick / top) * 100}%`, borderTop: "1px solid var(--viz-grid)" }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {days.map((day, index) => (
                <div
                  key={day.day}
                  tabIndex={0}
                  aria-label={`${short(day.day)}: ${day.value} ${unit}`}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-muted/60"
                >
                  <span
                    className="w-full max-w-6 rounded-t-[4px]"
                    style={{
                      height: `${(day.value / top) * 100}%`,
                      minHeight: day.value > 0 ? 2 : 0,
                      background: "var(--viz-series-1)",
                      opacity: active === null || active === index ? 1 : 0.55,
                    }}
                  />
                  {active === index && <Tooltip title={short(day.day)} value={`${day.value} ${unit}`} />}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-[2px] text-xs text-muted-foreground">
            {days.map((day, index) => (
              <span key={day.day} className="flex-1 text-center">
                {index % labelEvery === 0 ? short(day.day) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <TableView columns={["Dia", unit[0].toUpperCase() + unit.slice(1)]} rows={days.map((day) => [short(day.day), String(day.value)])} />
    </figure>
  );
}

// Topo "redondo" do eixo, com metade inteira (o eixo mostra 0, metade e topo):
// 1 → 2, 5 → 6, 7 → 8, 23 → 40, 140 → 200.
function niceMax(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [2, 4, 6, 8, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

function Tooltip({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
    >
      <span className="block font-semibold text-foreground">{value}</span>
      <span className="block text-muted-foreground">{title}</span>
      {note && <span className="block text-muted-foreground">{note}</span>}
    </span>
  );
}

// Tabela equivalente ao gráfico (acessibilidade: nenhum valor só no hover).
function TableView({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground">Ver dados em tabela</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((column) => (
              <th key={column} className="py-1 pr-4 font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-1 pr-4 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
