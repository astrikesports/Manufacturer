import type { AppData, Lot, ColorSizeQty, Size, FabricColor } from '../types';
import { sumSizeQty } from '../utils/helpers';

export function getLot(data: AppData, lotId: string): Lot | undefined {
  return data.lots.find((l) => l.id === lotId);
}

export function getLotCutTotal(data: AppData, lotId: string): number {
  return data.cuttings
    .filter((c) => c.lotId === lotId)
    .reduce((acc, c) => acc + c.colorSizes.reduce((a, cs) => a + sumSizeQty(cs.sizes), 0), 0);
}

export function getLotColorSizeCut(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const c of data.cuttings.filter((c) => c.lotId === lotId)) {
    for (const cs of c.colorSizes) {
      if (!map.has(cs.colorId)) map.set(cs.colorId, new Map());
      for (const s of cs.sizes) {
        map.get(cs.colorId)!.set(s.size, (map.get(cs.colorId)!.get(s.size) ?? 0) + s.qty);
      }
    }
  }
  return map;
}

export function getLotColorSizeStitch(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const s of (data.stitchings ?? []).filter((s) => s.lotId === lotId)) {
    for (const cs of s.colorSizes) {
      if (!map.has(cs.colorId)) map.set(cs.colorId, new Map());
      for (const sq of cs.sizes) {
        map.get(cs.colorId)!.set(sq.size, (map.get(cs.colorId)!.get(sq.size) ?? 0) + sq.qty);
      }
    }
  }
  return map;
}

export function getLotColorSizeFinish(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const f of data.finishings.filter((f) => f.lotId === lotId)) {
    for (const cs of f.colorSizes) {
      if (!map.has(cs.colorId)) map.set(cs.colorId, new Map());
      for (const s of cs.sizes) {
        map.get(cs.colorId)!.set(s.size, (map.get(cs.colorId)!.get(s.size) ?? 0) + s.qty);
      }
    }
  }
  return map;
}

export function getLotColorSizePress(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const p of data.pressings.filter((p) => p.lotId === lotId)) {
    for (const cs of p.colorSizes) {
      if (!map.has(cs.colorId)) map.set(cs.colorId, new Map());
      for (const s of cs.sizes) {
        map.get(cs.colorId)!.set(s.size, (map.get(cs.colorId)!.get(s.size) ?? 0) + s.qty);
      }
    }
  }
  return map;
}

export function getPackedColorSize(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const p of data.packings.filter((p) => p.lotId === lotId)) {
    for (const box of p.boxes) {
      for (const c of box.contents) {
        if (!map.has(c.colorId)) map.set(c.colorId, new Map());
        const cur = map.get(c.colorId)!.get(box.size) ?? 0;
        map.get(c.colorId)!.set(box.size, cur + c.pcs * box.boxes);
      }
    }
  }
  return map;
}

export function getPackedSizeTotal(data: AppData, lotId: string): Map<Size, number> {
  const map = new Map<Size, number>();
  for (const p of data.packings.filter((p) => p.lotId === lotId)) {
    for (const box of p.boxes) {
      const totalPcs = box.contents.reduce((a, c) => a + c.pcs, 0) * box.boxes;
      map.set(box.size, (map.get(box.size) ?? 0) + totalPcs);
    }
  }
  return map;
}

export function getTotalBoxes(data: AppData, lotId: string): number {
  return data.packings
    .filter((p) => p.lotId === lotId)
    .reduce((acc, p) => acc + p.boxes.reduce((a, b) => a + b.boxes, 0), 0);
}

export function getDispatchedBoxes(data: AppData, lotId: string): number {
  return data.dispatches
    .filter((d) => d.lotId === lotId)
    .reduce((acc, d) => acc + d.dispatchBoxes.reduce((a, b) => a + b.boxes, 0), 0);
}

export function getAvailableBoxes(data: AppData, lotId: string): number {
  return getTotalBoxes(data, lotId) - getDispatchedBoxes(data, lotId);
}

export function getFabricColor(data: AppData, fabricId: string, colorId: string): FabricColor | undefined {
  return data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId);
}

export function getFabricUsedForLot(data: AppData, lotId: string): number {
  return data.cuttings.filter((c) => c.lotId === lotId).reduce((a, c) => a + c.fabricUsed, 0);
}

export function getFabricBalance(color: FabricColor): number {
  return color.stock - color.used;
}

export function emptyColorSizeQty(colorIds: string[], sizes: Size[]): ColorSizeQty[] {
  return colorIds.map((colorId) => ({
    colorId,
    sizes: sizes.map((size) => ({ size, qty: 0 })),
  }));
}

