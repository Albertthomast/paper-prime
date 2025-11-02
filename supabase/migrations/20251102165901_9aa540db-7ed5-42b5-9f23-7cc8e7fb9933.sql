-- Add GST and PAN number fields to clients table
ALTER TABLE public.clients 
ADD COLUMN gst_number TEXT,
ADD COLUMN pan_number TEXT;

-- Add GST, PAN, and bank account details to company_settings table
ALTER TABLE public.company_settings
ADD COLUMN gst_number TEXT,
ADD COLUMN pan_number TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN next_quotation_number INTEGER NOT NULL DEFAULT 1;

-- Add client GST and PAN to invoices table for historical record
ALTER TABLE public.invoices
ADD COLUMN client_gst_number TEXT,
ADD COLUMN client_pan_number TEXT;