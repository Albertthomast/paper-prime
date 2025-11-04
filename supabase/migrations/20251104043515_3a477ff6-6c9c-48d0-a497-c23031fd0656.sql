-- Add unit column to line_items table
ALTER TABLE public.line_items
ADD COLUMN unit text NOT NULL DEFAULT 'item';

-- Add custom_units column to company_settings table
ALTER TABLE public.company_settings
ADD COLUMN custom_units text[] DEFAULT ARRAY[]::text[];