-- Link curto da apresentação (/a/<code>), aberto sem login (papel anon).
-- O anon não lê nenhuma tabela: só esta função, que devolve os dados da
-- apresentação e, se pedido, conta a abertura. Apresentação excluída (ou de
-- lead excluído) não abre. A janela do apresentador passa register_view = false.
CREATE FUNCTION public.get_public_presentation(presentation_code text, register_view boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT p.data INTO result
  FROM public.presentations p
  JOIN public.experts e ON e.id = p.expert_id
  WHERE p.code = presentation_code AND p.deleted_at IS NULL AND e.deleted_at IS NULL;

  IF result IS NOT NULL AND register_view THEN
    UPDATE public.presentations
    SET views = views + 1, last_viewed_at = now()
    WHERE code = presentation_code;
  END IF;

  RETURN result;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.get_public_presentation(text, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_public_presentation(text, boolean) TO anon, authenticated;
