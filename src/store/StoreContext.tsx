import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import type { AppData, Fabric, RawMaterial, RawMaterialTransaction, Article, Lot, CuttingEntry, StitchingEntry, FinishingEntry, PressingEntry, PackingEntry, DispatchEntry, HistoryEvent, Settings, CutPcsEntry, Size } from '../types';
import { uid, now, clone } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import {
  dbToFabric, dbToRawMaterial, dbToRawMaterialTransaction, dbToArticle, dbToLot, dbToCuttingEntry,
  dbToStitchingEntry, dbToFinishingEntry, dbToPressingEntry, dbToPackingEntry, dbToDispatchEntry,
  dbToHistoryEvent, dbToSettings, dbToCutPcsEntry,
  fabricToDb, fabricColorToDb, rawMaterialToDb, articleToDb,
  articleSizeConsumptionToDb, articleMaterialConsumptionToDb,
  lotToDb, lotColorPlansToDb, lotSizePlansToDb,
  cuttingEntryToDb, cuttingColorSizesToDb,
  stitchingEntryToDb, stitchingColorSizesToDb,
  finishingEntryToDb, finishingColorSizesToDb,
  pressingEntryToDb, pressingColorSizesToDb,
  packingEntryToDb,
  dispatchEntryToDb, dispatchBoxesToDb,
} from '../lib/mappers';
import type {
  DbFabric, DbFabricColor, DbRawMaterial, DbRawMaterialTransaction, DbArticle, DbArticleSizeConsumption,
  DbArticleMaterialConsumption, DbLot, DbLotColorPlan, DbLotSizePlan,
  DbCuttingEntry, DbCuttingColorSize, DbStitchingEntry, DbStitchingColorSize,
  DbFinishingEntry, DbFinishingColorSize,
  DbPressingEntry, DbPressingColorSize, DbPackingEntry, DbPackingSizeBox,
  DbPackingBoxContent, DbDispatchEntry, DbDispatchBox, DbHistoryEvent, DbAppSettings,
  DbCutPcsEntry,
} from '../lib/supabase';
import { getLotColorSizePress, getPackedColorSize } from './calculations';

const defaultData: AppData = {
  fabrics: [],
  rawMaterials: [],
  rawMaterialTransactions: [],
  articles: [],
  lots: [],
  cuttings: [],
  stitchings: [],
  finishings: [],
  pressings: [],
  packings: [],
  dispatches: [],
  cutPcsEntries: [],
  history: [],
  settings: { companyName: 'StitchFlow Garments', defaultUnit: 'KG' },
};

