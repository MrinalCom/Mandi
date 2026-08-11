CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin');
CREATE TYPE listing_status AS ENUM ('active', 'pooled', 'sold', 'expired', 'cancelled');
CREATE TYPE pool_status AS ENUM ('open', 'filled', 'closed');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'picked_up', 'delivered', 'paid_out', 'cancelled');
CREATE TYPE payment_status AS ENUM ('escrow_held', 'released', 'refunded');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'buyer',
  village TEXT,
  district TEXT,
  state TEXT,
  language_pref TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily price board, shaped like data.gov.in's Agmarknet "Variety-wise Daily Market
-- Prices" dataset (resource id 9ef84268-d588-465a-a308-a864a43d0070) so the seeded
-- rows here can later be replaced by a live sync job without changing the schema.
-- Prices are per quintal (100kg), matching how Agmarknet publishes them.
CREATE TABLE mandi_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name TEXT NOT NULL,
  mandi_name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  min_price NUMERIC(10,2) NOT NULL,
  max_price NUMERIC(10,2) NOT NULL,
  modal_price NUMERIC(10,2) NOT NULL,
  price_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mandi_prices_crop_date ON mandi_prices (crop_name, price_date DESC);

CREATE TABLE pool_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name TEXT NOT NULL,
  mandi_zone TEXT NOT NULL,
  price_per_kg NUMERIC(10,2) NOT NULL,
  target_quantity_kg NUMERIC(10,2) NOT NULL,
  current_quantity_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  status pool_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg > 0),
  price_per_kg NUMERIC(10,2) NOT NULL CHECK (price_per_kg > 0),
  quality_grade TEXT NOT NULL DEFAULT 'A',
  harvest_date DATE,
  photo_url TEXT,
  village TEXT,
  district TEXT,
  state TEXT,
  status listing_status NOT NULL DEFAULT 'active',
  pool_group_id UUID REFERENCES pool_groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_crop ON listings (crop_name);

CREATE TABLE pool_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_group_id UUID NOT NULL REFERENCES pool_groups(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  pool_group_id UUID REFERENCES pool_groups(id),
  quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'escrow_held',
  pickup_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_has_source CHECK (listing_id IS NOT NULL OR pool_group_id IS NOT NULL)
);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeded reference prices (last 4 days, a handful of major mandis/crops) so the
-- price board and farmer dashboard have real-shaped data out of the box.
INSERT INTO mandi_prices (crop_name, mandi_name, district, state, min_price, max_price, modal_price, price_date) VALUES
  ('Tomato', 'Azadpur Mandi', 'North Delhi', 'Delhi', 800, 1400, 1100, CURRENT_DATE),
  ('Tomato', 'Vashi APMC', 'Thane', 'Maharashtra', 700, 1300, 1000, CURRENT_DATE),
  ('Tomato', 'Koyambedu Market', 'Chennai', 'Tamil Nadu', 900, 1500, 1200, CURRENT_DATE),
  ('Onion', 'Lasalgaon Mandi', 'Nashik', 'Maharashtra', 1200, 2000, 1600, CURRENT_DATE),
  ('Onion', 'Azadpur Mandi', 'North Delhi', 'Delhi', 1300, 2100, 1700, CURRENT_DATE),
  ('Potato', 'Agra Mandi', 'Agra', 'Uttar Pradesh', 600, 1000, 800, CURRENT_DATE),
  ('Potato', 'Azadpur Mandi', 'North Delhi', 'Delhi', 650, 1050, 850, CURRENT_DATE),
  ('Okra', 'Koyambedu Market', 'Chennai', 'Tamil Nadu', 1500, 2500, 2000, CURRENT_DATE),
  ('Cauliflower', 'Ghazipur Mandi', 'East Delhi', 'Delhi', 700, 1300, 1000, CURRENT_DATE),
  ('Wheat', 'Indore Mandi', 'Indore', 'Madhya Pradesh', 2100, 2400, 2250, CURRENT_DATE),
  ('Rice', 'Karnal Mandi', 'Karnal', 'Haryana', 2500, 3000, 2750, CURRENT_DATE),
  ('Banana', 'Vashi APMC', 'Thane', 'Maharashtra', 900, 1500, 1200, CURRENT_DATE),
  ('Mango', 'Koyambedu Market', 'Chennai', 'Tamil Nadu', 2500, 4500, 3500, CURRENT_DATE),
  ('Tomato', 'Azadpur Mandi', 'North Delhi', 'Delhi', 750, 1350, 1050, CURRENT_DATE - INTERVAL '1 day'),
  ('Tomato', 'Vashi APMC', 'Thane', 'Maharashtra', 650, 1250, 950, CURRENT_DATE - INTERVAL '1 day'),
  ('Onion', 'Lasalgaon Mandi', 'Nashik', 'Maharashtra', 1150, 1950, 1550, CURRENT_DATE - INTERVAL '1 day'),
  ('Potato', 'Agra Mandi', 'Agra', 'Uttar Pradesh', 580, 980, 780, CURRENT_DATE - INTERVAL '1 day'),
  ('Wheat', 'Indore Mandi', 'Indore', 'Madhya Pradesh', 2080, 2380, 2230, CURRENT_DATE - INTERVAL '1 day'),
  ('Tomato', 'Azadpur Mandi', 'North Delhi', 'Delhi', 820, 1420, 1120, CURRENT_DATE - INTERVAL '2 days'),
  ('Onion', 'Azadpur Mandi', 'North Delhi', 'Delhi', 1280, 2080, 1680, CURRENT_DATE - INTERVAL '2 days'),
  ('Potato', 'Azadpur Mandi', 'North Delhi', 'Delhi', 640, 1040, 840, CURRENT_DATE - INTERVAL '2 days'),
  ('Rice', 'Karnal Mandi', 'Karnal', 'Haryana', 2480, 2980, 2730, CURRENT_DATE - INTERVAL '2 days'),
  ('Mango', 'Koyambedu Market', 'Chennai', 'Tamil Nadu', 2400, 4400, 3400, CURRENT_DATE - INTERVAL '3 days'),
  ('Cauliflower', 'Ghazipur Mandi', 'East Delhi', 'Delhi', 680, 1280, 980, CURRENT_DATE - INTERVAL '3 days');
