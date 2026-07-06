import type { AppData, Article, Lot, ConsumptionRow, MaterialCategory, RawMaterial } from '../types';
import { getLotColorSizeCut, getLotActualPackedPcs, getLotDispatchedPcs } from './calculations';

export interface RowCost {
  row: ConsumptionRow;
  material: RawMaterial | undefined;
  rate: number;
  gst: number;
  lineCost: number;
  lineGst: number;
  lineNetCost: number;
}

export interface CategoryCost {
  category: MaterialCategory;
  total: number;
  rows: RowCost[];
}

export interface ArticleCostSummary {
  rows: RowCost[];
  byCategory: CategoryCost[];
  fabricCost: number;
  threadCost: number;
  elasticCost: number;
  zipCost: number;
  buttonCost: number;
  labelCost: number;
  ribCost: number;
  printingCost: number;
  packingCost: number;
  otherCost: number;
  totalMaterialCost: number;
  totalGstAmount: number;
  netCostPerPiece: number;
  costPerPiece: number;
}

const CATEGORY_LIST: MaterialCategory[] = ['Fabric', 'Thread', 'Elastic', 'Zip', 'Button', 'Label', 'Rib', 'Printing', 'Packing', 'Other'];

export function getArticleCostSummary(data: AppData, article: Article): ArticleCostSummary {
  const rows: RowCost[] = article.consumptionSheet.map((row) => {
    const material = data.rawMaterials.find((m) => m.id === row.materialId);
    const rate = material?.purchasePrice ?? 0;
    const gst = material?.gst ?? 0;
    const lineCost = row.consumption * rate;
    const lineGst = lineCost * gst / 100;
    return { row, material, rate, gst, lineCost, lineGst, lineNetCost: lineCost + lineGst };
  });

  const byCategory: CategoryCost[] = CATEGORY_LIST.map((cat) => ({
    category: cat,
    total: rows.filter((r) => r.material?.category === cat).reduce((a, r) => a + r.lineCost, 0),
    rows: rows.filter((r) => r.material?.category === cat),
  }));

  const fabricCost = rows.filter((r) => r.material?.category === 'Fabric').reduce((a, r) => a + r.lineCost, 0);
  const threadCost = rows.filter((r) => r.material?.category === 'Thread').reduce((a, r) => a + r.lineCost, 0);
  const elasticCost = rows.filter((r) => r.material?.category === 'Elastic').reduce((a, r) => a + r.lineCost, 0);
  const zipCost = rows.filter((r) => r.material?.category === 'Zip').reduce((a, r) => a + r.lineCost, 0);
  const buttonCost = rows.filter((r) => r.material?.category === 'Button').reduce((a, r) => a + r.lineCost, 0);
  const labelCost = rows.filter((r) => r.material?.category === 'Label').reduce((a, r) => a + r.lineCost, 0);
  const ribCost = rows.filter((r) => r.material?.category === 'Rib').reduce((a, r) => a + r.lineCost, 0);
  const printingCost = rows.filter((r) => r.material?.category === 'Printing').reduce((a, r) => a + r.lineCost, 0);
  const packingCost = rows.filter((r) => r.material?.category === 'Packing').reduce((a, r) => a + r.lineCost, 0);
  const otherCost = rows.filter((r) => r.material?.category === 'Other').reduce((a, r) => a + r.lineCost, 0);
  const totalMaterialCost = fabricCost + threadCost + elasticCost + zipCost + buttonCost + labelCost + ribCost + printingCost + packingCost + otherCost;
  const totalGstAmount = rows.reduce((a, r) => a + r.lineGst, 0);
  const netCostPerPiece = totalMaterialCost + totalGstAmount;

  return {
    rows, byCategory,
    fabricCost, threadCost, elasticCost, zipCost, buttonCost, labelCost, ribCost, printingCost, packingCost, otherCost,
    totalMaterialCost, totalGstAmount, netCostPerPiece, costPerPiece: totalMaterialCost,
  };
}

export interface LotMaterialRequirement {
  row: ConsumptionRow;
  material: RawMaterial | undefined;
  perPiece: number;
  requiredQty: number;
  rate: number;
  totalCost: number;
}

