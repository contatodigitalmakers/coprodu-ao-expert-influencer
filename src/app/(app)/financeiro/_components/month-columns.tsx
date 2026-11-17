"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

// Colunas por mês (guia de dataviz): uma série por gráfico, na cor da marca
// (--viz-series-1). "Receita da empresa" e "Resultado" ficam lado a lado com a
// mesma escala (small multiples), em vez de duas cores ou dois eixos.
// O resultado pode ser negativo: a coluna desce da linha do zero.

export type MonthValue = { month: string; label: string; value: number };

// 6000 → "R$ 6 mil". Feito à mão: o notation "compact" do Intl sai diferente
// no Node ("6,0 mil") e no Chrome ("6 mil"), e a página dava erro de hydration.
function compact(value: number) {
  const abs = Math.abs(value);
  const [divisor, suffix] = abs >= 1e6 ? [1e6, " mi"] : abs >= 1e3 ? [1e3, " mil"] : [1, ""];
  const number = (abs / divisor).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${value < 0 ? "-" : ""}R$ ${number}${suffix}`;
}

export function MonthColumns({ title, months, top, bottom }: { title: string; months: MonthValue[]; top: number; bottom: number }) {
  const [active, setActive] = useState<number | null>(null);
  const span = top - bottom || 1;
  const zero = (top / span) * 100; // posição da linha do zero, de cima para baixo (%)
  const ticks = [top, 0, bottom].filter((tick, index, all) => all.indexOf(tick) === index);

  return (
    <figure className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="grid grid-cols-[3.5rem_1fr] gap-2">
        <div className="relative h-40 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${((top - tick) / span) * 100}%` }}>
              {compact(tick)}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="relative h-40">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0"
                style={{ top: `${((top - tick) / span) * 100}%`, borderTop: `1px solid var(${tick === 0 ? "--viz-axis" : "--viz-grid"})` }}
              />
            ))}
            <div className="absolute inset-0 flex gap-[2px]">
              {months.map((item, index) => {
                const height = (Math.abs(item.value) / span) * 100;
                const positive = item.value >= 0;
                return (
                  <div
                    key={item.month}
                    tabIndex={0}
                    aria-label={`${item.label}: ${formatCurrency(item.value)}`}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className="relative h-full flex-1 outline-none focus-visible:bg-muted/60"
                  >
                    <span
                      className={`absolute left-1/2 w-full max-w-6 -translate-x-1/2 ${positive ? "rounded-t-[4px]" : "rounded-b-[4px]"}`}
                      style={{
                        top: positive ? `${zero - height}%` : `${zero}%`,
                        height: `${height}%`,
                        minHeight: item.value !== 0 ? 2 : 0,
                        background: "var(--viz-series-1)",
                        opacity: active === null || active === index ? 1 : 0.55,
                      }}
                    />
                    {active === index && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
                      >
                        <span className="block font-semibold text-foreground">{formatCurrency(item.value)}</span>
                        <span className="block text-muted-foreground">{item.label}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-[2px] text-[11px] text-muted-foreground">
            {months.map((item, index) => (
              <span key={item.month} className="flex-1 text-center">
                {index % 2 === 0 ? item.label.slice(0, 3) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
