-- NOA Inventory Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER PROFILES (extends Supabase Auth)
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'collector' CHECK (role IN ('admin', 'gallery', 'collector')),
  gallery_id UUID, -- set for gallery users
  contact_id UUID, -- set for collector users
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- GALLERIES
-- ============================================================================
CREATE TABLE galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'representative',
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  commission_rate NUMERIC(5,2),
  commission_gallery NUMERIC(5,2),
  commission_noa NUMERIC(5,2),
  commission_artist NUMERIC(5,2),
  status_color TEXT CHECK (status_color IN ('green', 'yellow', 'red')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ARTWORKS
-- ============================================================================
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_number TEXT NOT NULL UNIQUE,
  reference_code TEXT NOT NULL UNIQUE, -- NOA-SB-2026-K7M2 format, immutable
  title TEXT NOT NULL,
  medium TEXT,
  year INTEGER,
  height NUMERIC(10,2),
  width NUMERIC(10,2),
  depth NUMERIC(10,2),
  dimension_unit TEXT NOT NULL DEFAULT 'cm' CHECK (dimension_unit IN ('cm', 'inches')),
  framed_height NUMERIC(10,2),
  framed_width NUMERIC(10,2),
  framed_depth NUMERIC(10,2),
  weight NUMERIC(10,2),
  edition_type TEXT NOT NULL DEFAULT 'unique' CHECK (edition_type IN ('unique', 'numbered', 'AP', 'HC', 'EA')),
  edition_number INTEGER,
  edition_total INTEGER,
  is_unique BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'in_production', 'in_transit', 'on_consignment')),
  current_location TEXT,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('painting', 'sculpture', 'drawing', 'mixed_media', 'print', 'photography', 'installation', 'digital', 'other')),
  motif TEXT CHECK (motif IN ('portrait', 'landscape', 'abstract', 'figurative', 'still_life', 'architectural', 'conceptual', 'other')),
  series TEXT CHECK (series IN ('animal', 'untitled_portrait', 'specific_portrait', 'god', 'personal_commission', 'landscape', 'abstract', 'figurative', 'skull', 'sphere', 'half_sphere', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ARTWORK IMAGES
-- ============================================================================
CREATE TABLE artwork_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'retouched' CHECK (image_type IN ('raw', 'retouched', 'detail')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ARTWORK MOVEMENTS (provenance tracking)
-- ============================================================================
CREATE TABLE artwork_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  from_location TEXT,
  to_location TEXT NOT NULL,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTACTS (CRM)
-- ============================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'collector' CHECK (type IN ('collector', 'prospect', 'institution')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tags TEXT[],
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INTERACTIONS (CRM)
-- ============================================================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  subject TEXT,
  body TEXT,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  artwork_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DEALS (CRM pipeline)
-- ============================================================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'quoted', 'negotiating', 'sold', 'lost')),
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TASKS
-- ============================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WISH LIST ITEMS
-- ============================================================================
CREATE TABLE wish_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  added_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, artwork_id)
);

-- ============================================================================
-- SALES
-- ============================================================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  buyer_name TEXT,
  buyer_email TEXT,
  commission_percent NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  stripe_payment_link TEXT,
  stripe_payment_intent_id TEXT,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DELIVERIES
-- ============================================================================
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_number TEXT NOT NULL UNIQUE,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_address TEXT,
  delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PACKING LISTS
-- ============================================================================
CREATE TABLE packing_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  packing_number TEXT NOT NULL UNIQUE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  packing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE packing_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  crate_number TEXT,
  packaging_type TEXT,
  special_handling TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PRODUCTION ORDERS
-- ============================================================================
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'in_production', 'quality_check', 'completed')),
  ordered_date DATE,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  medium TEXT,
  height NUMERIC(10,2),
  width NUMERIC(10,2),
  depth NUMERIC(10,2),
  dimension_unit TEXT NOT NULL DEFAULT 'cm' CHECK (dimension_unit IN ('cm', 'inches')),
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_code_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT SEQUENCES
-- ============================================================================
CREATE TABLE document_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, prefix, year)
);

