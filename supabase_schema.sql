-- SQL to update Supabase schema for Arzoni App
-- [ignoring loop detection]

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('food', 'clothes')),
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  working_hours TEXT,
  is_sponsored BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  photo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  description TEXT,
  dishes TEXT[] DEFAULT '{}',
  avg_price NUMERIC DEFAULT 0,
  phone TEXT,
  social_link TEXT,
  google_maps_url TEXT,
  google_place_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  price_paid NUMERIC NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visit_date DATE,
  price_feeling TEXT CHECK (price_feeling IN ('cheap', 'fair', 'expensive')),
  portion_size TEXT CHECK (portion_size IN ('small', 'normal', 'big')),
  title TEXT,
  text TEXT,
  tags TEXT[] DEFAULT '{}',
  submitter_name TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  languages TEXT[] DEFAULT '{"uz", "ru", "en"}',
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  category TEXT CHECK (category IN ('food', 'clothes')),
  image_url TEXT,
  image_url_uz TEXT,
  image_url_ru TEXT,
  image_url_en TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns to existing tables
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='phone') THEN
    ALTER TABLE listings ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='social_link') THEN
    ALTER TABLE listings ADD COLUMN social_link TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='google_maps_url') THEN
    ALTER TABLE listings ADD COLUMN google_maps_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='avg_price') THEN
    ALTER TABLE listings ADD COLUMN avg_price NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='dishes') THEN
    ALTER TABLE listings ADD COLUMN dishes TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='price_per_pax') THEN
    ALTER TABLE reviews ADD COLUMN price_per_pax NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='service_tax') THEN
    ALTER TABLE reviews ADD COLUMN service_tax NUMERIC;
  END IF;
END $$;

-- 3. Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Listings Policies
DROP POLICY IF EXISTS "Allow public read access on listings" ON listings;
CREATE POLICY "Allow public read access on listings" ON listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert listings" ON listings;
CREATE POLICY "Allow authenticated to insert listings" ON listings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to update listings" ON listings;
CREATE POLICY "Allow authenticated to update listings" ON listings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete listings" ON listings;
CREATE POLICY "Allow admin to delete listings" ON listings FOR DELETE USING (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);

-- 4. Trigger for Admin Fields
CREATE OR REPLACE FUNCTION protect_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) NOT IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')) THEN
    IF (TG_OP = 'UPDATE') THEN
      NEW.is_sponsored = OLD.is_sponsored;
      NEW.is_verified = OLD.is_verified;
    ELSIF (TG_OP = 'INSERT') THEN
      NEW.is_sponsored = false;
      NEW.is_verified = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_admin_fields ON listings;
CREATE TRIGGER tr_protect_admin_fields
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION protect_admin_fields();

-- 5. Reviews Policies
DROP POLICY IF EXISTS "Allow public read access on reviews" ON reviews;
CREATE POLICY "Allow public read access on reviews" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert reviews" ON reviews;
CREATE POLICY "Allow authenticated to insert reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to update reviews" ON reviews;
CREATE POLICY "Allow authenticated to update reviews" ON reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete reviews" ON reviews;
CREATE POLICY "Allow admin to delete reviews" ON reviews FOR DELETE USING (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);

-- 6. Banners Policies
DROP POLICY IF EXISTS "Allow public read access on banners" ON banners;
CREATE POLICY "Allow public read access on banners" ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to insert banners" ON banners;
CREATE POLICY "Allow admin to insert banners" ON banners FOR INSERT WITH CHECK (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);

DROP POLICY IF EXISTS "Allow admin to update banners" ON banners;
CREATE POLICY "Allow admin to update banners" ON banners FOR UPDATE USING (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
) WITH CHECK (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);

DROP POLICY IF EXISTS "Allow admin to delete banners" ON banners;
CREATE POLICY "Allow admin to delete banners" ON banners FOR DELETE USING (
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);

-- 7. Storage Policies
-- Allow public read access to restaurant-photos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-photos');

-- Allow authenticated users to upload to restaurant-photos
DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
CREATE POLICY "Authenticated can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant-photos');

-- Allow admins full control
DROP POLICY IF EXISTS "Admin Manage" ON storage.objects;
CREATE POLICY "Admin Manage" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'restaurant-photos' AND 
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
)
WITH CHECK (
  bucket_id = 'restaurant-photos' AND 
  LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', ''))) IN ('khazratkulovshokhzod@gmail.com', 'abdullayevamuborak548@gmail.com')
);
