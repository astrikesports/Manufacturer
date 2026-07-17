ALTER TABLE packing_entries ADD COLUMN IF NOT EXISTS pcs_per_box integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS cut_pcs_entries (
  id          text PRIMARY KEY,
  lot_id      text NOT NULL,
  packing_id  text,
  color_id    text NOT NULL,
  size        text NOT NULL,
  left_pcs    integer NOT NULL DEFAULT 0,
  date        date NOT NULL,
  status      text NOT NULL DEFAULT 'Available',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE cut_pcs_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cut_pcs" ON cut_pcs_entries;
CREATE POLICY "anon_select_cut_pcs" ON cut_pcs_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cut_pcs" ON cut_pcs_entries;
CREATE POLICY "anon_insert_cut_pcs" ON cut_pcs_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cut_pcs" ON cut_pcs_entries;
CREATE POLICY "anon_update_cut_pcs" ON cut_pcs_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cut_pcs" ON cut_pcs_entries;
CREATE POLICY "anon_delete_cut_pcs" ON cut_pcs_entries FOR DELETE TO anon, authenticated USING (true);
