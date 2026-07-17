CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('KG', 'Meter', 'PCS', 'Pair', 'Roll', 'Packet', 'GSM', 'Litre', 'Box');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE size_type AS ENUM ('S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE material_category AS ENUM ('Fabric', 'Thread', 'Elastic', 'Zip', 'Button', 'Label', 'Rib', 'Printing', 'Packing', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lot_status AS ENUM ('Active', 'Completed', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE material_status AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE history_action AS ENUM ('Create', 'Edit', 'Delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'StitchFlow Garments',
  default_unit unit_type NOT NULL DEFAULT 'KG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_app_settings" ON app_settings;
CREATE POLICY "anon_delete_app_settings" ON app_settings FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS fabrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit unit_type NOT NULL DEFAULT 'KG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fabrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fabrics" ON fabrics;
CREATE POLICY "anon_select_fabrics" ON fabrics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fabrics" ON fabrics;
CREATE POLICY "anon_insert_fabrics" ON fabrics FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fabrics" ON fabrics;
CREATE POLICY "anon_update_fabrics" ON fabrics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fabrics" ON fabrics;
CREATE POLICY "anon_delete_fabrics" ON fabrics FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS fabric_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_id uuid NOT NULL REFERENCES fabrics(id) ON DELETE CASCADE,
  name text NOT NULL,
  rolls integer NOT NULL DEFAULT 0 CHECK (rolls >= 0),
  stock numeric(10,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  used numeric(10,3) NOT NULL DEFAULT 0 CHECK (used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fabric_colors_fabric_id ON fabric_colors(fabric_id);
ALTER TABLE fabric_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_fabric_colors" ON fabric_colors;
CREATE POLICY "anon_select_fabric_colors" ON fabric_colors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fabric_colors" ON fabric_colors;
CREATE POLICY "anon_insert_fabric_colors" ON fabric_colors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fabric_colors" ON fabric_colors;
CREATE POLICY "anon_update_fabric_colors" ON fabric_colors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fabric_colors" ON fabric_colors;
CREATE POLICY "anon_delete_fabric_colors" ON fabric_colors FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category material_category NOT NULL,
  unit unit_type NOT NULL DEFAULT 'KG',
  purchase_price numeric(12,4) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  supplier text NOT NULL DEFAULT '',
  gst numeric(5,2) NOT NULL DEFAULT 0 CHECK (gst >= 0),
  status material_status NOT NULL DEFAULT 'Active',
  remarks text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_raw_materials" ON raw_materials;
CREATE POLICY "anon_select_raw_materials" ON raw_materials FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_raw_materials" ON raw_materials;
CREATE POLICY "anon_insert_raw_materials" ON raw_materials FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_raw_materials" ON raw_materials;
CREATE POLICY "anon_update_raw_materials" ON raw_materials FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_raw_materials" ON raw_materials;
CREATE POLICY "anon_delete_raw_materials" ON raw_materials FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  fabric_id uuid NOT NULL REFERENCES fabrics(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_fabric_id ON articles(fabric_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_code ON articles(code);
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_articles" ON articles;
CREATE POLICY "anon_select_articles" ON articles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_articles" ON articles;
CREATE POLICY "anon_insert_articles" ON articles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_articles" ON articles;
CREATE POLICY "anon_update_articles" ON articles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_articles" ON articles;
CREATE POLICY "anon_delete_articles" ON articles FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS article_size_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  size size_type NOT NULL,
  consumption numeric(8,4) NOT NULL DEFAULT 0 CHECK (consumption >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, size)
);
CREATE INDEX IF NOT EXISTS idx_asc_article_id ON article_size_consumption(article_id);
ALTER TABLE article_size_consumption ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_article_size_consumption" ON article_size_consumption;
CREATE POLICY "anon_select_article_size_consumption" ON article_size_consumption FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_article_size_consumption" ON article_size_consumption;
CREATE POLICY "anon_insert_article_size_consumption" ON article_size_consumption FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_article_size_consumption" ON article_size_consumption;
CREATE POLICY "anon_update_article_size_consumption" ON article_size_consumption FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_article_size_consumption" ON article_size_consumption;
CREATE POLICY "anon_delete_article_size_consumption" ON article_size_consumption FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS article_material_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  consumption numeric(12,4) NOT NULL DEFAULT 0 CHECK (consumption >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_amc_article_id ON article_material_consumption(article_id);
CREATE INDEX IF NOT EXISTS idx_amc_material_id ON article_material_consumption(material_id);
ALTER TABLE article_material_consumption ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_article_material_consumption" ON article_material_consumption;
CREATE POLICY "anon_select_article_material_consumption" ON article_material_consumption FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_article_material_consumption" ON article_material_consumption;
CREATE POLICY "anon_insert_article_material_consumption" ON article_material_consumption FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_article_material_consumption" ON article_material_consumption;
CREATE POLICY "anon_update_article_material_consumption" ON article_material_consumption FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_article_material_consumption" ON article_material_consumption;
CREATE POLICY "anon_delete_article_material_consumption" ON article_material_consumption FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action history_action NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_events_created_at ON history_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_events_module ON history_events(module);
ALTER TABLE history_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_history_events" ON history_events;
CREATE POLICY "anon_select_history_events" ON history_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_history_events" ON history_events;
CREATE POLICY "anon_insert_history_events" ON history_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_history_events" ON history_events;
CREATE POLICY "anon_delete_history_events" ON history_events FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ 
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['app_settings','fabrics','fabric_colors','raw_materials','articles','article_size_consumption','article_material_consumption']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl);
  END LOOP;
END $$;

INSERT INTO app_settings (company_name, default_unit)
SELECT 'StitchFlow Garments', 'KG'
WHERE NOT EXISTS (SELECT 1 FROM app_settings);
