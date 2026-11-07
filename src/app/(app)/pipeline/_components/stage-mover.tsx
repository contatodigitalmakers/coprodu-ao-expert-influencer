"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, todayInSaoPaulo } from "@/lib/format";
import type { LossReasonOption, StageOption } from "@/lib/pipeline/queries";
import { listAcceptedProposals, moveExpertStage } from "../actions";

type Expert = { id: string; name: string };
type PendingMove = { expert: Expert; stage: StageOption } | null;
type MoveRequest = Parameters<typeof moveExpertStage>[0];

// Lógica de mover etapa, compartilhada por Kanban, lista e ficha do expert.
// Perdido e Ganho abrem um diálogo pedindo os dados exigidos pelas regras.
export function useStageMover({
  lossReasons,
  onOptimisticMove,
}: {
  lossReasons: LossReasonOption[];
  onOptimisticMove?: (expertId: string, stageId: string) => void;
}) {
  const [pending, setPending] = useState<PendingMove>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(request: MoveRequest) {
    setError(null);
    startTransition(async () => {
      onOptimisticMove?.(request.expertId, request.toStageId);
      const result = await moveExpertStage(request);
      if (result.ok) setPending(null);
      else setError(result.error);
    });
  }

  function requestMove(expert: Expert, stage: StageOption) {
    setError(null);
    if (stage.isLost || stage.isWon) setPending({ expert, stage });
    else run({ expertId: expert.id, toStageId: stage.id });
  }

  const close = () => {
    setPending(null);
    setError(null);
  };

  const dialogs = pending ? (
    pending.stage.isLost ? (
      <LostDialog
        expert={pending.expert}
        lossReasons={lossReasons}
        error={error}
        isPending={isPending}
        onClose={close}
        onConfirm={(lossReasonId, lossNote) =>
          run({ expertId: pending.expert.id, toStageId: pending.stage.id, lossReasonId, lossNote })
        }
      />
    ) : (
      <WonDialog
        expert={pending.expert}
        error={error}
        isPending={isPending}
        onClose={close}
        onConfirm={(won) => run({ expertId: pending.expert.id, toStageId: pending.stage.id, won })}
      />
    )
  ) : null;

  // Erros de movimentos simples aparecem fora do diálogo.
  return { requestMove, dialogs, error: pending ? null : error, isPending, clearError: () => setError(null) };
}

function LostDialog({
  expert,
  lossReasons,
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  expert: Expert;
  lossReasons: LossReasonOption[];
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (lossReasonId: string | null, lossNote: string) => void;
}) {
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const isOther = lossReasons.find((reason) => reason.id === reasonId)?.key === "other";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm(reasonId, note);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Mover {expert.name} para Perdido</DialogTitle>
            <DialogDescription>O motivo é obrigatório e fica registrado na linha do tempo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="loss-reason">Motivo da perda</Label>
            <SimpleSelect
              id="loss-reason"
              placeholder="Escolha o motivo"
              options={lossReasons.map((reason) => ({ value: reason.id, label: reason.name }))}
              value={reasonId}
              onValueChange={setReasonId}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="loss-note">{isOther ? "Descreva o motivo" : "Observação (opcional)"}</Label>
            <Textarea id="loss-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Movendo…" : "Mover para Perdido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AcceptedProposal = Awaited<ReturnType<typeof listAcceptedProposals>>[number];

function WonDialog({
  expert,
  error,
  isPending,
  onClose,
  onConfirm,
}: {
  expert: Expert;
  error: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (won: { proposalId: string; contractSignedAt: string; setupPaidAt: string }) => void;
}) {
  const [proposals, setProposals] = useState<AcceptedProposal[] | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [contractSignedAt, setContractSignedAt] = useState(() => todayInSaoPaulo());
  const [setupPaidAt, setSetupPaidAt] = useState(() => todayInSaoPaulo());

  useEffect(() => {
    listAcceptedProposals(expert.id).then((rows) => {
      setProposals(rows);
      setProposalId(rows[0]?.id ?? null);
    });
  }, [expert.id]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (proposalId) onConfirm({ proposalId, contractSignedAt, setupPaidAt });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Marcar {expert.name} como Ganho</DialogTitle>
            <DialogDescription>
              Ganho exige proposta aceita, contrato assinado e setup pago. Um Projeto é criado com
              status “Aguardando kickoff”.
            </DialogDescription>
          </DialogHeader>

          {proposals === null ? (
            <p className="text-sm text-muted-foreground">Carregando propostas…</p>
          ) : proposals.length === 0 ? (
            <p role="alert" className="text-sm text-destructive">
              Este lead não tem proposta aceita. Para marcar como Ganho, a proposta precisa ser aceita antes.
            </p>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="won-proposal">Proposta aceita</Label>
                <SimpleSelect
                  id="won-proposal"
                  options={proposals.map((proposal) => ({
                    value: proposal.id,
                    label: `${proposal.planName} · ${formatCurrency(proposal.total)}`,
                  }))}
                  value={proposalId}
                  onValueChange={setProposalId}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="won-contract">Contrato assinado em</Label>
                  <Input
                    id="won-contract"
                    type="date"
                    required
                    value={contractSignedAt}
                    onChange={(event) => setContractSignedAt(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="won-paid">Setup pago em</Label>
                  <Input
                    id="won-paid"
                    type="date"
                    required
                    value={setupPaidAt}
                    onChange={(event) => setSetupPaidAt(event.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !proposalId}>
              {isPending ? "Salvando…" : "Confirmar Ganho"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
