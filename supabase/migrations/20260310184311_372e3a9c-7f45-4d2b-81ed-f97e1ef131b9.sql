
-- Create z_api_instances table for multiple Z-API instances per user
CREATE TABLE public.z_api_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  instance_id text NOT NULL,
  instance_token text NOT NULL,
  client_token text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.z_api_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own z_api_instances"
  ON public.z_api_instances
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update disparos to reference z_api_instance_id instead of instance_name
ALTER TABLE public.disparos ADD COLUMN z_api_instance_id uuid REFERENCES public.z_api_instances(id) ON DELETE SET NULL;
