import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Busca simples por nome ou @ do lead (GET ?busca=...).
export function SearchForm({ action, defaultValue, label }: { action: string; defaultValue: string; label: string }) {
  return (
    <form action={action} className="flex max-w-md gap-2" role="search">
      <Input name="busca" type="search" defaultValue={defaultValue} placeholder="Nome ou @ do lead" aria-label={label} />
      <Button type="submit" variant="outline">
        <SearchIcon /> Buscar
      </Button>
    </form>
  );
}