-- Document number generation function
CREATE OR REPLACE FUNCTION generate_document_number(p_user_id UUID, p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  INSERT INTO document_sequences (user_id, prefix, year, last_number)
  VALUES (p_user_id, p_prefix, v_year, 1)
  ON CONFLICT (user_id, prefix, year)
  DO UPDATE SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;
  RETURN p_prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SHARE LINKS (high-res image sharing)
-- ============================================================================
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  artwork_ids UUID[] NOT NULL,
  image_types TEXT[] DEFAULT ARRAY['retouched'],
  expiry TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VIEWING ROOMS
-- ============================================================================
CREATE TABLE viewing_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  artwork_ids UUID[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'link_only' CHECK (visibility IN ('public', 'link_only', 'password')),
  password_hash TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  branding JSONB DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EMAIL LOG
-- ============================================================================
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT,
  artwork_ids UUID[],
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  template_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONDITION REPORTS
-- ============================================================================
CREATE TABLE condition_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'damaged')),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_id UUID REFERENCES artwork_movements(id) ON DELETE SET NULL,
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  reported_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INSURANCE RECORDS
-- ============================================================================
CREATE TABLE insurance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  insured_value NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  insurer TEXT,
  policy_number TEXT,
  valid_from DATE,
  valid_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VALUATIONS
-- ============================================================================
CREATE TABLE valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  value NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  appraiser TEXT,
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXHIBITIONS
-- ============================================================================
CREATE TABLE exhibitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  venue TEXT,
  city TEXT,
  country TEXT,
  start_date DATE,
  end_date DATE,
  catalogue_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exhibition_artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exhibition_id, artwork_id)
);

-- ============================================================================
-- LOANS
-- ============================================================================
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  borrower TEXT NOT NULL,
  loan_start DATE NOT NULL,
  loan_end DATE,
  insurance_required BOOLEAN NOT NULL DEFAULT true,
  return_date DATE,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'returned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('framing', 'shipping', 'photography', 'restoration', 'insurance', 'storage', 'other')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PRICE HISTORY
