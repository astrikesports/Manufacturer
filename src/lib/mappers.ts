/**
 * Maps between the Supabase relational schema and the AppData flat structure
 * used by all existing components. This keeps the components unchanged while
 * the persistence layer is fully replaced.
 */
import type { AppData, Fabric, FabricColor, RawMaterial, RawMaterialTransaction, Article, SizeConsumption, ConsumptionRow, Lot, LotColorPlan, SizePlan, CuttingEntry, StitchingEntry, ColorSizeQty, SizeQty, FinishingEntry, PressingEntry, PackingEntry, PackSizeBox, BoxContent, DispatchEntry, HistoryEvent, Settings, Size, CutPcsEntry } from '../types';
import type {
  DbFabric, DbFabricColor, DbRawMaterial, DbRawMaterialTransaction, DbArticle, DbArticleSizeConsumption,
  DbArticleMaterialConsumption, DbLot, DbLotColorPlan, DbLotSizePlan,
  DbCuttingEntry, DbCuttingColorSize, DbStitchingEntry, DbStitchingColorSize, DbFinishingEntry, DbFinishingColorSize,
  DbPressingEntry, DbPressingColorSize, DbPackingEntry, DbPackingSizeBox,
  DbPackingBoxContent, DbDispatchEntry, DbDispatchBox, DbHistoryEvent, DbAppSettings,
  DbCutPcsEntry,
} from './supabase';

// ─── DB → AppData Converters ──────────────────────────────────────────────────

export function dbToFabric(row: DbFabric, colors: DbFabricColor[]): Fabric {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit as Fabric['unit'],
    createdAt: row.created_at,
    colors: colors
      .filter((c) => c.fabric_id === row.id)
      .map((c): FabricColor => ({
        id: c.id,
        name: c.name,
        rolls: c.rolls,
        stock: Number(c.stock),
        used: Number(c.used),
      })),
  };
}

export function dbToRawMaterial(row: DbRawMaterial): RawMaterial {
  return {
    id: row.id,
    name: row.name,
    category: row.category as RawMaterial['category'],
    unit: row.unit as RawMaterial['unit'],
    purchasePrice: Number(row.purchase_price),
    supplier: row.supplier,
    gst: Number(row.gst),
    status: row.status as RawMaterial['status'],
    remarks: row.remarks,
    openingStock: Number(row.opening_stock ?? 0),
    currentStock: Number(row.current_stock ?? 0),
    minStock: Number(row.min_stock ?? 0),
    createdAt: row.created_at,
  };
}

export function dbToRawMaterialTransaction(row: DbRawMaterialTransaction): RawMaterialTransaction {
  return {
    id: row.id,
    materialId: row.material_id,
    type: row.type as RawMaterialTransaction['type'],
    qty: Number(row.qty),
    notes: row.notes ?? '',
    date: row.date,
    createdAt: row.created_at,
  };
}

export function dbToArticle(
  row: DbArticle,
  sizeRows: DbArticleSizeConsumption[],
  materialRows: DbArticleMaterialConsumption[],
): Article {
  const consumption: SizeConsumption[] = sizeRows
    .filter((s) => s.article_id === row.id)
    .map((s) => ({ size: s.size as Size, consumption: Number(s.consumption) }));

  const consumptionSheet: ConsumptionRow[] = materialRows
    .filter((m) => m.article_id === row.id)
    .map((m) => ({ id: m.id, materialId: m.material_id, consumption: Number(m.consumption) }));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    fabricId: row.fabric_id,
    consumption,
    consumptionSheet,
    createdAt: row.created_at,
  };
}

export function dbToLot(
  row: DbLot,
  colorPlans: DbLotColorPlan[],
  sizePlans: DbLotSizePlan[],
): Lot {
  const lotColorPlans = colorPlans
    .filter((cp) => cp.lot_id === row.id)
    .map((cp): LotColorPlan => ({
      colorId: cp.color_id,
      plannedFabric: Number(cp.planned_fabric),
      rollsSelected: cp.rolls_selected,
    }));

  const lotSizePlans = sizePlans
    .filter((sp) => sp.lot_id === row.id)
    .map((sp): SizePlan => ({ size: sp.size as Size, plannedPcs: sp.planned_pcs }));

  return {
    id: row.id,
    lotNo: row.lot_no,
    articleId: row.article_id,
    fabricId: row.fabric_id,
    colorIds: lotColorPlans.map((cp) => cp.colorId),
    sizes: lotSizePlans.map((sp) => sp.size),
    colorPlans: lotColorPlans,
    sizePlans: lotSizePlans,
    plannedProduction: row.planned_production,
    sellingPricePerPcs: Number(row.selling_price_per_pcs),
    status: row.status as Lot['status'],
    createdAt: row.created_at,
  };
}

