-- Cria a linha em public.users sempre que um login é criado no Supabase Auth.
-- "security definer" faz a função rodar com permissão de dona da tabela,
-- já que a RLS não libera inserção em users para ninguém.
CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    -- Enquanto só os sócios usam o sistema, todo login é admin (ver CLAUDE.md).
    'admin'
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Ninguém precisa chamar essa função diretamente; só o trigger.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
