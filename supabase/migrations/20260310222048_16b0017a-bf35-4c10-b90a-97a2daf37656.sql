
CREATE TABLE public.public_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  instance_id uuid REFERENCES public.z_api_instances(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_leads ENABLE ROW LEVEL SECURITY;

-- Admins can see all public leads
CREATE POLICY "Admins can manage public_leads" ON public.public_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anon inserts (for public page)
CREATE POLICY "Anon can insert public_leads" ON public.public_leads
  FOR INSERT TO anon
  WITH CHECK (true);
