import type { AppData } from '../types';
import { clone } from '../utils/helpers';

export function restoreFabricStock(data: AppData, lotId: string): AppData {
  const d = clone(data);
  const lot = d.lots.find((l) => l.id === lotId);
  if (!lot) return d;
  const fabricUsed = d.cuttings
    .filter((c) => c.lotId === lotId)
    .reduce((a, c) => a + c.fabricUsed, 0);
  if (fabricUsed > 0) {
    const fabric = d.fabrics.find((f) => f.id === lot.fabricId);
    if (fabric) {
      const colorPlans = lot.colorPlans;
      for (const cp of colorPlans) {
        const color = fabric.colors.find((c) => c.id === cp.colorId);
        if (color) {
          color.used = Math.max(0, color.used - cp.plannedFabric);
        }
      }
    }
  }
  return d;
}

export function deleteLotCascade(data: AppData, lotId: string): AppData {
  let d = clone(data);
  d = restoreFabricStock(d, lotId);
  d.cuttings = d.cuttings.filter((c) => c.lotId !== lotId);
  d.finishings = d.finishings.filter((f) => f.lotId !== lotId);
  d.pressings = d.pressings.filter((p) => p.lotId !== lotId);
  d.packings = d.packings.filter((p) => p.lotId !== lotId);
  d.dispatches = d.dispatches.filter((dp) => dp.lotId !== lotId);
  d.lots = d.lots.filter((l) => l.id !== lotId);
  return d;
}

export function deleteCuttingCascade(data: AppData, cuttingId: string): AppData {
  let d = clone(data);
  const cutting = d.cuttings.find((c) => c.id === cuttingId);
  if (!cutting) return d;
  const finishings = d.finishings.filter((f) => f.cuttingId === cuttingId);
  for (const f of finishings) {
    d = deleteFinishingCascade(d, f.id);
  }
  d.cuttings = d.cuttings.filter((c) => c.id !== cuttingId);
  return d;
}

export function deleteFinishingCascade(data: AppData, finishingId: string): AppData {
  let d = clone(data);
  const finishing = d.finishings.find((f) => f.id === finishingId);
  if (!finishing) return d;
  const pressings = d.pressings.filter((p) => p.finishingId === finishingId);
  for (const p of pressings) {
    d = deletePressingCascade(d, p.id);
  }
  d.finishings = d.finishings.filter((f) => f.id !== finishingId);
  return d;
}

export function deletePressingCascade(data: AppData, pressingId: string): AppData {
  let d = clone(data);
  const pressing = d.pressings.find((p) => p.id === pressingId);
  if (!pressing) return d;
  const packings = d.packings.filter((p) => p.pressingId === pressingId);
  for (const p of packings) {
    d = deletePackingCascade(d, p.id);
  }
  d.pressings = d.pressings.filter((p) => p.id !== pressingId);
  return d;
}

export function deletePackingCascade(data: AppData, packingId: string): AppData {
  let d = clone(data);
  const packing = d.packings.find((p) => p.id === packingId);
  if (!packing) return d;
  const dispatches = d.dispatches.filter((dp) => dp.dispatchBoxes.some((db) => db.packId === packingId));
  for (const dp of dispatches) {
    d.dispatches = d.dispatches.filter((x) => x.id !== dp.id);
  }
  d.packings = d.packings.filter((p) => p.id !== packingId);
  return d;
}

export function deleteDispatch(data: AppData, dispatchId: string): AppData {
  let d = clone(data);
  d.dispatches = d.dispatches.filter((dp) => dp.id !== dispatchId);
  return d;
}

export function deleteFabric(data: AppData, fabricId: string): AppData {
  let d = clone(data);
  const lotsUsingFabric = d.lots.filter((l) => l.fabricId === fabricId);
  for (const lot of lotsUsingFabric) {
    d = deleteLotCascade(d, lot.id);
  }
  d.articles = d.articles.filter((a) => a.fabricId !== fabricId);
  d.fabrics = d.fabrics.filter((f) => f.id !== fabricId);
  return d;
}

export function deleteArticle(data: AppData, articleId: string): AppData {
  let d = clone(data);
  const lotsUsingArticle = d.lots.filter((l) => l.articleId === articleId);
  for (const lot of lotsUsingArticle) {
    d = deleteLotCascade(d, lot.id);
  }
  d.articles = d.articles.filter((a) => a.id !== articleId);
  return d;
}