export interface LotCostSummary {
  lot: Lot;
  article: Article | undefined;
  requirements: LotMaterialRequirement[];
  byCategory: { category: MaterialCategory; total: number }[];
  fabricCost: number;
  threadCost: number;
  elasticCost: number;
  zipCost: number;
  buttonCost: number;
  labelCost: number;
  ribCost: number;
  printingCost: number;
  packingCost: number;
  otherCost: number;
  // Planned vs Actual quantities
  plannedPcs: number;
  actualCutPcs: number;
  actualPackedPcs: number;
  actualDispatchedPcs: number;
  // Costs based on actual cut PCS
  totalLotCost: number;
  totalGstAmount: number;
  netLotCost: number;
  costPerPiece: number;
  netCostPerPiece: number;
  // Revenue and profit based on actual packed PCS
  sellingPricePerPcs: number;
  totalRevenue: number;
  grossProfit: number;
  profitPerPcs: number;
  profitPercent: number;
  marginPercent: number;
  // Production loss analysis
  shortagePcs: number;
  cuttingLoss: number;
  leftPcsByLot: number;
  packingLoss: number;
  totalProductionLoss: number;
  netProfit: number;
  lossPercent: number;
  netMarginPercent: number;
  highestCostMaterial?: LotMaterialRequirement;
  lowestCostMaterial?: LotMaterialRequirement;
}

export function getLotCostSummary(data: AppData, lotId: string): LotCostSummary | undefined {
  const lot = data.lots.find((l) => l.id === lotId);
  if (!lot) return undefined;
  const article = data.articles.find((a) => a.id === lot.articleId);
  if (!article) return undefined;

  // Actual cut PCS — the master quantity for production cost
  const cutMap = getLotColorSizeCut(data, lot.id);
  let actualCutPcs = 0;
  for (const [, sm] of cutMap) for (const [, q] of sm) actualCutPcs += q;

  // Use actual cut PCS if available, else fall back to planned (for pre-cutting lots)
  const qty = actualCutPcs > 0 ? actualCutPcs : lot.plannedProduction;

  const requirements: LotMaterialRequirement[] = article.consumptionSheet.map((row) => {
    const material = data.rawMaterials.find((m) => m.id === row.materialId);
    const rate = material?.purchasePrice ?? 0;
    const requiredQty = row.consumption * qty;
    const totalCost = requiredQty * rate;
    return { row, material, perPiece: row.consumption, requiredQty, rate, totalCost };
  });

  const byCategory = CATEGORY_LIST.map((cat) => ({
    category: cat,
    total: requirements.filter((r) => r.material?.category === cat).reduce((a, r) => a + r.totalCost, 0),
  }));

  const fabricCost = byCategory.find((c) => c.category === 'Fabric')?.total ?? 0;
  const threadCost = byCategory.find((c) => c.category === 'Thread')?.total ?? 0;
  const elasticCost = byCategory.find((c) => c.category === 'Elastic')?.total ?? 0;
  const zipCost = byCategory.find((c) => c.category === 'Zip')?.total ?? 0;
  const buttonCost = byCategory.find((c) => c.category === 'Button')?.total ?? 0;
  const labelCost = byCategory.find((c) => c.category === 'Label')?.total ?? 0;
  const ribCost = byCategory.find((c) => c.category === 'Rib')?.total ?? 0;
  const printingCost = byCategory.find((c) => c.category === 'Printing')?.total ?? 0;
  const packingCost = byCategory.find((c) => c.category === 'Packing')?.total ?? 0;
  const otherCost = byCategory.find((c) => c.category === 'Other')?.total ?? 0;

  const totalLotCost = fabricCost + threadCost + elasticCost + zipCost + buttonCost + labelCost + ribCost + printingCost + packingCost + otherCost;

  const totalGstAmount = requirements.reduce((acc, r) => {
    const gst = r.material?.gst ?? 0;
    return acc + r.totalCost * gst / 100;
  }, 0);
  const netLotCost = totalLotCost + totalGstAmount;
  const costPerPiece = qty > 0 ? totalLotCost / qty : 0;
  const netCostPerPiece = qty > 0 ? netLotCost / qty : 0;

  // Revenue based on actual packed PCS
  const actualPackedPcs = getLotActualPackedPcs(data, lot.id);
  const actualDispatchedPcs = getLotDispatchedPcs(data, lot.id);

  const sellingPricePerPcs = lot.sellingPricePerPcs || 0;
  // Revenue uses packed PCS (what was actually produced and ready to sell)
  const revenueQty = actualPackedPcs > 0 ? actualPackedPcs : qty;
  const totalRevenue = sellingPricePerPcs * revenueQty;
  const grossProfit = totalRevenue - totalLotCost;
  const profitPerPcs = revenueQty > 0 ? grossProfit / revenueQty : 0;
  const profitPercent = totalLotCost > 0 ? (grossProfit / totalLotCost) * 100 : 0;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Production loss analysis
  const plannedPcs = lot.plannedProduction || 0;
  const shortagePcs = Math.max(0, plannedPcs - actualCutPcs);
  const cuttingLoss = shortagePcs * netCostPerPiece;

  const leftPcsByLot = (data.cutPcsEntries ?? [])
    .filter((c) => c.lotId === lot.id)
    .reduce((a, c) => a + c.leftPcs, 0);
  const packingLoss = leftPcsByLot * netCostPerPiece;

  const totalProductionLoss = cuttingLoss + packingLoss;
  const netProfit = grossProfit - totalProductionLoss;
  const lossPercent = netLotCost > 0 ? (totalProductionLoss / netLotCost) * 100 : 0;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const sorted = [...requirements].sort((a, b) => b.totalCost - a.totalCost);
  const highestCostMaterial = sorted[0];
  const lowestCostMaterial = sorted[sorted.length - 1];

  return {
    lot, article, requirements, byCategory,
    fabricCost, threadCost, elasticCost, zipCost, buttonCost, labelCost, ribCost, printingCost, packingCost, otherCost,
    plannedPcs, actualCutPcs, actualPackedPcs, actualDispatchedPcs,
    totalLotCost, totalGstAmount, netLotCost, costPerPiece, netCostPerPiece,
    sellingPricePerPcs, totalRevenue, grossProfit, profitPerPcs, profitPercent, marginPercent,
    shortagePcs, cuttingLoss, leftPcsByLot, packingLoss,
    totalProductionLoss, netProfit, lossPercent, netMarginPercent,
    highestCostMaterial, lowestCostMaterial,
  };
}

