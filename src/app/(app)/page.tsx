import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Início",
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-14 w-80 animate-pulse rounded-md bg-muted" />}>
      <Greeting />
    </Suspense>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold">Olá, {firstName}!</h1>
      <p className="text-muted-foreground">
        Boas-vindas à Central Comercial. Os módulos vão aparecer no menu conforme
        forem construídos.
      </p>
    </div>
  );
}
