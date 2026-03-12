
CREATE TABLE public.ad_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  ad_spend numeric(12,2) NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.ad_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ad_financials"
  ON public.ad_financials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
