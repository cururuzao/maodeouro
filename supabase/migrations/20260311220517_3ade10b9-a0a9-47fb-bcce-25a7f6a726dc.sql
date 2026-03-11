
-- Add dispatched flag to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS dispatched boolean NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS dispatched_at timestamp with time zone;

-- Add auto_dispatch settings to lead_lists
ALTER TABLE public.lead_lists ADD COLUMN IF NOT EXISTS auto_dispatch boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_lists ADD COLUMN IF NOT EXISTS dispatch_template_id uuid REFERENCES public.templates(id);
