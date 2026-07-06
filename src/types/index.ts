export type Unit = 'KG' | 'Meter' | 'PCS' | 'Pair' | 'Roll' | 'Packet' | 'GSM' | 'Litre' | 'Box';

export const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'] as const;
export type Size = (typeof ALL_SIZES)[number];

export interface FabricColor {
  id: string;
  name: string;
  rolls: number;
  stock: number;
  used: number;
}

export interface Fabric {
  id: string;
  name: string;
  unit: Unit;
  colors: FabricColor[];
  createdAt: string;
}

export interface SizeConsumption {
  size: Size;
  consumption: number;
}

export type MaterialCategory =
  | 'Fabric' | 'Thread' | 'Elastic' | 'Zip' | 'Button' | 'Label' | 'Rib'
  | 'Printing' | 'Packing' | 'Other';

export const ALL_CATEGORIES: MaterialCategory[] = [
  'Fabric', 'Thread', 'Elastic', 'Zip', 'Button', 'Label', 'Rib', 'Printing', 'Packing', 'Other',
];

export interface RawMaterialTransaction {
  id: string;
  materialId: string;
  type: 'Opening' | 'Purchase' | 'Issue' | 'Return' | 'Adjustment';
  qty: number;
  notes: string;
  date: string;
  createdAt: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  purchasePrice: number;
  supplier: string;
  gst: number;
  status: 'Active' | 'Inactive';
  remarks: string;
  openingStock: number;
  currentStock: number;
  minStock: number;
  createdAt: string;
}

export interface ConsumptionRow {
  id: string;
  materialId: string;
  consumption: number;
}

export interface Article {
  id: string;
  code: string;
  name: string;
  fabricId: string;
  consumption: SizeConsumption[];
  consumptionSheet: ConsumptionRow[];
  createdAt: string;
}

export interface LotColorPlan {
  colorId: string;
  plannedFabric: number;
  rollsSelected: number;
}

export interface SizePlan {
  size: Size;
  plannedPcs: number;
}

export interface Lot {
  id: string;
  lotNo: string;
  articleId: string;
  fabricId: string;
  colorIds: string[];
  sizes: Size[];
  colorPlans: LotColorPlan[];
  sizePlans: SizePlan[];
  plannedProduction: number;
  sellingPricePerPcs: number;
  status: 'Active' | 'Completed' | 'Closed';
  createdAt: string;
}

export interface SizeQty {
  size: Size;
  qty: number;
}

export interface ColorSizeQty {
  colorId: string;
  sizes: SizeQty[];
}

export interface CuttingEntry {
  id: string;
  lotId: string;
  date: string;
  colorSizes: ColorSizeQty[];
  fabricUsed: number;
  notes?: string;
  createdAt: string;
}

export interface StitchingEntry {
  id: string;
  lotId: string;
  cuttingId: string;
  date: string;
  colorSizes: ColorSizeQty[];
  notes?: string;
  createdAt: string;
}

export interface FinishingEntry {
  id: string;
  lotId: string;
  cuttingId: string;
  date: string;
  colorSizes: ColorSizeQty[];
  notes?: string;
  createdAt: string;
}

export interface PressingEntry {
  id: string;
  lotId: string;
  finishingId: string;
  date: string;
  colorSizes: ColorSizeQty[];
  notes?: string;
  createdAt: string;
}

export interface BoxContent {
  colorId: string;
  pcs: number;
}

export interface PackSizeBox {
  size: Size;
  boxes: number;
  pcsPerBox: number;
  contents: BoxContent[];
}

export interface PackingEntry {
  id: string;
  lotId: string;
  pressingId: string;
  date: string;
  pcsPerBox: number;
  boxes: PackSizeBox[];
  notes?: string;
  createdAt: string;
}

export interface CutPcsEntry {
  id: string;
  lotId: string;
  packingId: string;
  colorId: string;
  size: Size;
  leftPcs: number;
  date: string;
  status: 'Available' | 'Used';
  createdAt: string;
}

export interface DispatchEntry {
  id: string;
  lotId: string;
  date: string;
  party: string;
  invoiceNo: string;
  dispatchBoxes: { packId: string; size: Size; boxes: number }[];
  type: 'Partial' | 'Full';
  notes?: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  module: string;
  action: 'Create' | 'Edit' | 'Delete';
  description: string;
  timestamp: string;
}

export interface Settings {
  companyName: string;
  defaultUnit: Unit;
}

export interface AppData {
  fabrics: Fabric[];
  rawMaterials: RawMaterial[];
  rawMaterialTransactions: RawMaterialTransaction[];
  articles: Article[];
  lots: Lot[];
  cuttings: CuttingEntry[];
  stitchings: StitchingEntry[];
  finishings: FinishingEntry[];
  pressings: PressingEntry[];
  packings: PackingEntry[];
  dispatches: DispatchEntry[];
  cutPcsEntries: CutPcsEntry[];
  history: HistoryEvent[];
  settings: Settings;
}
