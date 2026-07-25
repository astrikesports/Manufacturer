-- Fix stitching_entries and stitching_color_sizes to match the rest of the
-- production schema: UUID PKs with gen_random_uuid() defaults, proper FK
-- references to lots/cutting_entries/fabric_colors, updated_at columns, and
-- the same RLS policy shape as finishing_entries / finishing_color_sizes.
--
-- The previous migration created these tables with text PKs and no FKs, which
-- is why the app's stch_xxx IDs were accepted by the DB but rejected by
-- PostgREST when foreign-key expectations did not line up.

DROP POLICY IF EXISTS "anon_delete_stitching_cs" ON stitching_color_sizes;
DROP POLICY IF EXISTS "anon_update_stitching_cs" ON stitching_color_sizes;
DROP POLICY IF EXISTS "anon_insert_stitching_cs" ON stitching_color_sizes;
DROP POLICY IF EXISTS "anon_select_stitching_cs" ON stitching_color_sizes;
ALTER TABLE stitching_color_sizes DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS stitching_color_sizes CASCADE;

DROP POLICY IF EXISTS "anon_delete_stitching_entries" ON stitching_entries;
DROP POLICY IF EXISTS "anon_update_stitching_entries" ON stitching_entries;
DROP POLICY IF EXISTS "anon_insert_stitching_entries" ON stitching_entries;
DROP POLICY IF EXISTS "anon_select_stitching_entries" ON stitching_entries;
ALTER TABLE stitching_entries DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS stitching_entries CASCADE;

CREATE TABLE stitching_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  cutting_id uuid REFERENCES cutting_entries(id) ON DELETE SET NULL,
  date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stitching_entries_lot_id ON stitching_entries(lot_id);
ALTER TABLE stitching_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_stitching_entries" ON stitching_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_stitching_entries" ON stitching_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_stitching_entries" ON stitching_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_stitching_entries" ON stitching_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE stitching_color_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stitching_id uuid NOT NULL REFERENCES stitching_entries(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  size size_type NOT NULL,
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stitching_color_sizes_stitching_id ON stitching_color_sizes(stitching_id);
CREATE INDEX idx_stitching_color_sizes_color_id ON stitching_color_sizes(color_id);
ALTER TABLE stitching_color_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_stitching_cs" ON stitching_color_sizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_stitching_cs" ON stitching_color_sizes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_stitching_cs" ON stitching_color_sizes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_stitching_cs" ON stitching_color_sizes FOR DELETE TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS trg_updated_at ON stitching_entries;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON stitching_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

NOTIFY pgrst, 'reload schema';