function groupColorSizes(rows: { color_id: string; size: string; qty: number }[]): ColorSizeQty[] {
  const map = new Map<string, Map<Size, number>>();
  for (const r of rows) {
    if (!map.has(r.color_id)) map.set(r.color_id, new Map());
    map.get(r.color_id)!.set(r.size as Size, (map.get(r.color_id)!.get(r.size as Size) ?? 0) + r.qty);
  }
  return Array.from(map.entries()).map(([colorId, sizeMap]) => ({
    colorId,
    sizes: Array.from(sizeMap.entries()).map(([size, qty]): SizeQty => ({ size, qty })),
  }));
}

export function dbToCuttingEntry(row: DbCuttingEntry, colorSizes: DbCuttingColorSize[]): CuttingEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    date: row.date,
    colorSizes: groupColorSizes(colorSizes.filter((cs) => cs.cutting_id === row.id)),
    fabricUsed: Number(row.fabric_used),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToStitchingEntry(row: DbStitchingEntry, colorSizes: DbStitchingColorSize[]): StitchingEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    cuttingId: row.cutting_id ?? '',
    date: row.date,
    colorSizes: groupColorSizes(colorSizes.filter((cs) => cs.stitching_id === row.id)),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToFinishingEntry(row: DbFinishingEntry, colorSizes: DbFinishingColorSize[]): FinishingEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    cuttingId: row.cutting_id ?? '',
    date: row.date,
    colorSizes: groupColorSizes(colorSizes.filter((cs) => cs.finishing_id === row.id)),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToPressingEntry(row: DbPressingEntry, colorSizes: DbPressingColorSize[]): PressingEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    finishingId: row.finishing_id ?? '',
    date: row.date,
    colorSizes: groupColorSizes(colorSizes.filter((cs) => cs.pressing_id === row.id)),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToPackingEntry(
  row: DbPackingEntry,
  sizeBoxes: DbPackingSizeBox[],
  boxContents: DbPackingBoxContent[],
): PackingEntry {
  const myBoxes = sizeBoxes.filter((sb) => sb.packing_id === row.id);
  const boxes: PackSizeBox[] = myBoxes.map((sb) => ({
    size: sb.size as Size,
    boxes: sb.boxes,
    pcsPerBox: sb.pcs_per_box,
    contents: boxContents
      .filter((bc) => bc.packing_size_box_id === sb.id)
      .map((bc): BoxContent => ({ colorId: bc.color_id, pcs: bc.pcs })),
  }));
  return {
    id: row.id,
    lotId: row.lot_id,
    pressingId: row.pressing_id ?? '',
    date: row.date,
    pcsPerBox: row.pcs_per_box ?? 0,
    boxes,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToDispatchEntry(row: DbDispatchEntry, dispatchBoxes: DbDispatchBox[]): DispatchEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    date: row.date,
    party: row.party,
    invoiceNo: row.invoice_no,
    type: row.type as DispatchEntry['type'],
    dispatchBoxes: dispatchBoxes
      .filter((db) => db.dispatch_id === row.id)
      .map((db) => ({ packId: db.packing_id ?? '', size: db.size as Size, boxes: db.boxes })),
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function dbToCutPcsEntry(row: DbCutPcsEntry): CutPcsEntry {
  return {
    id: row.id,
    lotId: row.lot_id,
    packingId: row.packing_id ?? '',
    colorId: row.color_id,
    size: row.size as Size,
    leftPcs: row.left_pcs,
    date: row.date,
    status: row.status as CutPcsEntry['status'],
    createdAt: row.created_at,
  };
}

export function dbToHistoryEvent(row: DbHistoryEvent): HistoryEvent {
  return {
    id: row.id,
    module: row.module,
    action: row.action as HistoryEvent['action'],
    description: row.description,
    timestamp: row.created_at,
  };
}

export function dbToSettings(row: DbAppSettings): Settings {
  return {
    companyName: row.company_name,
    defaultUnit: row.default_unit as Settings['defaultUnit'],
  };
}

// ─── AppData → DB Insert shapes (NO id field — let Supabase generate UUID) ────

export function fabricToDb(f: Fabric) {
  return { name: f.name, unit: f.unit };
}

export function fabricToDbUpdate(f: Fabric) {
  return { name: f.name, unit: f.unit };
}

export function fabricColorToDb(c: FabricColor, fabricId: string) {
  return { fabric_id: fabricId, name: c.name, rolls: c.rolls, stock: c.stock, used: c.used };
}

export function rawMaterialToDb(m: RawMaterial) {
  return {
    name: m.name, category: m.category, unit: m.unit,
    purchase_price: m.purchasePrice, supplier: m.supplier, gst: m.gst,
    status: m.status, remarks: m.remarks,
    opening_stock: m.openingStock ?? 0,
    current_stock: m.currentStock ?? 0,
    min_stock: m.minStock ?? 0,
  };
}

export function stitchingEntryToDb(e: StitchingEntry) {
  return { id: e.id, lot_id: e.lotId, cutting_id: e.cuttingId || null, date: e.date, notes: e.notes ?? '' };
}

export function stitchingColorSizesToDb(e: StitchingEntry) {
  return e.colorSizes.flatMap((cs) =>
    cs.sizes.map((s) => ({ stitching_id: e.id, color_id: cs.colorId, size: s.size, qty: s.qty }))
  );
}

export function articleToDb(a: Article) {
  return { code: a.code, name: a.name, fabric_id: a.fabricId };
}

export function articleSizeConsumptionToDb(a: Article) {
  return a.consumption.map((sc) => ({ article_id: a.id, size: sc.size, consumption: sc.consumption }));
}

export function articleMaterialConsumptionToDb(a: Article) {
  return a.consumptionSheet.map((cr) => ({
    article_id: a.id, material_id: cr.materialId, consumption: cr.consumption,
  }));
}

export function lotToDb(lot: Lot) {
  return {
    lot_no: lot.lotNo, article_id: lot.articleId, fabric_id: lot.fabricId,
    planned_production: lot.plannedProduction, selling_price_per_pcs: lot.sellingPricePerPcs,
    status: lot.status,
  };
}

export function lotColorPlansToDb(lot: Lot) {
  return lot.colorPlans.map((cp) => ({
    lot_id: lot.id, color_id: cp.colorId, planned_fabric: cp.plannedFabric, rolls_selected: cp.rollsSelected,
  }));
}

export function lotSizePlansToDb(lot: Lot) {
  return lot.sizePlans.map((sp) => ({ lot_id: lot.id, size: sp.size, planned_pcs: sp.plannedPcs }));
}

export function cuttingEntryToDb(e: CuttingEntry) {
  return { lot_id: e.lotId, date: e.date, fabric_used: e.fabricUsed, notes: e.notes ?? '' };
}

export function cuttingColorSizesToDb(e: CuttingEntry) {
  return e.colorSizes.flatMap((cs) =>
    cs.sizes.map((s) => ({ cutting_id: e.id, color_id: cs.colorId, size: s.size, qty: s.qty }))
  );
}

export function finishingEntryToDb(e: FinishingEntry) {
  return { lot_id: e.lotId, cutting_id: e.cuttingId || null, date: e.date, notes: e.notes ?? '' };
}

export function finishingColorSizesToDb(e: FinishingEntry) {
  return e.colorSizes.flatMap((cs) =>
    cs.sizes.map((s) => ({ finishing_id: e.id, color_id: cs.colorId, size: s.size, qty: s.qty }))
  );
}

export function pressingEntryToDb(e: PressingEntry) {
  return { lot_id: e.lotId, finishing_id: e.finishingId || null, date: e.date, notes: e.notes ?? '' };
}

export function pressingColorSizesToDb(e: PressingEntry) {
  return e.colorSizes.flatMap((cs) =>
    cs.sizes.map((s) => ({ pressing_id: e.id, color_id: cs.colorId, size: s.size, qty: s.qty }))
  );
}

export function packingEntryToDb(e: PackingEntry) {
  return { lot_id: e.lotId, pressing_id: e.pressingId || null, date: e.date, pcs_per_box: e.pcsPerBox ?? 0, notes: e.notes ?? '' };
}

export function packingSizeBoxesToDb(e: PackingEntry) {
  return e.boxes.map((b) => ({ packing_id: e.id, size: b.size, boxes: b.boxes, pcs_per_box: b.pcsPerBox }));
}

export function dispatchEntryToDb(e: DispatchEntry) {
  return {
    lot_id: e.lotId, date: e.date, party: e.party,
    invoice_no: e.invoiceNo, type: e.type, notes: e.notes ?? '',
  };
}

export function dispatchBoxesToDb(e: DispatchEntry) {
  return e.dispatchBoxes.map((db) => ({
    dispatch_id: e.id, packing_id: db.packId || null, size: db.size, boxes: db.boxes,
  }));
}
