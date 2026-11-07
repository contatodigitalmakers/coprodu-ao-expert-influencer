-- Identificadores fixos das etapas e motivos usados pelas automações.
UPDATE public.stages SET key = CASE name
  WHEN 'Novo lead' THEN 'new'
  WHEN 'Em cadência' THEN 'in_cadence'
  WHEN 'Respondeu' THEN 'replied'
  WHEN 'Qualificado' THEN 'qualified'
  WHEN 'Diagnóstico agendado' THEN 'meeting_scheduled'
  WHEN 'Diagnóstico realizado' THEN 'meeting_done'
  WHEN 'Proposta enviada' THEN 'proposal_sent'
  WHEN 'Negociação' THEN 'negotiation'
  WHEN 'Ganho' THEN 'won'
  WHEN 'Perdido' THEN 'lost'
END;
--> statement-breakpoint
UPDATE public.loss_reasons SET key = CASE name
  WHEN 'Sem resposta' THEN 'no_reply'
  WHEN 'Outro' THEN 'other'
END;
--> statement-breakpoint

-- Regras de mudança de etapa (seção 4 do escopo), garantidas no banco:
-- - Perdido exige motivo (regra 3); fora de Perdido, o motivo é apagado.
-- - Ganho exige proposta aceita (regra 4).
-- - stage_entered_at marca quando o lead entrou na etapa.
CREATE FUNCTION public.enforce_expert_stage_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target public.stages;
BEGIN
  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO target FROM public.stages WHERE id = NEW.stage_id;

  IF target.is_lost THEN
    IF NEW.loss_reason_id IS NULL THEN
      RAISE EXCEPTION 'Mover para Perdido exige motivo.' USING HINT = 'loss_reason_required';
    END IF;
  ELSE
    NEW.loss_reason_id := NULL;
    NEW.loss_note := NULL;
  END IF;

  IF target.is_won AND NOT EXISTS (
    SELECT 1 FROM public.proposals p WHERE p.expert_id = NEW.id AND p.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Mover para Ganho exige proposta aceita.' USING HINT = 'accepted_proposal_required';
  END IF;

  NEW.stage_entered_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER experts_stage_rules
  BEFORE UPDATE OF stage_id ON public.experts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_expert_stage_rules();
--> statement-breakpoint

-- Ganho também exige o Projeto criado na mesma transação (regras 4 e 5): o
-- projeto guarda a data de assinatura e a confirmação do pagamento do setup.
-- A checagem acontece no fim da transação (DEFERRABLE).
CREATE FUNCTION public.check_won_has_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.stages s WHERE s.id = NEW.stage_id AND s.is_won)
     AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.expert_id = NEW.id) THEN
    RAISE EXCEPTION 'Ganho exige data de assinatura e pagamento do setup confirmados.'
      USING HINT = 'won_requires_project';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER experts_won_requires_project
  AFTER UPDATE OF stage_id ON public.experts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_won_has_project();
--> statement-breakpoint

-- Toda mudança de etapa gera um registro na linha do tempo, com o usuário
-- logado (auth.uid(); vazio quando a mudança vem do sistema ou da página
-- pública da proposta). Sair de Perdido conta como reativação (regra 6).
CREATE FUNCTION public.log_expert_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  from_stage public.stages;
  to_stage public.stages;
  reason_name text;
  description text;
BEGIN
  IF NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO from_stage FROM public.stages WHERE id = OLD.stage_id;
  SELECT * INTO to_stage FROM public.stages WHERE id = NEW.stage_id;

  IF from_stage.is_lost THEN
    description := format('Lead reativado: de "%s" para "%s".', from_stage.name, to_stage.name);
  ELSE
    description := format('Etapa alterada de "%s" para "%s".', from_stage.name, to_stage.name);
  END IF;

  IF NEW.loss_reason_id IS NOT NULL THEN
    SELECT name INTO reason_name FROM public.loss_reasons WHERE id = NEW.loss_reason_id;
    description := description || format(' Motivo: %s.', reason_name)
      || COALESCE(format(' %s', NEW.loss_note), '');
  END IF;

  INSERT INTO public.activities (expert_id, user_id, type, description, metadata)
  VALUES (
    NEW.id,
    auth.uid(),
    'stage_change',
    description,
    jsonb_build_object(
      'fromStageId', OLD.stage_id,
      'toStageId', NEW.stage_id,
      'reactivation', from_stage.is_lost,
      'lossReasonId', NEW.loss_reason_id
    )
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER experts_log_stage_change
  AFTER UPDATE OF stage_id ON public.experts
  FOR EACH ROW EXECUTE FUNCTION public.log_expert_stage_change();
