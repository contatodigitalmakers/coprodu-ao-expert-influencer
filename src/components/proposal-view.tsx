import type { ProposalExtra } from "@/db/schema/deals";
import { formatCurrency } from "@/lib/format";

export type ProposalContent = {
  expertName: string;
  planName: string;
  setupValue: number;
  expertShare: number;
  ourShare: number;
  extras: ProposalExtra[];
  total: number;
};

// Conteúdo da proposta (seção 3.8). Usado na página interna e na pública.
export function ProposalView({ proposal }: { proposal: ProposalContent }) {
  const { expertName, planName, setupValue, expertShare, ourShare, extras, total } = proposal;
  return (
    <div className="flex flex-col gap-6" data-testid="proposal-view">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Proposta de co-produção de app</p>
        <h2 className="font-heading text-2xl font-semibold">{expertName}</h2>
      </div>

      <section className="grid gap-4 rounded-xl border p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Plano</p>
          <p className="font-medium">{planName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Setup (desenvolvimento do app)</p>
          <p className="font-medium">{formatCurrency(setupValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Divisão da receita recorrente</p>
          <p className="font-medium" data-testid="proposal-split">
            {expertShare}% para você · {ourShare}% para nós
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl bg-muted/50 p-5">
        <h3 className="font-medium">Como funciona a divisão</h3>
        <p className="text-sm" data-testid="proposal-rule">
          Você recebe 100% da receita do app até recuperar o valor do setup ({formatCurrency(setupValue)}).
          Depois disso, vale a divisão do plano: {expertShare}% para você e {ourShare}% para nós.
        </p>
      </section>

      {extras.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-medium">Serviços extras de co-produção</h3>
          <ul className="flex flex-col divide-y rounded-xl border text-sm">
            {extras.map((extra, index) => (
              <li key={index} className="flex justify-between gap-4 px-4 py-2.5">
                <span>{extra.name}</span>
                <span className="tabular-nums">{formatCurrency(extra.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-baseline justify-between border-t pt-4 text-lg font-semibold">
        <span>Investimento total</span>
        <span className="tabular-nums" data-testid="proposal-total">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
