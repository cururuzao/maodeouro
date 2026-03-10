
-- Add metadata column for buttons, footer, list sections, media URL etc.
ALTER TABLE public.templates ADD COLUMN metadata JSONB DEFAULT '{}';
