import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { getAllPlans, getSettings, getStagesWithCounts, getUsersWithGoals } from "@/lib/settings";
import { DEFAULT_DAILY_GOAL } from "@/lib/queue/queries";
import { saveDailyGoals, saveGeneralSettings, savePlans, saveScoreWeights, saveStages } from "./actions";
import { GeneralForm } from "./_components/general-form";
import { PlansForm } from "./_components/plans-form";
import { DailyGoalsForm } from "./_components/daily-goals-form";
import { ScoreWeightsForm } from "./_components/score-weights-form";
import { StagesForm } from "./_components/stages-form";

export const metadata: Metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Parâmetros do sistema. Só o Admin altera." />
      <Suspense fallback={<Skeleton className="h-80 max-w-2xl" />}>
        <SettingsSections />
      </Suspense>
    </div>
  );
}

async function SettingsSections() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao Admin.</p>;
  }
  const [settings, stages, goals, plans] = await Promise.all([
    queryAsUser(getSettings),
    queryAsUser(getStagesWithCounts),
    queryAsUser(getUsersWithGoals),
    queryAsUser(getAllPlans),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <ScoreWeightsForm weights={settings.scoreWeights} action={saveScoreWeights} />
      <StagesForm stages={stages} action={saveStages} />
      <DailyGoalsForm users={goals} defaultGoal={DEFAULT_DAILY_GOAL} action={saveDailyGoals} />
      <PlansForm plans={plans} action={savePlans} />
      <GeneralForm
        stages={stages.filter((stage) => !stage.isWon && !stage.isLost)}
        defaults={{ acceptedProposalStageId: settings.acceptedProposalStageId, reactivationDays: settings.reactivationDays }}
        action={saveGeneralSettings}
      />
    </div>
  );
}
