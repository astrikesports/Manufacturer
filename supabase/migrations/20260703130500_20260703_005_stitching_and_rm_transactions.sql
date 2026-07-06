/*
# Add Stitching Stage and Raw Material Inventory Transactions

## Changes

### New Tables
1. `stitching_entries` - New production stage between cutting and finishing
   - id, lot_id, cutting_id, date, notes, created_at
2. `stitching_color_sizes` - Color/size breakdown for stitching entries
   - id, stitching_id, color_id, size, qty
3. `raw_material_transactions` - Stock transaction ledger for raw materials
   - id, material_id, type (Opening/Purchase/Issue/Return/Adjustment), qty, notes, date, created_at

### Column Additions
- `raw_materials.opening_stock` - Initial stock quantity
- `raw_materials.current_stock` - Computed current stock (managed via transactions)
- `raw_materials.min_stock` - Minimum stock alert threshold

### Security
- RLS enabled on all new tables
- anon + authenticated access (single-tenant no-auth app)
*/

-- ── Stitching Entries ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stitching_entries (
  id text PRIMARY KEY,
  lot_id text NOT NULL,
  cutting_id text,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stitching_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stitching_entries" ON stitching_entries;
CREATE POLICY "anon_select_stitching_entries" ON stitching_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stitching_entries" ON stitching_entries;
CREATE POLICY "anon_insert_stitching_entries" ON stitching_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stitching_entries" ON stitching_entries;
CREATE POLICY "anon_update_stitching_entries" ON stitching_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stitching_entries" ON stitching_entries;
CREATE POLICY "anon_delete_stitching_entries" ON stitching_entries FOR DELETE TO anon, authenticated USING (true);

-- ── Stitching Color Sizes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stitching_color_sizes (
  id bigserial PRIMARY KEY,
  stitching_id text NOT NULL REFERENCES stitching_entries(id) ON DELETE CASCADE,
  color_id text NOT NULL,
  size text NOT NULL,
  qty integer NOT NULL DEFAULT 0
);

ALTER TABLE stitching_color_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stitching_cs" ON stitching_color_sizes;
CREATE POLICY "anon_select_stitching_cs" ON stitching_color_sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_stitching_cs" ON stitching_color_sizes;
CREATE POLICY "anon_insert_stitching_cs" ON stitching_color_sizes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_stitching_cs" ON stitching_color_sizes;
CREATE POLICY "anon_update_stitching_cs" ON stitching_color_sizes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_stitching_cs" ON stitching_color_sizes;
CREATE POLICY "anon_delete_stitching_cs" ON stitching_color_sizes FOR DELETE TO anon, authenticated USING (true);

-- ── Raw Material Transactions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS raw_material_transactions (
  id text PRIMARY KEY,
  material_id text NOT NULL,
  type text NOT NULL DEFAULT 'Purchase',
  qty numeric(12,4) NOT NULL DEFAULT 0,
  notes text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE raw_material_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rm_transactions" ON raw_material_transactions;
CREATE POLICY "anon_select_rm_transactions" ON raw_material_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rm_transactions" ON raw_material_transactions;
CREATE POLICY "anon_insert_rm_transactions" ON raw_material_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rm_transactions" ON raw_material_transactions;
CREATE POLICY "anon_update_rm_transactions" ON raw_material_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rm_transactions" ON raw_material_transactions;
CREATE POLICY "anon_delete_rm_transactions" ON raw_material_transactions FOR DELETE TO anon, authenticated USING (true);

-- ── Additional columns on raw_materials ─────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raw_materials' AND column_name='opening_stock') THEN
    ALTER TABLE raw_materials ADD COLUMN opening_stock numeric(12,4) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raw_materials' AND column_name='current_stock') THEN
    ALTER TABLE raw_materials ADD COLUMN current_stock numeric(12,4) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raw_materials' AND column_name='min_stock') THEN
    ALTER TABLE raw_materials ADD COLUMN min_stock numeric(12,4) NOT NULL DEFAULT 0;
  END IF;
END $$;
