-- Coluna "delivered" = mensagens realmente entregues no celular (via webhook Z-API RECEIVED)
ALTER TABLE public.disparos ADD COLUMN IF NOT EXISTS delivered integer NOT NULL DEFAULT 0;
