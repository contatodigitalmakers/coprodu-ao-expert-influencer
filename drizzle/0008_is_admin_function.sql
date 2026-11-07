-- O usuário logado é Admin ativo? Usada em políticas de RLS.
-- "security definer" lê a tabela users sem passar pela RLS (uma política em
-- users que consultasse users entraria em recursão).
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND active
  );
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
