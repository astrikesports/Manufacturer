import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Row types matching the database schema ───────────────────────────────────

export interface DbFabric {
  id: string;
  name: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface DbFabricColor {
  id: string;
  fabric_id: string;
  name: string;
  rolls: number;
  stock: number;
  used: number;
  created_at: string;
  updated_at: string;
}

export interface DbRawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  purchase_price: number;
  supplier: string;
  gst: number;
  status: string;
  remarks: string;
  opening_stock: number;
  current_stock: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface DbRawMaterialTransaction {
  id: string;
  material_id: string;
  type: string;
  qty: number;
  notes: string;
  date: string;
  created_at: string;
}

export interface DbArticle {
  id: string;
  code: string;
  name: string;
  fabric_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbArticleSizeConsumption {
  id: string;
  article_id: string;
  size: string;
  consumption: number;
  created_at: string;
  updated_at: string;
}

export interface DbArticleMaterialConsumption {
  id: string;
  article_id: string;
  material_id: string;
  consumption: number;
  created_at: string;
  updated_at: string;
}

export interface DbLot {
  id: string;
  lot_no: string;
  article_id: string;
  fabric_id: string;
  planned_production: number;
  selling_price_per_pcs: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbLotColorPlan {
  id: string;
  lot_id: string;
  color_id: string;
  planned_fabric: number;
  rolls_selected: number;
  created_at: string;
  updated_at: string;
}

export interface DbLotSizePlan {
  id: string;
  lot_id: string;
  size: string;
  planned_pcs: number;
  created_at: string;
  updated_at: string;
}

export interface DbCuttingEntry {
  id: string;
  lot_id: string;
  date: string;
  fabric_used: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbCuttingColorSize {
  id: string;
  cutting_id: string;
  color_id: string;
  size: string;
  qty: number;
  created_at: string;
}

export interface DbFinishingEntry {
  id: string;
  lot_id: string;
  cutting_id: string | null;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbFinishingColorSize {
  id: string;
  finishing_id: string;
  color_id: string;
  size: string;
  qty: number;
  created_at: string;
}

export interface DbPressingEntry {
  id: string;
  lot_id: string;
  finishing_id: string | null;
  date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbPressingColorSize {
  id: string;
  pressing_id: string;
  color_id: string;
  size: string;
  qty: number;
  created_at: string;
}

export interface DbPackingEntry {
  id: string;
  lot_id: string;
  pressing_id: string | null;
  date: string;
  pcs_per_box: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbPackingSizeBox {
  id: string;
  packing_id: string;
  size: string;
  boxes: number;
  pcs_per_box: number;
  created_at: string;
  updated_at: string;
}

export interface DbPackingBoxContent {
  id: string;
  packing_size_box_id: string;
  color_id: string;
  pcs: number;
  created_at: string;
}

export interface DbDispatchEntry {
  id: string;
  lot_id: string;
  date: string;
  party: string;
  invoice_no: string;
  type: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbDispatchBox {
  id: string;
  dispatch_id: string;
  packing_id: string | null;
  size: string;
  boxes: number;
  created_at: string;
}

export interface DbStitchingEntry {
  id: string;
  lot_id: string;
  cutting_id: string | null;
  date: string;
  notes: string;
  created_at: string;
}

export interface DbStitchingColorSize {
  id: string;
  stitching_id: string;
  color_id: string;
  size: string;
  qty: number;
  created_at: string;
}

export interface DbCutPcsEntry {
  id: string;
  lot_id: string;
  packing_id: string | null;
  color_id: string;
  size: string;
  left_pcs: number;
  date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbHistoryEvent {
  id: string;
  module: string;
  action: string;
  description: string;
  created_at: string;
}

export interface DbAppSettings {
  id: string;
  company_name: string;
  default_unit: string;
  created_at: string;
  updated_at: string;
}
