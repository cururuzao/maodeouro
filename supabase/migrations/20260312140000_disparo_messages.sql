-- Tabela para rastrear message_id -> disparo (webhook RECEIVED)
CREATE TABLE IF NOT EXISTS public.disparo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disparo_id uuid NOT NULL REFERENCES public.disparos(id) ON DELETE CASCADE,
  zaap_id text NOT NULL,
  phone text NOT NULL,
  instance_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disparo_messages_zaap_id ON public.disparo_messages(zaap_id);
CREATE INDEX IF NOT EXISTS idx_disparo_messages_instance ON public.disparo_messages(instance_id);

ALTER TABLE public.disparo_messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir para disparos próprios
CREATE POLICY "Users insert own disparo_messages" ON public.disparo_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.disparos d WHERE d.id = disparo_id AND d.user_id = auth.uid())
  );

