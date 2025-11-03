-- Add next_proforma_number to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS next_proforma_number integer NOT NULL DEFAULT 1;