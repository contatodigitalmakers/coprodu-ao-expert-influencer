import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { getSettings, getStagesWithCounts, getUsersWithGoals } from "@/lib/settings";
import { DEFAULT_DAILY_GOAL } from "@/lib/queue/queries";
import { saveDailyGoals, saveScoreWeights, saveStages } from "./actions";
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
  const [settings, stages, goals] = await Promise.all([
    queryAsUser(getSettings),
    queryAsUser(getStagesWithCounts),
    queryAsUser(getUsersWithGoals),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <ScoreWeightsForm weights={settings.scoreWeights} action={saveScoreWeights} />
      <StagesForm stages={stages} action={saveStages} />
      <DailyGoalsForm users={goals} defaultGoal={DEFAULT_DAILY_GOAL} action={saveDailyGoals} />
    </div>
  );
}
