-- Immutable Article Master versions and frozen material rates.
-- Existing articles become Version 1 without changing their IDs, so existing Lots remain linked.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS base_article_id uuid,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_base_article_id_fkey;
ALTER TABLE public.articles
  ADD CONSTRAINT articles_base_article_id_fkey
  FOREIGN KEY (base_article_id) REFERENCES public.articles(id) ON DELETE SET NULL;

UPDATE public.articles SET base_article_id = id WHERE base_article_id IS NULL;

-- Article codes can repeat across versions, but not across separate article families.
DROP INDEX IF EXISTS public.idx_articles_code;
CREATE INDEX IF NOT EXISTS idx_articles_code ON public.articles(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_base_version
  ON public.articles(base_article_id, version_number);

ALTER TABLE public.article_material_consumption
  ADD COLUMN IF NOT EXISTS unit_rate numeric(12,4),
  ADD COLUMN IF NOT EXISTS gst_rate numeric(7,3);

-- Freeze each existing recipe's rate at the current raw-material rate for its initial version.
UPDATE public.article_material_consumption amc
SET unit_rate = rm.purchase_price,
    gst_rate = rm.gst
FROM public.raw_materials rm
WHERE rm.id = amc.material_id
  AND (amc.unit_rate IS NULL OR amc.gst_rate IS NULL);

UPDATE public.article_material_consumption
SET unit_rate = COALESCE(unit_rate, 0), gst_rate = COALESCE(gst_rate, 0)
WHERE unit_rate IS NULL OR gst_rate IS NULL;

ALTER TABLE public.article_material_consumption
  ALTER COLUMN unit_rate SET DEFAULT 0,
  ALTER COLUMN gst_rate SET DEFAULT 0;

-- Keep SQL-side lot costing aligned with the frozen rate saved on each article version.
CREATE OR REPLACE VIEW public.v_lot_cost_summary AS
SELECT
  l.id AS lot_id, l.lot_no, l.planned_production, l.selling_price_per_pcs,
  COALESCE((SELECT SUM(amc.consumption * COALESCE(amc.unit_rate, rm.purchase_price) * l.planned_production)
    FROM public.article_material_consumption amc
    JOIN public.raw_materials rm ON rm.id = amc.material_id
    WHERE amc.article_id = l.article_id), 0) AS total_lot_cost,
  CASE WHEN l.planned_production > 0 THEN
    COALESCE((SELECT SUM(amc.consumption * COALESCE(amc.unit_rate, rm.purchase_price))
      FROM public.article_material_consumption amc
      JOIN public.raw_materials rm ON rm.id = amc.material_id
      WHERE amc.article_id = l.article_id), 0)
  ELSE 0 END AS cost_per_piece,
  l.selling_price_per_pcs * l.planned_production AS total_revenue,
  (l.selling_price_per_pcs * l.planned_production) - COALESCE(
    (SELECT SUM(amc.consumption * COALESCE(amc.unit_rate, rm.purchase_price) * l.planned_production)
      FROM public.article_material_consumption amc
      JOIN public.raw_materials rm ON rm.id = amc.material_id
      WHERE amc.article_id = l.article_id), 0) AS gross_profit
FROM public.lots l;
