-- Regra 8: a divisão de receita (e os valores) da proposta aceita fica congelada.
CREATE FUNCTION public.freeze_accepted_proposal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'accepted' AND (
    NEW.plan_id IS DISTINCT FROM OLD.plan_id OR
    NEW.setup_value IS DISTINCT FROM OLD.setup_value OR
    NEW.expert_share IS DISTINCT FROM OLD.expert_share OR
    NEW.our_share IS DISTINCT FROM OLD.our_share OR
    NEW.extras IS DISTINCT FROM OLD.extras OR
    NEW.total IS DISTINCT FROM OLD.total
  ) THEN
    RAISE EXCEPTION 'Proposta aceita não pode ter os valores alterados.' USING HINT = 'accepted_proposal_frozen';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER proposals_freeze_accepted
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.freeze_accepted_proposal();
--> statement-breakpoint

-- Página pública da proposta (/p/<token>), acessada sem login (papel anon).
-- O anon não lê nenhuma tabela: só estas funções, que expõem a proposta do
-- token e registram a primeira visualização. Rascunhos não são públicos.
CREATE FUNCTION public.get_public_proposal(proposal_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  UPDATE public.proposals
  SET status = 'viewed', viewed_at = now()
  WHERE public_token = proposal_token AND status = 'sent';

  UPDATE public.proposals
  SET viewed_at = now()
  WHERE public_token = proposal_token AND viewed_at IS NULL AND status <> 'draft';

  SELECT jsonb_build_object(
    'expertName', e.name,
    'planName', pl.name,
    'setupValue', p.setup_value,
    'expertShare', p.expert_share,
    'ourShare', p.our_share,
    'extras', p.extras,
    'total', p.total,
    'status', p.status,
    'sentAt', p.sent_at,
    'acceptedAt', p.accepted_at
  )
  INTO result
  FROM public.proposals p
  JOIN public.experts e ON e.id = p.expert_id
  JOIN public.plans pl ON pl.id = p.plan_id
  WHERE p.public_token = proposal_token AND p.status <> 'draft';

  RETURN result;
END;
$$;
--> statement-breakpoint

-- Resposta do expert na página pública: aceita ou recusa (só uma vez).
-- Aceitar move o lead para a etapa configurada em settings, se ele estiver antes.
CREATE FUNCTION public.respond_to_proposal(proposal_token uuid, accept boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  proposal public.proposals;
  target public.stages;
  current_stage public.stages;
BEGIN
  SELECT * INTO proposal FROM public.proposals
  WHERE public_token = proposal_token AND status IN ('sent', 'viewed')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unavailable';
  END IF;

  IF accept THEN
    UPDATE public.proposals SET status = 'accepted', accepted_at = now() WHERE id = proposal.id;
  ELSE
    UPDATE public.proposals SET status = 'rejected' WHERE id = proposal.id;
  END IF;

  INSERT INTO public.activities (expert_id, user_id, type, description, metadata)
  VALUES (
    proposal.expert_id,
    NULL,
    'proposal',
    CASE WHEN accept THEN 'Proposta aceita pelo expert na página pública.' ELSE 'Proposta recusada pelo expert na página pública.' END,
    jsonb_build_object('proposalId', proposal.id, 'status', CASE WHEN accept THEN 'accepted' ELSE 'rejected' END)
  );

  IF accept THEN
    SELECT s.* INTO target FROM public.settings st JOIN public.stages s ON s.id = st.accepted_proposal_stage_id LIMIT 1;
    SELECT s.* INTO current_stage FROM public.experts e JOIN public.stages s ON s.id = e.stage_id WHERE e.id = proposal.expert_id;
    IF target.id IS NOT NULL AND NOT target.is_won AND NOT current_stage.is_won AND NOT current_stage.is_lost
       AND current_stage."order" < target."order" THEN
      UPDATE public.experts SET stage_id = target.id WHERE id = proposal.expert_id;
    END IF;
  END IF;

  RETURN CASE WHEN accept THEN 'accepted' ELSE 'rejected' END;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.get_public_proposal(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.respond_to_proposal(uuid, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_public_proposal(uuid) TO anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.respond_to_proposal(uuid, boolean) TO anon, authenticated;
