import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";

export async function UserCard() {
  const user = await getCurrentUser();

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background p-2 md:group-data-[collapsed=true]/sidebar:justify-center md:group-data-[collapsed=true]/sidebar:border-0 md:group-data-[collapsed=true]/sidebar:bg-transparent md:group-data-[collapsed=true]/sidebar:p-0">
      <div className="min-w-0 md:group-data-[collapsed=true]/sidebar:hidden">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sair" title="Sair">
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}

export function UserCardSkeleton() {
  return <div className="h-13 animate-pulse rounded-md bg-muted" />;
}