interface StoreContextType {
  data: AppData;
  loading: boolean;
  setData: (updater: (prev: AppData) => AppData) => void;
  addHistory: (module: string, action: 'Create' | 'Edit' | 'Delete', description: string) => void;
  resetData: () => void;
  loadSampleData: () => void;
  saveFabric: (fabric: Fabric) => Promise<void>;
  deleteFabric: (fabricId: string) => Promise<void>;
  saveRawMaterial: (material: RawMaterial) => Promise<RawMaterial>;
  deleteRawMaterial: (materialId: string) => Promise<void>;
  saveRawMaterialTransaction: (tx: RawMaterialTransaction) => Promise<void>;
  deleteRawMaterialTransaction: (txId: string) => Promise<void>;
  saveArticle: (article: Article) => Promise<void>;
  deleteArticle: (articleId: string) => Promise<void>;
  saveLot: (lot: Lot) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  saveCuttingEntry: (entry: CuttingEntry) => Promise<void>;
  deleteCuttingEntry: (entryId: string) => Promise<void>;
  saveStitchingEntry: (entry: StitchingEntry) => Promise<void>;
  deleteStitchingEntry: (entryId: string) => Promise<void>;
  saveFinishingEntry: (entry: FinishingEntry) => Promise<void>;
  deleteFinishingEntry: (entryId: string) => Promise<void>;
  savePressingEntry: (entry: PressingEntry) => Promise<void>;
  deletePressingEntry: (entryId: string) => Promise<void>;
  savePackingEntry: (entry: PackingEntry) => Promise<void>;
  deletePackingEntry: (entryId: string) => Promise<void>;
  saveDispatchEntry: (entry: DispatchEntry) => Promise<void>;
  deleteDispatchEntry: (entryId: string) => Promise<void>;
  saveCutPcsEntry: (entry: CutPcsEntry) => Promise<void>;
  deleteCutPcsEntry: (entryId: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

async function loadFromsupabase(): Promise<AppData> {
  const [
    { data: fabrics },
    { data: fabricColors },
    { data: rawMaterials },
    { data: rawMaterialTransactions },
    { data: articles },
    { data: articleSizes },
    { data: articleMaterials },
    { data: lots },
    { data: lotColorPlans },
    { data: lotSizePlans },
    { data: cuttings },
    { data: cuttingColorSizes },
    { data: stitchings },
    { data: stitchingColorSizes },
    { data: finishings },
    { data: finishingColorSizes },
    { data: pressings },
    { data: pressingColorSizes },
    { data: packings },
    { data: packingSizeBoxes },
    { data: packingBoxContents },
    { data: dispatches },
    { data: dispatchBoxes },
    { data: cutPcsEntries },
    { data: history },
    { data: settings },
  ] = await Promise.all([
    supabase.from('fabrics').select('*').order('created_at'),
    supabase.from('fabric_colors').select('*').order('created_at'),
    supabase.from('raw_materials').select('*').order('created_at'),
    supabase.from('raw_material_transactions').select('*').order('created_at'),
    supabase.from('articles').select('*').order('created_at'),
    supabase.from('article_size_consumption').select('*'),
    supabase.from('article_material_consumption').select('*'),
    supabase.from('lots').select('*').order('created_at'),
    supabase.from('lot_color_plans').select('*'),
    supabase.from('lot_size_plans').select('*'),
    supabase.from('cutting_entries').select('*').order('created_at'),
    supabase.from('cutting_color_sizes').select('*'),
    supabase.from('stitching_entries').select('*').order('created_at'),
    supabase.from('stitching_color_sizes').select('*'),
    supabase.from('finishing_entries').select('*').order('created_at'),
    supabase.from('finishing_color_sizes').select('*'),
    supabase.from('pressing_entries').select('*').order('created_at'),
    supabase.from('pressing_color_sizes').select('*'),
    supabase.from('packing_entries').select('*').order('created_at'),
    supabase.from('packing_size_boxes').select('*'),
    supabase.from('packing_box_contents').select('*'),
    supabase.from('dispatch_entries').select('*').order('created_at'),
    supabase.from('dispatch_boxes').select('*'),
    supabase.from('cut_pcs_entries').select('*').order('created_at'),
    supabase.from('history_events').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('app_settings').select('*').maybeSingle(),
  ]);

  const fc = (fabricColors ?? []) as DbFabricColor[];
  const as_ = (articleSizes ?? []) as DbArticleSizeConsumption[];
  const am = (articleMaterials ?? []) as DbArticleMaterialConsumption[];
  const lcp = (lotColorPlans ?? []) as DbLotColorPlan[];
  const lsp = (lotSizePlans ?? []) as DbLotSizePlan[];
  const ccs = (cuttingColorSizes ?? []) as DbCuttingColorSize[];
  const scs = (stitchingColorSizes ?? []) as DbStitchingColorSize[];
  const fcs = (finishingColorSizes ?? []) as DbFinishingColorSize[];
  const pcs = (pressingColorSizes ?? []) as DbPressingColorSize[];
  const psb = (packingSizeBoxes ?? []) as DbPackingSizeBox[];
  const pbc = (packingBoxContents ?? []) as DbPackingBoxContent[];
  const db = (dispatchBoxes ?? []) as DbDispatchBox[];

  return {
    fabrics: ((fabrics ?? []) as DbFabric[]).map((f) => dbToFabric(f, fc)),
    rawMaterials: ((rawMaterials ?? []) as DbRawMaterial[]).map(dbToRawMaterial),
    rawMaterialTransactions: ((rawMaterialTransactions ?? []) as DbRawMaterialTransaction[]).map(dbToRawMaterialTransaction),
    articles: ((articles ?? []) as DbArticle[]).map((a) => dbToArticle(a, as_, am)),
    lots: ((lots ?? []) as DbLot[]).map((l) => dbToLot(l, lcp, lsp)),
    cuttings: ((cuttings ?? []) as DbCuttingEntry[]).map((c) => dbToCuttingEntry(c, ccs)),
    stitchings: ((stitchings ?? []) as DbStitchingEntry[]).map((s) => dbToStitchingEntry(s, scs)),
    finishings: ((finishings ?? []) as DbFinishingEntry[]).map((f) => dbToFinishingEntry(f, fcs)),
    pressings: ((pressings ?? []) as DbPressingEntry[]).map((p) => dbToPressingEntry(p, pcs)),
    packings: ((packings ?? []) as DbPackingEntry[]).map((p) => dbToPackingEntry(p, psb, pbc)),
    dispatches: ((dispatches ?? []) as DbDispatchEntry[]).map((d) => dbToDispatchEntry(d, db)),
    cutPcsEntries: ((cutPcsEntries ?? []) as DbCutPcsEntry[]).map(dbToCutPcsEntry),
    history: ((history ?? []) as DbHistoryEvent[]).map(dbToHistoryEvent),
    settings: settings ? dbToSettings(settings as DbAppSettings) : clone(defaultData.settings),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(clone(defaultData));
  const [loading, setLoading] = useState(true);
  const settingsIdRef = useRef<string | null>(null);
  const dataRef = useRef<AppData>(clone(defaultData));

  const setData = useCallback((updater: (prev: AppData) => AppData) => {
    setDataState((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
  }, []);

  const setDataFromLoad = (loaded: AppData) => {
    dataRef.current = loaded;
    setDataState(loaded);
  };

  useEffect(() => {
    loadFromsupabase()
      .then((loaded) => {
        setDataFromLoad(loaded);
        supabase.from('app_settings').select('id').maybeSingle().then(({ data: s }) => {
          if (s) settingsIdRef.current = (s as { id: string }).id;
        });
      })
      .catch(() => setDataFromLoad(clone(defaultData)))
      .finally(() => setLoading(false));
  }, []);

  const addHistory = useCallback(async (module: string, action: 'Create' | 'Edit' | 'Delete', description: string) => {
    const { data: inserted } = await supabase
      .from('history_events').insert({ module, action, description }).select('id, created_at').maybeSingle();
    const id = (inserted as { id: string; created_at: string } | null)?.id ?? uid('h_');
    const timestamp = (inserted as { id: string; created_at: string } | null)?.created_at ?? now();
    setDataState((prev) => {
      const next = { ...prev, history: [{ id, module, action, description, timestamp }, ...prev.history].slice(0, 200) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Settings ───────────────────────────────────────────────────────────────

  const saveSettings = useCallback(async (settings: Settings) => {
    const row = { company_name: settings.companyName, default_unit: settings.defaultUnit };
    if (settingsIdRef.current) {
      await supabase.from('app_settings').update(row).eq('id', settingsIdRef.current);
    } else {
      const { data: inserted } = await supabase.from('app_settings').insert(row).select('id').maybeSingle();
      if (inserted) settingsIdRef.current = (inserted as { id: string }).id;
    }
    setDataState((prev) => {
      const next = { ...prev, settings };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Fabric ─────────────────────────────────────────────────────────────────

  const saveFabric = useCallback(async (fabric: Fabric) => {
    const isEdit = dataRef.current.fabrics.some((f) => f.id === fabric.id);
    let savedFabric = fabric;
  
    if (isEdit) {
      await supabase.from('fabrics').update(fabricToDb(fabric)).eq('id', fabric.id);
  
      // Update colors in-place to preserve their IDs (lot_color_plans references them)
      const oldColors = dataRef.current.fabrics.find((f) => f.id === fabric.id)?.colors ?? [];
      const oldColorIds = new Set(oldColors.map((c) => c.id));
      const newColorIds = new Set(fabric.colors.map((c) => c.id));
  
      // Delete removed colors
      const removedIds = oldColors.filter((c) => !newColorIds.has(c.id)).map((c) => c.id);
      if (removedIds.length > 0) {
        await supabase.from('fabric_colors').delete().in('id', removedIds);
      }
  
      // Update existing colors in-place (preserves IDs)
      for (const c of fabric.colors.filter((c) => oldColorIds.has(c.id))) {
        await supabase.from('fabric_colors')
          .update({ name: c.name, rolls: c.rolls, stock: c.stock, used: c.used })
          .eq('id', c.id);
      }
  
      // Insert genuinely new colors
      const newColors = fabric.colors.filter((c) => !oldColorIds.has(c.id));
      if (newColors.length > 0) {
        const { data: insertedColors } = await Bolt Database
          .from('fabric_colors')
          .insert(newColors.map((c) => ({ fabric_id: fabric.id, name: c.name, rolls: c.rolls, stock: c.stock, used: c.used })))
          .select('id, name');
        if (insertedColors) {
          const colorMap = new Map((insertedColors as { id: string; name: string }[]).map((r) => [r.name, r.id]));
          savedFabric = {
            ...savedFabric,
            colors: savedFabric.colors.map((c) => oldColorIds.has(c.id) ? c : { ...c, id: colorMap.get(c.name) ?? c.id }),
          };
        }
      }
    } else {
      const { data: row } = await supabase.from('fabrics').insert(fabricToDb(fabric)).select('id, created_at').maybeSingle();
      if (row) savedFabric = { ...fabric, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
  
      if (savedFabric.colors.length > 0) {
        const { data: insertedColors } = await Bolt Database
          .from('fabric_colors')
          .insert(savedFabric.colors.map((c) => fabricColorToDb(c, savedFabric.id)))
          .select('id, name');
        if (insertedColors) {
          const colorMap = new Map((insertedColors as { id: string; name: string }[]).map((r) => [r.name, r.id]));
          savedFabric = {
            ...savedFabric,
            colors: savedFabric.colors.map((c) => ({ ...c, id: colorMap.get(c.name) ?? c.id })),
          };
        }
      }
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        fabrics: isEdit
          ? prev.fabrics.map((f) => (f.id === fabric.id ? savedFabric : f))
          : [...prev.fabrics, savedFabric],
      };
      dataRef.current = next;
      return next;
    });
  }, []);


  const deleteFabric = useCallback(async (fabricId: string) => {
    await supabase.from('fabrics').delete().eq('id', fabricId);
    setDataState((prev) => {
      const next = { ...prev, fabrics: prev.fabrics.filter((f) => f.id !== fabricId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Raw Material ───────────────────────────────────────────────────────────

  const saveRawMaterial = useCallback(async (material: RawMaterial): Promise<RawMaterial> => {
    const isEdit = dataRef.current.rawMaterials.some((m) => m.id === material.id);
    let savedMaterial = material;
    if (isEdit) {
      await supabase.from('raw_materials').update(rawMaterialToDb(material)).eq('id', material.id);
    } else {
      const { data: row } = await supabase.from('raw_materials').insert(rawMaterialToDb(material)).select('id, created_at').maybeSingle();
      if (row) savedMaterial = { ...material, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }
    setDataState((prev) => {
      const next = {
        ...prev,
        rawMaterials: isEdit
          ? prev.rawMaterials.map((m) => (m.id === material.id ? savedMaterial : m))
          : [...prev.rawMaterials, savedMaterial],
      };
      dataRef.current = next;
      return next;
    });
    return savedMaterial;
  }, []) as (material: RawMaterial) => Promise<RawMaterial>;

  const deleteRawMaterial = useCallback(async (materialId: string) => {
    await supabase.from('raw_materials').delete().eq('id', materialId);
    setDataState((prev) => {
      const next = { ...prev, rawMaterials: prev.rawMaterials.filter((m) => m.id !== materialId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  const saveRawMaterialTransaction = useCallback(async (tx: RawMaterialTransaction) => {
    const isEdit = dataRef.current.rawMaterialTransactions.some((t) => t.id === tx.id);
    const row = { id: tx.id, material_id: tx.materialId, type: tx.type, qty: tx.qty, notes: tx.notes, date: tx.date };
    if (isEdit) {
      await supabase.from('raw_material_transactions').update(row).eq('id', tx.id);
    } else {
      await supabase.from('raw_material_transactions').insert(row);
    }
    const allTx = isEdit
      ? dataRef.current.rawMaterialTransactions.map((t) => (t.id === tx.id ? tx : t))
      : [...dataRef.current.rawMaterialTransactions, tx];
    const materialTx = allTx.filter((t) => t.materialId === tx.materialId);
    const currentStock = materialTx.reduce((sum, t) => (t.type === 'Issue' ? sum - t.qty : sum + t.qty), 0);
    await supabase.from('raw_materials').update({ current_stock: currentStock }).eq('id', tx.materialId);
    setDataState((prev) => {
      const rawMaterialTransactions = isEdit
        ? prev.rawMaterialTransactions.map((t) => (t.id === tx.id ? tx : t))
        : [...prev.rawMaterialTransactions, tx];
      const rawMaterials = prev.rawMaterials.map((m) => m.id === tx.materialId ? { ...m, currentStock } : m);
      const next = { ...prev, rawMaterialTransactions, rawMaterials };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteRawMaterialTransaction = useCallback(async (txId: string) => {
    const tx = dataRef.current.rawMaterialTransactions.find((t) => t.id === txId);
    await supabase.from('raw_material_transactions').delete().eq('id', txId);
    if (tx) {
      const remaining = dataRef.current.rawMaterialTransactions.filter((t) => t.id !== txId && t.materialId === tx.materialId);
      const currentStock = remaining.reduce((sum, t) => (t.type === 'Issue' ? sum - t.qty : sum + t.qty), 0);
      await supabase.from('raw_materials').update({ current_stock: currentStock }).eq('id', tx.materialId);
      setDataState((prev) => {
        const rawMaterialTransactions = prev.rawMaterialTransactions.filter((t) => t.id !== txId);
        const rawMaterials = prev.rawMaterials.map((m) => m.id === tx.materialId ? { ...m, currentStock } : m);
        const next = { ...prev, rawMaterialTransactions, rawMaterials };
        dataRef.current = next;
        return next;
      });
    }
  }, []);

  // ── Article ────────────────────────────────────────────────────────────────

  const saveArticle = useCallback(async (article: Article) => {
    const isEdit = dataRef.current.articles.some((a) => a.id === article.id);
    let savedArticle = article;

    if (isEdit) {
      await supabase.from('articles').update(articleToDb(article)).eq('id', article.id);
      await supabase.from('article_size_consumption').delete().eq('article_id', article.id);
      await supabase.from('article_material_consumption').delete().eq('article_id', article.id);
    } else {
      const { data: row } = await supabase.from('articles').insert(articleToDb(article)).select('id, created_at').maybeSingle();
      if (row) savedArticle = { ...article, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const sizeRows = articleSizeConsumptionToDb(savedArticle);
    if (sizeRows.length > 0) await supabase.from('article_size_consumption').insert(sizeRows);
    const matRows = articleMaterialConsumptionToDb(savedArticle);
    if (matRows.length > 0) {
      const { data: insertedMats } = await supabase.from('article_material_consumption').insert(matRows).select('id, material_id');
      if (insertedMats && !isEdit) {
        const matMap = new Map((insertedMats as { id: string; material_id: string }[]).map((r) => [r.material_id, r.id]));
        savedArticle = {
          ...savedArticle,
          consumptionSheet: savedArticle.consumptionSheet.map((cr) => ({ ...cr, id: matMap.get(cr.materialId) ?? cr.id })),
        };
      }
    }

    setDataState((prev) => {
      const next = {
        ...prev,
        articles: isEdit
          ? prev.articles.map((a) => (a.id === article.id ? savedArticle : a))
          : [...prev.articles, savedArticle],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteArticle = useCallback(async (articleId: string) => {
    await supabase.from('articles').delete().eq('id', articleId);
    setDataState((prev) => {
      const next = { ...prev, articles: prev.articles.filter((a) => a.id !== articleId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Lot ────────────────────────────────────────────────────────────────────

  const saveLot = useCallback(async (lot: Lot) => {
    const isEdit = dataRef.current.lots.some((l) => l.id === lot.id);
    let savedLot = lot;

    if (isEdit) {
      await supabase.from('lots').update(lotToDb(lot)).eq('id', lot.id);
      await supabase.from('lot_color_plans').delete().eq('lot_id', lot.id);
      await supabase.from('lot_size_plans').delete().eq('lot_id', lot.id);
    } else {
      const { data: row } = await supabase.from('lots').insert(lotToDb(lot)).select('id, created_at').maybeSingle();
      if (row) savedLot = { ...lot, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const cpRows = lotColorPlansToDb(savedLot);
    if (cpRows.length > 0) await supabase.from('lot_color_plans').insert(cpRows);
    const spRows = lotSizePlansToDb(savedLot);
    if (spRows.length > 0) await supabase.from('lot_size_plans').insert(spRows);

    setDataState((prev) => {
      const next = {
        ...prev,
        lots: isEdit
          ? prev.lots.map((l) => (l.id === lot.id ? savedLot : l))
          : [...prev.lots, savedLot],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteLot = useCallback(async (lotId: string) => {
    await supabase.from('lots').delete().eq('id', lotId);
    setDataState((prev) => {
      const next = { ...prev, lots: prev.lots.filter((l) => l.id !== lotId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Cutting ────────────────────────────────────────────────────────────────

  const saveCuttingEntry = useCallback(async (entry: CuttingEntry) => {
    const isEdit = dataRef.current.cuttings.some((c) => c.id === entry.id);
    let savedEntry = entry;

    if (isEdit) {
      await supabase.from('cutting_entries').update(cuttingEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('cutting_color_sizes').delete().eq('cutting_id', entry.id);
    } else {
      const { data: row } = await supabase.from('cutting_entries').insert(cuttingEntryToDb(entry)).select('id, created_at').maybeSingle();
      if (row) savedEntry = { ...entry, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const csRows = cuttingColorSizesToDb(savedEntry);
    if (csRows.length > 0) await supabase.from('cutting_color_sizes').insert(csRows);

    setDataState((prev) => {
      const next = {
        ...prev,
        cuttings: isEdit
          ? prev.cuttings.map((c) => (c.id === entry.id ? savedEntry : c))
          : [...prev.cuttings, savedEntry],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteCuttingEntry = useCallback(async (entryId: string) => {
    await supabase.from('cutting_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, cuttings: prev.cuttings.filter((c) => c.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Stitching ──────────────────────────────────────────────────────────────

  const saveStitchingEntry = useCallback(async (entry: StitchingEntry) => {
    const isEdit = dataRef.current.stitchings.some((s) => s.id === entry.id);
    if (isEdit) {
      await supabase.from('stitching_entries').update(stitchingEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('stitching_color_sizes').delete().eq('stitching_id', entry.id);
    } else {
      await supabase.from('stitching_entries').insert(stitchingEntryToDb(entry));
    }
    const csRows = stitchingColorSizesToDb(entry);
    if (csRows.length > 0) await supabase.from('stitching_color_sizes').insert(csRows);
    setDataState((prev) => {
      const next = {
        ...prev,
        stitchings: isEdit
          ? prev.stitchings.map((s) => (s.id === entry.id ? entry : s))
          : [...prev.stitchings, entry],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteStitchingEntry = useCallback(async (entryId: string) => {
    await supabase.from('stitching_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, stitchings: prev.stitchings.filter((s) => s.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Finishing ──────────────────────────────────────────────────────────────

  const saveFinishingEntry = useCallback(async (entry: FinishingEntry) => {
    const isEdit = dataRef.current.finishings.some((f) => f.id === entry.id);
    let savedEntry = entry;

    if (isEdit) {
      await supabase.from('finishing_entries').update(finishingEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('finishing_color_sizes').delete().eq('finishing_id', entry.id);
    } else {
      const { data: row } = await supabase.from('finishing_entries').insert(finishingEntryToDb(entry)).select('id, created_at').maybeSingle();
      if (row) savedEntry = { ...entry, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const csRows = finishingColorSizesToDb(savedEntry);
    if (csRows.length > 0) await supabase.from('finishing_color_sizes').insert(csRows);

    setDataState((prev) => {
      const next = {
        ...prev,
        finishings: isEdit
          ? prev.finishings.map((f) => (f.id === entry.id ? savedEntry : f))
          : [...prev.finishings, savedEntry],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteFinishingEntry = useCallback(async (entryId: string) => {
    await supabase.from('finishing_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, finishings: prev.finishings.filter((f) => f.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Pressing ───────────────────────────────────────────────────────────────

  const savePressingEntry = useCallback(async (entry: PressingEntry) => {
    const isEdit = dataRef.current.pressings.some((p) => p.id === entry.id);
    let savedEntry = entry;

    if (isEdit) {
      await supabase.from('pressing_entries').update(pressingEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('pressing_color_sizes').delete().eq('pressing_id', entry.id);
    } else {
      const { data: row } = await supabase.from('pressing_entries').insert(pressingEntryToDb(entry)).select('id, created_at').maybeSingle();
      if (row) savedEntry = { ...entry, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const csRows = pressingColorSizesToDb(savedEntry);
    if (csRows.length > 0) await supabase.from('pressing_color_sizes').insert(csRows);

    setDataState((prev) => {
      const next = {
        ...prev,
        pressings: isEdit
          ? prev.pressings.map((p) => (p.id === entry.id ? savedEntry : p))
          : [...prev.pressings, savedEntry],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deletePressingEntry = useCallback(async (entryId: string) => {
    await supabase.from('pressing_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, pressings: prev.pressings.filter((p) => p.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Packing ────────────────────────────────────────────────────────────────

  const computeCutPcsForLot = (lotId: string, updatedPackings: PackingEntry[], packingDate: string, packingId: string): CutPcsEntry[] => {
    const lot = dataRef.current.lots.find((l) => l.id === lotId);
    if (!lot) return [];
    const tempData = { ...dataRef.current, packings: updatedPackings };
    const pressMap = getLotColorSizePress(tempData, lotId);
    const packedMap = getPackedColorSize(tempData, lotId);
    const sizeLeft = new Map<Size, number>();
    for (const colorId of lot.colorIds) {
      for (const size of lot.sizes as Size[]) {
        const pressed = pressMap.get(colorId)?.get(size) ?? 0;
        const packed = packedMap.get(colorId)?.get(size) ?? 0;
        sizeLeft.set(size, (sizeLeft.get(size) ?? 0) + Math.max(0, pressed - packed));
      }
    }
    const entries: CutPcsEntry[] = [];
    for (const [size, leftPcs] of sizeLeft) {
      if (leftPcs > 0) {
        entries.push({ id: uid('cp_'), lotId, packingId, colorId: '', size, leftPcs, date: packingDate, status: 'Available', createdAt: now() });
      }
    }
    return entries;
  };

  const savePackingEntry = useCallback(async (entry: PackingEntry) => {
    const isEdit = dataRef.current.packings.some((p) => p.id === entry.id);
    let savedEntry = entry;

    if (isEdit) {
      await supabase.from('packing_entries').update(packingEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('packing_size_boxes').delete().eq('packing_id', entry.id);
    } else {
      const { data: row } = await supabase.from('packing_entries').insert(packingEntryToDb(entry)).select('id, created_at').maybeSingle();
      if (row) savedEntry = { ...entry, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    for (const box of savedEntry.boxes) {
      const { data: insertedBox } = await supabase
        .from('packing_size_boxes')
        .insert({ packing_id: savedEntry.id, size: box.size, boxes: box.boxes, pcs_per_box: box.pcsPerBox })
        .select('id')
        .maybeSingle();
      if (insertedBox && box.contents.length > 0) {
        await supabase.from('packing_box_contents').insert(
          box.contents.map((c) => ({ packing_size_box_id: (insertedBox as { id: string }).id, color_id: c.colorId, pcs: c.pcs }))
        );
      }
    }

    const updatedPackings = isEdit
      ? dataRef.current.packings.map((p) => (p.id === entry.id ? savedEntry : p))
      : [...dataRef.current.packings, savedEntry];
    const newCutEntries = computeCutPcsForLot(savedEntry.lotId, updatedPackings, savedEntry.date, savedEntry.id);

    await supabase.from('cut_pcs_entries').delete().eq('lot_id', savedEntry.lotId);
    if (newCutEntries.length > 0) {
      await supabase.from('cut_pcs_entries').insert(
        newCutEntries.map((ce) => ({ id: ce.id, lot_id: ce.lotId, packing_id: ce.packingId, color_id: ce.colorId, size: ce.size, left_pcs: ce.leftPcs, date: ce.date, status: ce.status }))
      );
    }

    setDataState((prev) => {
      const packings = isEdit ? prev.packings.map((p) => (p.id === entry.id ? savedEntry : p)) : [...prev.packings, savedEntry];
      const otherCut = prev.cutPcsEntries.filter((c) => c.lotId !== savedEntry.lotId);
      const next = { ...prev, packings, cutPcsEntries: [...otherCut, ...newCutEntries] };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deletePackingEntry = useCallback(async (entryId: string) => {
    const entry = dataRef.current.packings.find((p) => p.id === entryId);
    await supabase.from('packing_entries').delete().eq('id', entryId);

    const remainingPackings = dataRef.current.packings.filter((p) => p.id !== entryId);
    let newCutEntries: CutPcsEntry[] = [];
    if (entry) {
      newCutEntries = computeCutPcsForLot(entry.lotId, remainingPackings, entry.date, entryId);
      await supabase.from('cut_pcs_entries').delete().eq('lot_id', entry.lotId);
      if (newCutEntries.length > 0) {
        await supabase.from('cut_pcs_entries').insert(
          newCutEntries.map((ce) => ({ id: ce.id, lot_id: ce.lotId, packing_id: ce.packingId, color_id: ce.colorId, size: ce.size, left_pcs: ce.leftPcs, date: ce.date, status: ce.status }))
        );
      }
    }

    setDataState((prev) => {
      const packings = prev.packings.filter((p) => p.id !== entryId);
      const lotId = entry?.lotId;
      const otherCut = lotId ? prev.cutPcsEntries.filter((c) => c.lotId !== lotId) : prev.cutPcsEntries;
      const next = { ...prev, packings, cutPcsEntries: [...otherCut, ...newCutEntries] };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Cut PCS ────────────────────────────────────────────────────────────────

  const saveCutPcsEntry = useCallback(async (entry: CutPcsEntry) => {
    const isEdit = dataRef.current.cutPcsEntries.some((c) => c.id === entry.id);
    if (isEdit) {
      await supabase.from('cut_pcs_entries').update({ left_pcs: entry.leftPcs, status: entry.status, date: entry.date }).eq('id', entry.id);
    } else {
      await supabase.from('cut_pcs_entries').insert({ id: entry.id, lot_id: entry.lotId, packing_id: entry.packingId || null, color_id: entry.colorId, size: entry.size, left_pcs: entry.leftPcs, date: entry.date, status: entry.status });
    }
    setDataState((prev) => {
      const next = { ...prev, cutPcsEntries: isEdit ? prev.cutPcsEntries.map((c) => (c.id === entry.id ? entry : c)) : [...prev.cutPcsEntries, entry] };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteCutPcsEntry = useCallback(async (entryId: string) => {
    await supabase.from('cut_pcs_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, cutPcsEntries: prev.cutPcsEntries.filter((c) => c.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Dispatch ───────────────────────────────────────────────────────────────

  const saveDispatchEntry = useCallback(async (entry: DispatchEntry) => {
    const isEdit = dataRef.current.dispatches.some((d) => d.id === entry.id);
    let savedEntry = entry;

    if (isEdit) {
      await supabase.from('dispatch_entries').update(dispatchEntryToDb(entry)).eq('id', entry.id);
      await supabase.from('dispatch_boxes').delete().eq('dispatch_id', entry.id);
    } else {
      const { data: row } = await supabase.from('dispatch_entries').insert(dispatchEntryToDb(entry)).select('id, created_at').maybeSingle();
      if (row) savedEntry = { ...entry, id: (row as { id: string; created_at: string }).id, createdAt: (row as { id: string; created_at: string }).created_at };
    }

    const dbRows = dispatchBoxesToDb(savedEntry);
    if (dbRows.length > 0) await supabase.from('dispatch_boxes').insert(dbRows);

    setDataState((prev) => {
      const next = {
        ...prev,
        dispatches: isEdit
          ? prev.dispatches.map((d) => (d.id === entry.id ? savedEntry : d))
          : [...prev.dispatches, savedEntry],
      };
      dataRef.current = next;
      return next;
    });
  }, []);

  const deleteDispatchEntry = useCallback(async (entryId: string) => {
    await supabase.from('dispatch_entries').delete().eq('id', entryId);
    setDataState((prev) => {
      const next = { ...prev, dispatches: prev.dispatches.filter((d) => d.id !== entryId) };
      dataRef.current = next;
      return next;
    });
  }, []);

  // ── Reset / Sample Data ────────────────────────────────────────────────────

  const resetData = useCallback(async () => {
    await Promise.all([
      supabase.from('dispatch_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('packing_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('pressing_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('finishing_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('stitching_entries').delete().neq('id', 'x'),
      supabase.from('cutting_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('cut_pcs_entries').delete().neq('id', 'x'),
      supabase.from('raw_material_transactions').delete().neq('id', 'x'),
      supabase.from('lots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('raw_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('fabrics').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('history_events').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
    const empty = clone(defaultData);
    dataRef.current = empty;
    setDataState(empty);
  }, []);

  const loadSampleData = useCallback(async () => {
    await resetData();
    const sample = generateSampleData();
    for (const fabric of sample.fabrics) await saveFabric(fabric);
    // After saveFabric, colors now have real UUIDs from DB. We need to reload to get them.
    const { data: freshFabrics } = await supabase.from('fabrics').select('*').order('created_at');
    const { data: freshColors } = await supabase.from('fabric_colors').select('*').order('created_at');
    const fc = (freshColors ?? []) as DbFabricColor[];
    const mappedFabrics = ((freshFabrics ?? []) as DbFabric[]).map((f) => dbToFabric(f, fc));
    // Build a color name→id map for the first fabric
    const colorNameToId = new Map(mappedFabrics.flatMap((f) => f.colors.map((c) => [c.name, c.id])));
    const sampledMats: RawMaterial[] = [];
    for (const mat of sample.rawMaterials) {
      await saveRawMaterial(mat);
      sampledMats.push(mat);
    }
    const { data: freshMats } = await supabase.from('raw_materials').select('id, name').order('created_at');
    const matNameToId = new Map((freshMats ?? []).map((m: { id: string; name: string }) => [m.name, m.id]));
    // Remap article references
    const remappedArticles = sample.articles.map((a) => ({
      ...a,
      fabricId: mappedFabrics[0]?.id ?? a.fabricId,
      consumptionSheet: a.consumptionSheet.map((cr) => ({
        ...cr,
        materialId: matNameToId.get(sampledMats.find((m) => m.id === cr.materialId)?.name ?? '') ?? cr.materialId,
      })),
    }));
    for (const article of remappedArticles) await saveArticle(article);
    const { data: freshArticles } = await supabase.from('articles').select('id, name').order('created_at');
    const artNameToId = new Map((freshArticles ?? []).map((a: { id: string; name: string }) => [a.name, a.id]));
    // Remap lot references
    const remappedLots = sample.lots.map((l) => ({
      ...l,
      articleId: artNameToId.get(remappedArticles[0]?.name ?? '') ?? l.articleId,
      fabricId: mappedFabrics[0]?.id ?? l.fabricId,
      colorIds: l.colorIds.map((cid) => {
        const origColor = sample.fabrics[0]?.colors.find((c) => c.id === cid);
        return origColor ? (colorNameToId.get(origColor.name) ?? cid) : cid;
      }),
      colorPlans: l.colorPlans.map((cp) => {
        const origColor = sample.fabrics[0]?.colors.find((c) => c.id === cp.colorId);
        return { ...cp, colorId: origColor ? (colorNameToId.get(origColor.name) ?? cp.colorId) : cp.colorId };
      }),
    }));
    for (const lot of remappedLots) await saveLot(lot);
    await supabase.from('history_events').insert({ module: 'System', action: 'Create', description: 'Sample data loaded' });
    // Reload everything fresh
    const loaded = await loadFromsupabase();
    setDataFromLoad(loaded);
  }, [resetData, saveFabric, saveRawMaterial, saveArticle, saveLot]);

  return (
    <StoreContext.Provider value={{
      data, loading, setData, addHistory, resetData, loadSampleData,
      saveFabric, deleteFabric, saveRawMaterial, deleteRawMaterial,
      saveRawMaterialTransaction, deleteRawMaterialTransaction,
      saveArticle, deleteArticle, saveLot, deleteLot,
      saveCuttingEntry, deleteCuttingEntry,
      saveStitchingEntry, deleteStitchingEntry,
      saveFinishingEntry, deleteFinishingEntry,
      savePressingEntry, deletePressingEntry,
      savePackingEntry, deletePackingEntry,
      saveDispatchEntry, deleteDispatchEntry,
      saveCutPcsEntry, deleteCutPcsEntry,
      saveSettings,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// ─── Sample data generator ────────────────────────────────────────────────────

function generateSampleData(): { fabrics: import('../types').Fabric[]; rawMaterials: RawMaterial[]; articles: import('../types').Article[]; lots: import('../types').Lot[] } {
  const fabricId = 'sample-fabric-placeholder';
  const colors = [
    { id: 'c1', name: 'Black', rolls: 5, stock: 120, used: 0 },
    { id: 'c2', name: 'Grey', rolls: 3, stock: 80, used: 0 },
    { id: 'c3', name: 'Red', rolls: 2, stock: 50, used: 0 },
    { id: 'c4', name: 'Blue', rolls: 4, stock: 90, used: 0 },
  ];
  const fabrics: import('../types').Fabric[] = [{ id: fabricId, name: 'Dot Knit', unit: 'KG', colors, createdAt: now() }];

  const matFabric = uid('rm_');
  const matRib = uid('rm_');
  const matThread = uid('rm_');
  const matZip = uid('rm_');
  const matButton = uid('rm_');
  const matLabel = uid('rm_');
  const matPoly = uid('rm_');
  const matCarton = uid('rm_');
  const rawMaterials: RawMaterial[] = [
    { id: matFabric, name: 'Dot Knit Fabric', category: 'Fabric', unit: 'KG', purchasePrice: 310.5, supplier: 'Textile Hub', gst: 5, status: 'Active', remarks: '220 GSM', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matRib, name: 'Rib Collar', category: 'Rib', unit: 'Meter', purchasePrice: 18.75, supplier: 'Rib Co', gst: 5, status: 'Active', remarks: '', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matThread, name: 'Polyester Thread', category: 'Thread', unit: 'Meter', purchasePrice: 0.022, supplier: 'Thread Works', gst: 12, status: 'Active', remarks: 'Tex-40', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matZip, name: 'Nylon Zip', category: 'Zip', unit: 'PCS', purchasePrice: 12, supplier: 'Zip Mart', gst: 12, status: 'Active', remarks: '', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matButton, name: 'Plastic Button', category: 'Button', unit: 'Pair', purchasePrice: 1.25, supplier: 'Button Co', gst: 12, status: 'Active', remarks: '15mm', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matLabel, name: 'Care Label', category: 'Label', unit: 'PCS', purchasePrice: 0.85, supplier: 'Label Mart', gst: 12, status: 'Active', remarks: '', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matPoly, name: 'Poly Bag', category: 'Packing', unit: 'PCS', purchasePrice: 2, supplier: 'Pack Pro', gst: 18, status: 'Active', remarks: '', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
    { id: matCarton, name: 'Carton Box', category: 'Packing', unit: 'PCS', purchasePrice: 48, supplier: 'Pack Pro', gst: 18, status: 'Active', remarks: '', openingStock: 0, currentStock: 0, minStock: 0, createdAt: now() },
  ];

  const articleId = 'sample-article-placeholder';
  const articles: import('../types').Article[] = [{
    id: articleId, code: 'ART-001', name: 'Round Neck T-Shirt', fabricId,
    consumption: [
      { size: 'S', consumption: 0.18 }, { size: 'M', consumption: 0.2 }, { size: 'L', consumption: 0.22 },
      { size: 'XL', consumption: 0.24 }, { size: 'XXL', consumption: 0.26 },
    ],
    consumptionSheet: [
      { id: matFabric, materialId: matFabric, consumption: 0.285 },
      { id: matRib, materialId: matRib, consumption: 0.18 },
      { id: matThread, materialId: matThread, consumption: 32 },
      { id: matZip, materialId: matZip, consumption: 1 },
      { id: matButton, materialId: matButton, consumption: 2 },
      { id: matLabel, materialId: matLabel, consumption: 1 },
      { id: matPoly, materialId: matPoly, consumption: 1 },
      { id: matCarton, materialId: matCarton, consumption: 0.04 },
    ],
    createdAt: now(),
  }];

  const lotId = 'sample-lot-placeholder';
  const lotColors = ['c1', 'c2', 'c3'];
  const lots: import('../types').Lot[] = [{
    id: lotId, lotNo: 'LOT-001', articleId, fabricId,
    colorIds: lotColors, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colorPlans: lotColors.map((cId, i) => ({ colorId: cId, plannedFabric: 50, rollsSelected: i === 0 ? 2 : 1 })),
    sizePlans: [
      { size: 'S', plannedPcs: 100 }, { size: 'M', plannedPcs: 100 }, { size: 'L', plannedPcs: 100 },
      { size: 'XL', plannedPcs: 100 }, { size: 'XXL', plannedPcs: 100 },
    ],
    plannedProduction: 500, sellingPricePerPcs: 185, status: 'Active', createdAt: now(),
  }];

  return { fabrics, rawMaterials, articles, lots };
}