-- ============================================================================
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'CHF', 'GBP')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- REMINDERS
-- ============================================================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('consignment_followup', 'loan_return', 'invoice_overdue', 'task_due')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  trigger_date DATE NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_artworks_user_id ON artworks(user_id);
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_gallery_id ON artworks(gallery_id);
CREATE INDEX idx_artworks_inventory_number ON artworks(inventory_number);
CREATE INDEX idx_artwork_images_artwork_id ON artwork_images(artwork_id);
CREATE INDEX idx_artwork_movements_artwork_id ON artwork_movements(artwork_id);
CREATE INDEX idx_galleries_user_id ON galleries(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_sales_artwork_id ON sales(artwork_id);
CREATE INDEX idx_sales_gallery_id ON sales(gallery_id);
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_deliveries_user_id ON deliveries(user_id);
CREATE INDEX idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX idx_packing_lists_user_id ON packing_lists(user_id);
CREATE INDEX idx_packing_list_items_packing_list_id ON packing_list_items(packing_list_id);
CREATE INDEX idx_production_orders_user_id ON production_orders(user_id);
CREATE INDEX idx_production_order_items_order_id ON production_order_items(production_order_id);
CREATE INDEX idx_certificates_artwork_id ON certificates(artwork_id);
CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_viewing_rooms_slug ON viewing_rooms(slug);
CREATE INDEX idx_email_log_user_id ON email_log(user_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_condition_reports_artwork_id ON condition_reports(artwork_id);
CREATE INDEX idx_insurance_records_artwork_id ON insurance_records(artwork_id);
CREATE INDEX idx_valuations_artwork_id ON valuations(artwork_id);
CREATE INDEX idx_exhibitions_user_id ON exhibitions(user_id);
CREATE INDEX idx_exhibition_artworks_exhibition_id ON exhibition_artworks(exhibition_id);
CREATE INDEX idx_exhibition_artworks_artwork_id ON exhibition_artworks(artwork_id);
CREATE INDEX idx_loans_artwork_id ON loans(artwork_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_expenses_artwork_id ON expenses(artwork_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_price_history_artwork_id ON price_history(artwork_id);
CREATE INDEX idx_wish_list_items_contact_id ON wish_list_items(contact_id);
CREATE INDEX idx_wish_list_items_artwork_id ON wish_list_items(artwork_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_trigger_date ON reminders(trigger_date);
CREATE INDEX idx_reminders_sent ON reminders(sent);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON galleries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON artworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent reference_code from being changed after creation
CREATE OR REPLACE FUNCTION prevent_reference_code_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.reference_code IS NOT NULL AND NEW.reference_code != OLD.reference_code THEN
    RAISE EXCEPTION 'reference_code is immutable and cannot be changed after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_reference_code BEFORE UPDATE ON artworks FOR EACH ROW EXECUTE FUNCTION prevent_reference_code_change();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON packing_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON viewing_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON insurance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON exhibitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibition_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wish_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE user_id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get user's gallery_id (for gallery role)
CREATE OR REPLACE FUNCTION get_user_gallery_id()
RETURNS UUID AS $$
  SELECT gallery_id FROM user_profiles WHERE user_id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to get user's contact_id (for collector role)
CREATE OR REPLACE FUNCTION get_user_contact_id()
RETURNS UUID AS $$
  SELECT contact_id FROM user_profiles WHERE user_id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- ADMIN policies (full access to own rows) ----
-- Apply this pattern to all tables with user_id that only admins manage directly

-- For each admin-managed table, create CRUD policies for admin role
-- Gallery and collector roles get read-only on specific tables

-- user_profiles: users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Admin can manage all profiles" ON user_profiles FOR ALL TO authenticated USING (get_user_role() = 'admin');

-- galleries: admin full CRUD, gallery users can read their own gallery
CREATE POLICY "Admin full access galleries" ON galleries FOR ALL TO authenticated USING (get_user_role() = 'admin' AND user_id = (select auth.uid()));
CREATE POLICY "Gallery user can view own gallery" ON galleries FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND id = get_user_gallery_id());

-- artworks: admin full CRUD, gallery sees consigned artworks, collector sees purchased
CREATE POLICY "Admin full access artworks" ON artworks FOR ALL TO authenticated USING (get_user_role() = 'admin' AND user_id = (select auth.uid()));
CREATE POLICY "Gallery sees consigned artworks" ON artworks FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND gallery_id = get_user_gallery_id() AND status = 'on_consignment');
CREATE POLICY "Collector sees purchased artworks" ON artworks FOR SELECT TO authenticated USING (get_user_role() = 'collector' AND id IN (SELECT artwork_id FROM sales WHERE contact_id = get_user_contact_id()));

-- artwork_images: follows artwork access
CREATE POLICY "Admin full access artwork_images" ON artwork_images FOR ALL TO authenticated USING (get_user_role() = 'admin' AND user_id = (select auth.uid()));
CREATE POLICY "Gallery can view artwork images" ON artwork_images FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND artwork_id IN (SELECT id FROM artworks WHERE gallery_id = get_user_gallery_id()));
CREATE POLICY "Collector can view own artwork images" ON artwork_images FOR SELECT TO authenticated USING (get_user_role() = 'collector' AND artwork_id IN (SELECT artwork_id FROM sales WHERE contact_id = get_user_contact_id()));

-- For remaining admin-only tables, use a simple pattern:
-- Admin can do everything on their own rows

-- Create a macro-like approach for admin-only tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN VALUES ('artwork_movements'), ('contacts'), ('interactions'), ('deals'), ('tasks'),
    ('sales'), ('invoices'), ('invoice_items'), ('deliveries'), ('delivery_items'),
    ('packing_lists'), ('packing_list_items'), ('production_orders'), ('production_order_items'),
    ('certificates'), ('document_sequences'), ('share_links'), ('viewing_rooms'), ('email_log'),
    ('condition_reports'), ('insurance_records'), ('valuations'), ('exhibitions'), ('exhibition_artworks'),
    ('loans'), ('expenses'), ('price_history'), ('wish_list_items'),
    ('activity_log'), ('reminders')
  LOOP
    EXECUTE format(
      'CREATE POLICY "Admin full access %1$s" ON %1$s FOR ALL TO authenticated USING (get_user_role() = ''admin'' AND user_id = (select auth.uid()))',
      tbl
    );
  END LOOP;
END $$;

-- Gallery users can view deliveries and sales for their gallery
CREATE POLICY "Gallery sees own deliveries" ON deliveries FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND gallery_id = get_user_gallery_id());
CREATE POLICY "Gallery sees own sales" ON sales FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND gallery_id = get_user_gallery_id());

