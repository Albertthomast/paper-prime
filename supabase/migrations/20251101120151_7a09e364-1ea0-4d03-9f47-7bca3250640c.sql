-- Add currency and logo support to company_settings
ALTER TABLE public.company_settings
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN logo_url TEXT;

-- Add currency to invoices
ALTER TABLE public.invoices
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- Create clients table for reusable client details
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Anyone can view clients" 
ON public.clients 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update clients" 
ON public.clients 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete clients" 
ON public.clients 
FOR DELETE 
USING (true);

-- Add trigger for clients updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for company logos
CREATE POLICY "Anyone can view company logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can upload company logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Anyone can update company logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'company-logos');

CREATE POLICY "Anyone can delete company logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'company-logos');