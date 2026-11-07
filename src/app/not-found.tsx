import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Página de "não encontrado" (em português) para todo o sistema.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-heading text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço pode estar errado, ou o conteúdo foi removido ou ainda não está disponível.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Voltar ao início
      </Link>
    </main>
  );
}
