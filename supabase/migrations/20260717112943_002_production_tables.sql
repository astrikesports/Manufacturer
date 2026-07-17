CREATE TABLE IF NOT EXISTS lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_no text NOT NULL,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  fabric_id uuid NOT NULL REFERENCES fabrics(id) ON DELETE RESTRICT,
  planned_production integer NOT NULL DEFAULT 0 CHECK (planned_production >= 0),
  selling_price_per_pcs numeric(10,2) NOT NULL DEFAULT 0 CHECK (selling_price_per_pcs >= 0),
  status lot_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_lot_no ON lots(lot_no);
CREATE INDEX IF NOT EXISTS idx_lots_article_id ON lots(article_id);
CREATE INDEX IF NOT EXISTS idx_lots_fabric_id ON lots(fabric_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lots" ON lots;
CREATE POLICY "anon_select_lots" ON lots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lots" ON lots;
CREATE POLICY "anon_insert_lots" ON lots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lots" ON lots;
CREATE POLICY "anon_update_lots" ON lots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lots" ON lots;
CREATE POLICY "anon_delete_lots" ON lots FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS lot_color_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  planned_fabric numeric(10,3) NOT NULL DEFAULT 0 CHECK (planned_fabric >= 0),
  rolls_selected integer NOT NULL DEFAULT 0 CHECK (rolls_selected >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id, color_id)
);
CREATE INDEX IF NOT EXISTS idx_lot_color_plans_lot_id ON lot_color_plans(lot_id);
ALTER TABLE lot_color_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lot_color_plans" ON lot_color_plans;
CREATE POLICY "anon_select_lot_color_plans" ON lot_color_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lot_color_plans" ON lot_color_plans;
CREATE POLICY "anon_insert_lot_color_plans" ON lot_color_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lot_color_plans" ON lot_color_plans;
CREATE POLICY "anon_update_lot_color_plans" ON lot_color_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lot_color_plans" ON lot_color_plans;
CREATE POLICY "anon_delete_lot_color_plans" ON lot_color_plans FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS lot_size_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  size size_type NOT NULL,
  planned_pcs integer NOT NULL DEFAULT 0 CHECK (planned_pcs >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id, size)
);
CREATE INDEX IF NOT EXISTS idx_lot_size_plans_lot_id ON lot_size_plans(lot_id);
ALTER TABLE lot_size_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lot_size_plans" ON lot_size_plans;
CREATE POLICY "anon_select_lot_size_plans" ON lot_size_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lot_size_plans" ON lot_size_plans;
CREATE POLICY "anon_insert_lot_size_plans" ON lot_size_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lot_size_plans" ON lot_size_plans;
CREATE POLICY "anon_update_lot_size_plans" ON lot_size_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lot_size_plans" ON lot_size_plans;
CREATE POLICY "anon_delete_lot_size_plans" ON lot_size_plans FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cutting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  date date NOT NULL,
  fabric_used numeric(10,3) NOT NULL DEFAULT 0 CHECK (fabric_used >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cutting_entries_lot_id ON cutting_entries(lot_id);
CREATE INDEX IF NOT EXISTS idx_cutting_entries_date ON cutting_entries(date);
ALTER TABLE cutting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cutting_entries" ON cutting_entries;
CREATE POLICY "anon_select_cutting_entries" ON cutting_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cutting_entries" ON cutting_entries;
CREATE POLICY "anon_insert_cutting_entries" ON cutting_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cutting_entries" ON cutting_entries;
CREATE POLICY "anon_update_cutting_entries" ON cutting_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cutting_entries" ON cutting_entries;
CREATE POLICY "anon_delete_cutting_entries" ON cutting_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cutting_color_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cutting_id uuid NOT NULL REFERENCES cutting_entries(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  size size_type NOT NULL,
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cutting_color_sizes_cutting_id ON cutting_color_sizes(cutting_id);
CREATE INDEX IF NOT EXISTS idx_cutting_color_sizes_color_id ON cutting_color_sizes(color_id);
ALTER TABLE cutting_color_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cutting_color_sizes" ON cutting_color_sizes;
CREATE POLICY "anon_select_cutting_color_sizes" ON cutting_color_sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cutting_color_sizes" ON cutting_color_sizes;
CREATE POLICY "anon_insert_cutting_color_sizes" ON cutting_color_sizes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cutting_color_sizes" ON cutting_color_sizes;
CREATE POLICY "anon_update_cutting_color_sizes" ON cutting_color_sizes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cutting_color_sizes" ON cutting_color_sizes;
CREATE POLICY "anon_delete_cutting_color_sizes" ON cutting_color_sizes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS finishing_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  cutting_id uuid REFERENCES cutting_entries(id) ON DELETE SET NULL,
  date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finishing_entries_lot_id ON finishing_entries(lot_id);
ALTER TABLE finishing_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_finishing_entries" ON finishing_entries;
CREATE POLICY "anon_select_finishing_entries" ON finishing_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_finishing_entries" ON finishing_entries;
CREATE POLICY "anon_insert_finishing_entries" ON finishing_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_finishing_entries" ON finishing_entries;
CREATE POLICY "anon_update_finishing_entries" ON finishing_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_finishing_entries" ON finishing_entries;
CREATE POLICY "anon_delete_finishing_entries" ON finishing_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS finishing_color_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finishing_id uuid NOT NULL REFERENCES finishing_entries(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  size size_type NOT NULL,
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_finishing_color_sizes_finishing_id ON finishing_color_sizes(finishing_id);
ALTER TABLE finishing_color_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_finishing_color_sizes" ON finishing_color_sizes;
CREATE POLICY "anon_select_finishing_color_sizes" ON finishing_color_sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_finishing_color_sizes" ON finishing_color_sizes;
CREATE POLICY "anon_insert_finishing_color_sizes" ON finishing_color_sizes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_finishing_color_sizes" ON finishing_color_sizes;
CREATE POLICY "anon_update_finishing_color_sizes" ON finishing_color_sizes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_finishing_color_sizes" ON finishing_color_sizes;
CREATE POLICY "anon_delete_finishing_color_sizes" ON finishing_color_sizes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS pressing_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  finishing_id uuid REFERENCES finishing_entries(id) ON DELETE SET NULL,
  date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pressing_entries_lot_id ON pressing_entries(lot_id);
ALTER TABLE pressing_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pressing_entries" ON pressing_entries;
CREATE POLICY "anon_select_pressing_entries" ON pressing_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pressing_entries" ON pressing_entries;
CREATE POLICY "anon_insert_pressing_entries" ON pressing_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pressing_entries" ON pressing_entries;
CREATE POLICY "anon_update_pressing_entries" ON pressing_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pressing_entries" ON pressing_entries;
CREATE POLICY "anon_delete_pressing_entries" ON pressing_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS pressing_color_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pressing_id uuid NOT NULL REFERENCES pressing_entries(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  size size_type NOT NULL,
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pressing_color_sizes_pressing_id ON pressing_color_sizes(pressing_id);
ALTER TABLE pressing_color_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pressing_color_sizes" ON pressing_color_sizes;
CREATE POLICY "anon_select_pressing_color_sizes" ON pressing_color_sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pressing_color_sizes" ON pressing_color_sizes;
CREATE POLICY "anon_insert_pressing_color_sizes" ON pressing_color_sizes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pressing_color_sizes" ON pressing_color_sizes;
CREATE POLICY "anon_update_pressing_color_sizes" ON pressing_color_sizes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pressing_color_sizes" ON pressing_color_sizes;
CREATE POLICY "anon_delete_pressing_color_sizes" ON pressing_color_sizes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS packing_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  pressing_id uuid REFERENCES pressing_entries(id) ON DELETE SET NULL,
  date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_packing_entries_lot_id ON packing_entries(lot_id);
ALTER TABLE packing_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_packing_entries" ON packing_entries;
CREATE POLICY "anon_select_packing_entries" ON packing_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_packing_entries" ON packing_entries;
CREATE POLICY "anon_insert_packing_entries" ON packing_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_packing_entries" ON packing_entries;
CREATE POLICY "anon_update_packing_entries" ON packing_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_packing_entries" ON packing_entries;
CREATE POLICY "anon_delete_packing_entries" ON packing_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS packing_size_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_id uuid NOT NULL REFERENCES packing_entries(id) ON DELETE CASCADE,
  size size_type NOT NULL,
  boxes integer NOT NULL DEFAULT 0 CHECK (boxes >= 0),
  pcs_per_box integer NOT NULL DEFAULT 0 CHECK (pcs_per_box >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_packing_size_boxes_packing_id ON packing_size_boxes(packing_id);
ALTER TABLE packing_size_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_packing_size_boxes" ON packing_size_boxes;
CREATE POLICY "anon_select_packing_size_boxes" ON packing_size_boxes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_packing_size_boxes" ON packing_size_boxes;
CREATE POLICY "anon_insert_packing_size_boxes" ON packing_size_boxes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_packing_size_boxes" ON packing_size_boxes;
CREATE POLICY "anon_update_packing_size_boxes" ON packing_size_boxes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_packing_size_boxes" ON packing_size_boxes;
CREATE POLICY "anon_delete_packing_size_boxes" ON packing_size_boxes FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS packing_box_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_size_box_id uuid NOT NULL REFERENCES packing_size_boxes(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES fabric_colors(id) ON DELETE RESTRICT,
  pcs integer NOT NULL DEFAULT 0 CHECK (pcs >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_packing_box_contents_size_box_id ON packing_box_contents(packing_size_box_id);
ALTER TABLE packing_box_contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_packing_box_contents" ON packing_box_contents;
CREATE POLICY "anon_select_packing_box_contents" ON packing_box_contents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_packing_box_contents" ON packing_box_contents;
CREATE POLICY "anon_insert_packing_box_contents" ON packing_box_contents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_packing_box_contents" ON packing_box_contents;
CREATE POLICY "anon_update_packing_box_contents" ON packing_box_contents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_packing_box_contents" ON packing_box_contents;
CREATE POLICY "anon_delete_packing_box_contents" ON packing_box_contents FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS dispatch_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  date date NOT NULL,
  party text NOT NULL DEFAULT '',
  invoice_no text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Partial' CHECK (type IN ('Partial', 'Full')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_entries_lot_id ON dispatch_entries(lot_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_entries_date ON dispatch_entries(date);
ALTER TABLE dispatch_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dispatch_entries" ON dispatch_entries;
CREATE POLICY "anon_select_dispatch_entries" ON dispatch_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dispatch_entries" ON dispatch_entries;
CREATE POLICY "anon_insert_dispatch_entries" ON dispatch_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dispatch_entries" ON dispatch_entries;
CREATE POLICY "anon_update_dispatch_entries" ON dispatch_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dispatch_entries" ON dispatch_entries;
CREATE POLICY "anon_delete_dispatch_entries" ON dispatch_entries FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS dispatch_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES dispatch_entries(id) ON DELETE CASCADE,
  packing_id uuid REFERENCES packing_entries(id) ON DELETE SET NULL,
  size size_type NOT NULL,
  boxes integer NOT NULL DEFAULT 0 CHECK (boxes >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_boxes_dispatch_id ON dispatch_boxes(dispatch_id);
ALTER TABLE dispatch_boxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dispatch_boxes" ON dispatch_boxes;
CREATE POLICY "anon_select_dispatch_boxes" ON dispatch_boxes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dispatch_boxes" ON dispatch_boxes;
CREATE POLICY "anon_insert_dispatch_boxes" ON dispatch_boxes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dispatch_boxes" ON dispatch_boxes;
CREATE POLICY "anon_update_dispatch_boxes" ON dispatch_boxes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dispatch_boxes" ON dispatch_boxes;
CREATE POLICY "anon_delete_dispatch_boxes" ON dispatch_boxes FOR DELETE TO anon, authenticated USING (true);

DO $$ 
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['lots','lot_color_plans','lot_size_plans','cutting_entries','finishing_entries','pressing_entries','packing_entries','packing_size_boxes','dispatch_entries']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl);
  END LOOP;
END $$;