export function mergeColorSizeQty(existing: ColorSizeQty[], add: ColorSizeQty[]): ColorSizeQty[] {
  const map = new Map<string, Map<Size, number>>();
  for (const cs of [...existing, ...add]) {
    if (!map.has(cs.colorId)) map.set(cs.colorId, new Map());
    for (const s of cs.sizes) {
      map.get(cs.colorId)!.set(s.size, (map.get(cs.colorId)!.get(s.size) ?? 0) + s.qty);
    }
  }
  return Array.from(map.entries()).map(([colorId, sizeMap]) => ({
    colorId,
    sizes: Array.from(sizeMap.entries()).map(([size, qty]) => ({ size, qty })),
  }));
}

export function subtractColorSizeQty(from: ColorSizeQty[], sub: ColorSizeQty[]): ColorSizeQty[] {
  const fromMap = new Map<string, Map<Size, number>>();
  for (const cs of from) {
    if (!fromMap.has(cs.colorId)) fromMap.set(cs.colorId, new Map());
    for (const s of cs.sizes) fromMap.get(cs.colorId)!.set(s.size, s.qty);
  }
  for (const cs of sub) {
    if (!fromMap.has(cs.colorId)) continue;
    for (const s of cs.sizes) {
      const cur = fromMap.get(cs.colorId)!.get(s.size) ?? 0;
      fromMap.get(cs.colorId)!.set(s.size, Math.max(0, cur - s.qty));
    }
  }
  return Array.from(fromMap.entries()).map(([colorId, sizeMap]) => ({
    colorId,
    sizes: Array.from(sizeMap.entries()).map(([size, qty]) => ({ size, qty })),
  }));
}

export function totalColorSizeQty(cs: ColorSizeQty[]): number {
  return cs.reduce((a, c) => a + sumSizeQty(c.sizes), 0);
}

export function colorSizeToMap(cs: ColorSizeQty[]): Map<string, Map<Size, number>> {
  const map = new Map<string, Map<Size, number>>();
  for (const c of cs) {
    if (!map.has(c.colorId)) map.set(c.colorId, new Map());
    for (const s of c.sizes) map.get(c.colorId)!.set(s.size, s.qty);
  }
  return map;
}

export function mapToColorSize(map: Map<string, Map<Size, number>>): ColorSizeQty[] {
  return Array.from(map.entries()).map(([colorId, sizeMap]) => ({
    colorId,
    sizes: Array.from(sizeMap.entries()).map(([size, qty]) => ({ size, qty })),
  }));
}

export function getCutPcsRemaining(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  return getPressingRemaining(data, lotId);
}

export function getFinishingRemaining(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const finishMap = getLotColorSizeFinish(data, lotId);
  const pressMap = getLotColorSizePress(data, lotId);
  const result = new Map<string, Map<Size, number>>();
  for (const [colorId, sizeMap] of finishMap) {
    const pressed = pressMap.get(colorId) ?? new Map();
    const rem = new Map<Size, number>();
    for (const [size, finQty] of sizeMap) {
      rem.set(size, Math.max(0, finQty - (pressed.get(size) ?? 0)));
    }
    result.set(colorId, rem);
  }
  return result;
}

export function getPressingRemaining(data: AppData, lotId: string): Map<string, Map<Size, number>> {
  const pressMap = getLotColorSizePress(data, lotId);
  const packedMap = getPackedColorSize(data, lotId);
  const result = new Map<string, Map<Size, number>>();
  for (const [colorId, sizeMap] of pressMap) {
    const packed = packedMap.get(colorId) ?? new Map();
    const rem = new Map<Size, number>();
    for (const [size, pressQty] of sizeMap) {
      rem.set(size, Math.max(0, pressQty - (packed.get(size) ?? 0)));
    }
    result.set(colorId, rem);
  }
  return result;
}

export function getLotActualPackedPcs(data: AppData, lotId: string): number {
  let total = 0;
  const packedMap = getPackedColorSize(data, lotId);
  for (const [, sm] of packedMap) for (const [, q] of sm) total += q;
  return total;
}

export function getLotDispatchedPcs(data: AppData, lotId: string): number {
  const lotPackings = data.packings.filter((p) => p.lotId === lotId);
  const packingPcsPerBox = new Map<string, number>();
  for (const p of lotPackings) packingPcsPerBox.set(p.id, p.pcsPerBox || 0);
  return data.dispatches
    .filter((d) => d.lotId === lotId)
    .reduce((acc, d) => acc + d.dispatchBoxes.reduce((a, db) => {
      return a + db.boxes * (packingPcsPerBox.get(db.packId) ?? 0);
    }, 0), 0);
}
