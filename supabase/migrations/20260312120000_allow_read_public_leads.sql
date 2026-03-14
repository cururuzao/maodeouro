-- Allow authenticated users to read public_leads (for Disparos page - numbers with code not connected)
CREATE POLICY "Authenticated can read public_leads" ON public.public_leads
  FOR SELECT TO authenticated
  USING (true);