-- Collector users can view their certificates
CREATE POLICY "Collector sees own certificates" ON certificates FOR SELECT TO authenticated USING (get_user_role() = 'collector' AND artwork_id IN (SELECT artwork_id FROM sales WHERE contact_id = get_user_contact_id()));

-- Public access for share_links is handled ONLY via RPC functions
-- (get_share_link_by_token, increment_share_link_download).
-- No direct anon SELECT policy — prevents enumeration of all share links.

-- Public access for viewing_rooms (by slug, check visibility)
CREATE POLICY "Public can view published viewing rooms" ON viewing_rooms FOR SELECT TO anon USING (published = true AND visibility IN ('public', 'link_only'));

-- ============================================================================
-- STORAGE BUCKETS (run in Supabase Dashboard or via API)
-- ============================================================================
-- Create these buckets manually in Supabase Storage:
-- 1. artwork-images (private)
-- 2. assets (private)

-- Storage RLS for artwork-images & media-files
-- See migration: 20260315100000_storage_bucket_policies.sql
-- artwork-images: admin upload only, file type restricted to jpg/jpeg/png/webp
-- media-files: admin + gallery upload, admin delete
-- Both: authenticated read access; artwork-images also allows anon read (share links)

-- ============================================================================
-- SALE REQUESTS (gallery marks artwork as sold, admin approves)
-- ============================================================================
CREATE TABLE sale_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  realized_price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  buyer_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sale_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to sale_requests" ON sale_requests FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Gallery can insert own sale_requests" ON sale_requests FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'gallery' AND gallery_id = get_user_gallery_id());
CREATE POLICY "Gallery can view own sale_requests" ON sale_requests FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND gallery_id = get_user_gallery_id());

-- ============================================================================
-- MEDIA FILES (shared file library)
-- ============================================================================
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN (
    'press', 'videos', 'photos', 'texts', 'interviews', 'social_media',
    'portrait', 'cv', 'technical_docs', 'instruction_manuals', 'catalogues', 'publications'
  )),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'rejected')),
  submitted_by_gallery UUID REFERENCES galleries(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to media_files" ON media_files FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Gallery can view published media_files" ON media_files FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND (status = 'published' OR submitted_by_gallery = get_user_gallery_id()));
CREATE POLICY "Gallery can insert media_files" ON media_files FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'gallery' AND submitted_by_gallery = get_user_gallery_id());

-- ============================================================================
-- CV ENTRIES (structured curriculum vitae)
-- ============================================================================
CREATE TABLE cv_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER,
  category TEXT NOT NULL CHECK (category IN (
    'education', 'solo_exhibition', 'group_exhibition', 'award',
    'publication', 'residency', 'collection', 'other'
  )),
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cv_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to cv_entries" ON cv_entries FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Anyone can view cv_entries" ON cv_entries FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- NEWS POSTS (internal newsletter)
-- ============================================================================
CREATE TABLE news_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  external_link TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to news_posts" ON news_posts FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Gallery can view published news" ON news_posts FOR SELECT TO authenticated USING (get_user_role() = 'gallery' AND published = true);

-- News read status tracking
CREATE TABLE news_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id UUID NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(news_id, user_id)
);

ALTER TABLE news_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own read status" ON news_read_status FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Additional storage buckets:
-- 3. media-files (private) -- for Media Library uploads
-- ============================================================================

