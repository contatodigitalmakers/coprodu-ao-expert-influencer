import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveScoreWeights } from "./actions";
import { ScoreWeightsForm } from "./_components/score-weights-form";

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
  const settings = await queryAsUser(getSettings);

  return (
    <div className="flex flex-col gap-6">
      <ScoreWeightsForm weights={settings.scoreWeights} action={saveScoreWeights} />
    </div>
  );
}
