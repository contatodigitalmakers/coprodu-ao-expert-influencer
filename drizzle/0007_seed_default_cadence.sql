-- Cadência de exemplo da seção 3.4: D0 seguir e interagir, D1 DM, D3 follow-up
-- DM, D5 WhatsApp, D8 e-mail, D12 encerramento. Editável em /cadencias.
WITH cadence AS (
  INSERT INTO public.cadences (name) VALUES ('Cadência padrão (12 dias)') RETURNING id
)
INSERT INTO public.cadence_steps (cadence_id, day_offset, channel, template_id, "order")
SELECT cadence.id, step.day_offset, step.channel::public.channel, t.id, step.position
FROM cadence
CROSS JOIN (VALUES
  (0, 'interaction', NULL, 1),
  (1, 'dm', 'D1 · Abordagem por DM', 2),
  (3, 'dm', 'D3 · Follow-up por DM', 3),
  (5, 'whatsapp', 'D5 · Contato por WhatsApp', 4),
  (8, 'email', 'D8 · E-mail', 5),
  (12, 'dm', 'D12 · Mensagem de encerramento', 6)
) AS step(day_offset, channel, template_name, position)
LEFT JOIN public.templates t ON t.name = step.template_name AND t.deleted_at IS NULL;
