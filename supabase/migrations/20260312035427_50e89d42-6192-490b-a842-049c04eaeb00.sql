ALTER TABLE public.ad_financials 
ADD COLUMN exchange_rate numeric DEFAULT 0,
ADD COLUMN ad_spend_brl numeric DEFAULT 0;