export function getAllLotCostSummaries(data: AppData): LotCostSummary[] {
  return data.lots.map((l) => getLotCostSummary(data, l.id)).filter((x): x is LotCostSummary => x !== undefined);
}

export function getDashboardCostingStats(data: AppData) {
  const summaries = getAllLotCostSummaries(data);
  if (summaries.length === 0) {
    return {
      avgCostPerPiece: 0, avgNetCostPerPiece: 0, totalMaterialCost: 0, totalLotCost: 0,
      totalRevenue: 0, totalProfit: 0, totalNetProfit: 0, avgProfitPercent: 0,
      totalProductionLoss: 0, highestCostMaterialName: '—', lowestCostMaterialName: '—',
      totalPlannedPcs: 0, totalActualCutPcs: 0, totalActualPackedPcs: 0, totalActualDispatchedPcs: 0,
    };
  }
  const avgCostPerPiece = summaries.reduce((a, s) => a + s.costPerPiece, 0) / summaries.length;
  const avgNetCostPerPiece = summaries.reduce((a, s) => a + s.netCostPerPiece, 0) / summaries.length;
  const totalMaterialCost = summaries.reduce((a, s) => a + s.totalLotCost, 0);
  const totalLotCost = totalMaterialCost;
  const totalRevenue = summaries.reduce((a, s) => a + s.totalRevenue, 0);
  const totalProfit = summaries.reduce((a, s) => a + s.grossProfit, 0);
  const totalNetProfit = summaries.reduce((a, s) => a + s.netProfit, 0);
  const avgProfitPercent = summaries.reduce((a, s) => a + s.profitPercent, 0) / summaries.length;
  const totalProductionLoss = summaries.reduce((a, s) => a + s.totalProductionLoss, 0);
  const totalPlannedPcs = summaries.reduce((a, s) => a + s.plannedPcs, 0);
  const totalActualCutPcs = summaries.reduce((a, s) => a + s.actualCutPcs, 0);
  const totalActualPackedPcs = summaries.reduce((a, s) => a + s.actualPackedPcs, 0);
  const totalActualDispatchedPcs = summaries.reduce((a, s) => a + s.actualDispatchedPcs, 0);

  let highestCostMaterialName = '—';
  let lowestCostMaterialName = '—';
  let highestCost = 0;
  let lowestCost = Infinity;
  for (const s of summaries) {
    for (const r of s.requirements) {
      if (r.totalCost > highestCost) { highestCost = r.totalCost; highestCostMaterialName = r.material?.name ?? r.row.materialId; }
      if (r.totalCost < lowestCost && r.totalCost > 0) { lowestCost = r.totalCost; lowestCostMaterialName = r.material?.name ?? r.row.materialId; }
    }
  }

  return {
    avgCostPerPiece, avgNetCostPerPiece, totalMaterialCost, totalLotCost, totalRevenue, totalProfit, totalNetProfit,
    avgProfitPercent, totalProductionLoss, highestCostMaterialName, lowestCostMaterialName,
    totalPlannedPcs, totalActualCutPcs, totalActualPackedPcs, totalActualDispatchedPcs,
  };
}

export function getFabricPrice(data: AppData, fabricName: string): number | undefined {
  const mat = data.rawMaterials.find((m) => m.name.toLowerCase() === fabricName.toLowerCase() && m.category === 'Fabric');
  return mat?.purchasePrice;
}