-- Update artworks status CHECK to include new statuses:
-- ALTER TABLE artworks DROP CONSTRAINT artworks_status_check;
-- ALTER TABLE artworks ADD CONSTRAINT artworks_status_check
--   CHECK (status IN ('available','sold','reserved','in_production','in_transit','on_consignment','paid','pending_sale'));

-- ============================================================================
-- PROJECTS (scheduling & planning)
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  color TEXT DEFAULT 'rose',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL TO authenticated USING (user_id = (select auth.uid()));

-- ============================================================================
-- LINKING: Exhibitions & Projects → Galleries, Contacts
-- ============================================================================

-- Add gallery_id + contact_id to exhibitions
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS budget_currency TEXT;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Add gallery_id + contact_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================================================
-- JUNCTION: Exhibition ↔ Production Orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS exhibition_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exhibition_id, production_order_id)
);

ALTER TABLE exhibition_production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exhibition_production_orders"
  ON exhibition_production_orders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- JUNCTION: Project ↔ Artworks
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, artwork_id)
);

ALTER TABLE project_artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project_artworks"
  ON project_artworks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- JUNCTION: Project ↔ Production Orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, production_order_id)
);

ALTER TABLE project_production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project_production_orders"
  ON project_production_orders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- MISSING TABLES: auction_alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS auction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT,
  artwork_title TEXT,
  auction_house TEXT,
  sale_date DATE,
  lot_number TEXT,
  estimate_low NUMERIC(12,2),
  estimate_high NUMERIC(12,2),
  realized_price NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  result TEXT CHECK (result IN ('sold', 'bought_in', 'withdrawn', 'pending')),
  matched_artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  matched_gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auction_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own auction_alerts" ON auction_alerts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MISSING TABLES: enquiries
-- ============================================================================
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'website',
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  subject TEXT,
  body TEXT,
  interest_description TEXT,
  interested_artwork_ids UUID[] DEFAULT '{}',
  location_city TEXT,
  location_country TEXT,
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'converted', 'archived')),
  converted_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  converted_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enquiries" ON enquiries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MISSING TABLES: exhibition_galleries (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exhibition_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exhibition_id, gallery_id)
);

ALTER TABLE exhibition_galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exhibition_galleries" ON exhibition_galleries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MISSING TABLES: gallery_forwarding_orders + items
-- ============================================================================
CREATE TABLE IF NOT EXISTS gallery_forwarding_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  to_gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  notes TEXT,
  shipping_method TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_forwarding_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gallery_forwarding_orders" ON gallery_forwarding_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS gallery_forwarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forwarding_order_id UUID NOT NULL REFERENCES gallery_forwarding_orders(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_forwarding_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gallery_forwarding_items" ON gallery_forwarding_items
  FOR ALL TO authenticated
  USING (forwarding_order_id IN (SELECT id FROM gallery_forwarding_orders WHERE user_id = auth.uid()))
  WITH CHECK (forwarding_order_id IN (SELECT id FROM gallery_forwarding_orders WHERE user_id = auth.uid()));

-- ============================================================================
-- MISSING TABLES: gallery_team_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS gallery_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gallery_team_members" ON gallery_team_members
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MISSING TABLES: public_collections
-- ============================================================================
CREATE TABLE IF NOT EXISTS public_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  artwork_ids UUID[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own public_collections" ON public_collections
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view published collections" ON public_collections
  FOR SELECT TO anon USING (published = true);

-- ============================================================================
-- MISSING TABLES: viewing_room_views
-- ============================================================================
CREATE TABLE IF NOT EXISTS viewing_room_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_room_id UUID NOT NULL REFERENCES viewing_rooms(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE viewing_room_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view viewing_room_views" ON viewing_room_views
  FOR SELECT TO authenticated USING (
    viewing_room_id IN (SELECT id FROM viewing_rooms WHERE user_id = auth.uid())
  );
-- INSERT is handled via rate-limited RPC: record_viewing_room_view()
-- No direct INSERT policies — prevents anonymous flood attacks.

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
