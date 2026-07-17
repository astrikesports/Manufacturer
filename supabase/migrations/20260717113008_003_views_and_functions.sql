CREATE OR REPLACE FUNCTION get_lot_cut_pcs(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(ccs.qty), 0)::integer
  FROM cutting_entries ce
  JOIN cutting_color_sizes ccs ON ccs.cutting_id = ce.id
  WHERE ce.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_finished_pcs(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(fcs.qty), 0)::integer
  FROM finishing_entries fe
  JOIN finishing_color_sizes fcs ON fcs.finishing_id = fe.id
  WHERE fe.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_pressed_pcs(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(pcs2.qty), 0)::integer
  FROM pressing_entries pe
  JOIN pressing_color_sizes pcs2 ON pcs2.pressing_id = pe.id
  WHERE pe.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_packed_pcs(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(pbc.pcs * psb.boxes), 0)::integer
  FROM packing_entries pa
  JOIN packing_size_boxes psb ON psb.packing_id = pa.id
  JOIN packing_box_contents pbc ON pbc.packing_size_box_id = psb.id
  WHERE pa.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_total_boxes(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(psb.boxes), 0)::integer
  FROM packing_entries pa
  JOIN packing_size_boxes psb ON psb.packing_id = pa.id
  WHERE pa.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_dispatched_boxes(p_lot_id uuid)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(db.boxes), 0)::integer
  FROM dispatch_entries de
  JOIN dispatch_boxes db ON db.dispatch_id = de.id
  WHERE de.lot_id = p_lot_id;
$$;

CREATE OR REPLACE FUNCTION get_lot_fabric_used(p_lot_id uuid)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(fabric_used), 0)
  FROM cutting_entries
  WHERE lot_id = p_lot_id;
$$;

CREATE OR REPLACE VIEW v_lot_summary AS
SELECT
  l.id, l.lot_no, l.status, l.planned_production, l.selling_price_per_pcs, l.created_at,
  a.id AS article_id, a.code AS article_code, a.name AS article_name,
  f.id AS fabric_id, f.name AS fabric_name,
  (SELECT COUNT(*) FROM lot_color_plans lcp WHERE lcp.lot_id = l.id) AS color_count,
  (SELECT COALESCE(SUM(lsp.planned_pcs), 0) FROM lot_size_plans lsp WHERE lsp.lot_id = l.id) AS total_planned_pcs,
  get_lot_cut_pcs(l.id) AS cut_pcs,
  get_lot_finished_pcs(l.id) AS finished_pcs,
  get_lot_pressed_pcs(l.id) AS pressed_pcs,
  get_lot_packed_pcs(l.id) AS packed_pcs,
  get_lot_total_boxes(l.id) AS total_boxes,
  get_lot_dispatched_boxes(l.id) AS dispatched_boxes,
  get_lot_fabric_used(l.id) AS fabric_used
FROM lots l
JOIN articles a ON a.id = l.article_id
JOIN fabrics f ON f.id = l.fabric_id;

CREATE OR REPLACE VIEW v_lot_cost_summary AS
SELECT
  l.id AS lot_id, l.lot_no, l.planned_production, l.selling_price_per_pcs,
  COALESCE((SELECT SUM(amc.consumption * rm.purchase_price * l.planned_production)
   FROM article_material_consumption amc JOIN raw_materials rm ON rm.id = amc.material_id
   WHERE amc.article_id = l.article_id), 0) AS total_lot_cost,
  CASE WHEN l.planned_production > 0 THEN
    COALESCE((SELECT SUM(amc.consumption * rm.purchase_price)
     FROM article_material_consumption amc JOIN raw_materials rm ON rm.id = amc.material_id
     WHERE amc.article_id = l.article_id), 0)
  ELSE 0 END AS cost_per_piece,
  l.selling_price_per_pcs * l.planned_production AS total_revenue,
  (l.selling_price_per_pcs * l.planned_production) - COALESCE(
    (SELECT SUM(amc.consumption * rm.purchase_price * l.planned_production)
     FROM article_material_consumption amc JOIN raw_materials rm ON rm.id = amc.material_id
     WHERE amc.article_id = l.article_id), 0) AS gross_profit
FROM lots l;

CREATE OR REPLACE VIEW v_cutting_summary AS
SELECT ce.lot_id, COUNT(ce.id) AS entry_count, COALESCE(SUM(ce.fabric_used), 0) AS total_fabric_used, COALESCE(SUM(ccs.qty), 0) AS total_cut_pcs
FROM cutting_entries ce LEFT JOIN cutting_color_sizes ccs ON ccs.cutting_id = ce.id GROUP BY ce.lot_id;

CREATE OR REPLACE VIEW v_finishing_summary AS
SELECT fe.lot_id, COUNT(fe.id) AS entry_count, COALESCE(SUM(fcs.qty), 0) AS total_finished_pcs
FROM finishing_entries fe LEFT JOIN finishing_color_sizes fcs ON fcs.finishing_id = fe.id GROUP BY fe.lot_id;

CREATE OR REPLACE VIEW v_pressing_summary AS
SELECT pe.lot_id, COUNT(pe.id) AS entry_count, COALESCE(SUM(pcs2.qty), 0) AS total_pressed_pcs
FROM pressing_entries pe LEFT JOIN pressing_color_sizes pcs2 ON pcs2.pressing_id = pe.id GROUP BY pe.lot_id;

CREATE OR REPLACE VIEW v_packing_summary AS
SELECT pa.lot_id, COUNT(DISTINCT pa.id) AS entry_count, COALESCE(SUM(psb.boxes), 0) AS total_boxes, COALESCE(SUM(pbc.pcs * psb.boxes), 0) AS total_packed_pcs
FROM packing_entries pa LEFT JOIN packing_size_boxes psb ON psb.packing_id = pa.id LEFT JOIN packing_box_contents pbc ON pbc.packing_size_box_id = psb.id GROUP BY pa.lot_id;

CREATE OR REPLACE VIEW v_dispatch_summary AS
SELECT de.lot_id, COUNT(DISTINCT de.id) AS dispatch_count, COALESCE(SUM(db.boxes), 0) AS total_dispatched_boxes
FROM dispatch_entries de LEFT JOIN dispatch_boxes db ON db.dispatch_id = de.id GROUP BY de.lot_id;
