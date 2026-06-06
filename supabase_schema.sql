-- SQL to update Supabase schema for Arzoni App
-- [ignoring loop detection]

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS admin_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO admin_emails (email) VALUES 
('khazratkulovshokhzod@gmail.com'),
('abdullayevamuborak548@gmail.com')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on admin_emails" ON admin_emails;
CREATE POLICY "Allow public read access on admin_emails" ON admin_emails FOR SELECT USING (true);

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
  avg_rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
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
  price_per_pax NUMERIC,
  service_tax NUMERIC,
  device_id TEXT,
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='avg_rating') THEN
    ALTER TABLE listings ADD COLUMN avg_rating NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='review_count') THEN
    ALTER TABLE listings ADD COLUMN review_count INTEGER DEFAULT 0;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='device_id') THEN
    ALTER TABLE reviews ADD COLUMN device_id TEXT;
  END IF;
END $$;

-- Add index on reviews(device_id) for rate-limiting queries
CREATE INDEX IF NOT EXISTS idx_reviews_device_id ON reviews(device_id);

-- 3. Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Listings Policies
DROP POLICY IF EXISTS "Allow public read access on listings" ON listings;
CREATE POLICY "Allow public read access on listings" ON listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert listings" ON listings;
CREATE POLICY "Allow authenticated to insert listings" ON listings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update listings" ON listings;
CREATE POLICY "Allow authenticated to update listings" ON listings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete listings" ON listings;
CREATE POLICY "Allow admin to delete listings" ON listings FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- 4. Trigger for Admin Fields
CREATE OR REPLACE FUNCTION protect_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (SELECT EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )) THEN
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

DROP POLICY IF EXISTS "Allow authenticated to insert reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public to insert reviews" ON reviews;
CREATE POLICY "Allow public to insert reviews" ON reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update reviews" ON reviews;
CREATE POLICY "Allow authenticated to update reviews" ON reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete reviews" ON reviews;
CREATE POLICY "Allow admin to delete reviews" ON reviews FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- 6. Banners Policies
DROP POLICY IF EXISTS "Allow public read access on banners" ON banners;
CREATE POLICY "Allow public read access on banners" ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin to insert banners" ON banners;
CREATE POLICY "Allow admin to insert banners" ON banners FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

DROP POLICY IF EXISTS "Allow admin to update banners" ON banners;
CREATE POLICY "Allow admin to update banners" ON banners FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

DROP POLICY IF EXISTS "Allow admin to delete banners" ON banners;
CREATE POLICY "Allow admin to delete banners" ON banners FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- 7. Storage Setup & Policies
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-photos', 'restaurant-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to restaurant-photos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-photos');

-- Allow authenticated users to upload to restaurant-photos
DROP POLICY IF EXISTS "Authenticated can upload" ON storage.objects;
CREATE POLICY "Authenticated can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'restaurant-photos');

-- Allow admins full control
DROP POLICY IF EXISTS "Admin Manage" ON storage.objects;
CREATE POLICY "Admin Manage" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'restaurant-photos' AND 
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
)
WITH CHECK (
  bucket_id = 'restaurant-photos' AND 
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- SCHEMA ADDITION: Missing tables added 2026-06-06

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS dish_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('food', 'clothes')),
  emoji TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dish_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concept_id UUID REFERENCES dish_concepts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dish_aliases_concept_id_name_language_code_key UNIQUE (concept_id, name, language_code)
);

CREATE TABLE IF NOT EXISTS review_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL CHECK (language_code IN ('uz', 'ru', 'en')),
  title TEXT,
  text TEXT,
  is_original BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT review_translations_review_id_language_code_key UNIQUE (review_id, language_code)
);

-- 2. Security (RLS)
ALTER TABLE dish_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_translations ENABLE ROW LEVEL SECURITY;

-- dish_concepts Policies
DROP POLICY IF EXISTS "Allow public read access on dish_concepts" ON dish_concepts;
CREATE POLICY "Allow public read access on dish_concepts" ON dish_concepts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert dish_concepts" ON dish_concepts;
CREATE POLICY "Allow authenticated to insert dish_concepts" ON dish_concepts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete dish_concepts" ON dish_concepts;
CREATE POLICY "Allow admin to delete dish_concepts" ON dish_concepts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- dish_aliases Policies
DROP POLICY IF EXISTS "Allow public read access on dish_aliases" ON dish_aliases;
CREATE POLICY "Allow public read access on dish_aliases" ON dish_aliases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert dish_aliases" ON dish_aliases;
CREATE POLICY "Allow authenticated to insert dish_aliases" ON dish_aliases FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete dish_aliases" ON dish_aliases;
CREATE POLICY "Allow admin to delete dish_aliases" ON dish_aliases FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- review_translations Policies
DROP POLICY IF EXISTS "Allow public read access on review_translations" ON review_translations;
CREATE POLICY "Allow public read access on review_translations" ON review_translations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated to insert review_translations" ON review_translations;
CREATE POLICY "Allow authenticated to insert review_translations" ON review_translations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated to update review_translations" ON review_translations;
CREATE POLICY "Allow authenticated to update review_translations" ON review_translations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to delete review_translations" ON review_translations;
CREATE POLICY "Allow admin to delete review_translations" ON review_translations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_emails 
    WHERE email = LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')))
  )
);

-- 8. Statistics Trigger for Listings
CREATE OR REPLACE FUNCTION update_listing_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_old UUID := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.listing_id END;
  v_new UUID := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.listing_id END;
BEGIN
  IF v_old IS NOT NULL THEN
    UPDATE listings SET 
      avg_price = (SELECT COALESCE(AVG(price_paid), 0) FROM reviews WHERE listing_id = v_old),
      avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = v_old),
      review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = v_old)
    WHERE id = v_old;
  END IF;
  IF v_new IS NOT NULL AND v_new IS DISTINCT FROM v_old THEN
    UPDATE listings SET 
      avg_price = (SELECT COALESCE(AVG(price_paid), 0) FROM reviews WHERE listing_id = v_new),
      avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = v_new),
      review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = v_new)
    WHERE id = v_new;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_listing_stats ON reviews;
CREATE TRIGGER tr_update_listing_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_listing_stats();

-- 9. RPC Functions for incrementing review likes and dislikes
CREATE OR REPLACE FUNCTION increment_review_likes(review_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_review_dislikes(review_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET dislikes = COALESCE(dislikes, 0) + 1
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_review_likes(UUID) TO public;
GRANT EXECUTE ON FUNCTION increment_review_dislikes(UUID) TO public;

