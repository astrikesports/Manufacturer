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
  packingEntryToDb, packingSizeBoxesToDb,
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
  saveRawMaterial: (material: RawMaterial) => Promise<void>;
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

// ─── Load all data from Supabase ─────────────────────────────────────────────

async function loadFromSupabase(): Promise<AppData> {
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

// ─── Provider ────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(clone(defaultData));
  const [loading, setLoading] = useState(true);
  const settingsIdRef = useRef<string | null>(null);
  // Mirror of data for use inside useCallback closures without stale-closure issues
  const dataRef = useRef<AppData>(clone(defaultData));

  const setData = useCallback((updater: (prev: AppData) => AppData) => {
    setDataState((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
  }, []);

  // Keep dataRef in sync with state changes from the initial load
  const setDataFromLoad = (loaded: AppData) => {
    dataRef.current = loaded;
    setDataState(loaded);
  };

  useEffect(() => {
    loadFromSupabase()
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
    const row = {
      module,
      action,
      description
    };
    
    const { data: inserted, error } = await supabase
      .from("history_events")
      .insert(row)
      .select()
      .single();
    
    if (error) throw error;
    setDataState((prev) => {
      const next = { ...prev, history: [{ ...row, timestamp: now() }, ...prev.history].slice(0, 200) };
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
      const { error } = await supabase
        .from("fabrics")
        .update(fabricToDb(fabric))
        .eq("id", fabric.id);
  
      if (error) throw error;
  
      // Existing colors
      const existingColors =
        dataRef.current.fabrics.find((f) => f.id === fabric.id)?.colors ?? [];
  
      // Update or Insert colors
      for (const color of fabric.colors) {
        const oldColor = existingColors.find((c) => c.id === color.id);
  
        if (oldColor) {
          const { error } = await supabase
            .from("fabric_colors")
            .update({
              name: color.name,
              rolls: color.rolls,
              stock: color.stock,
              used: color.used,
            })
            .eq("id", color.id);
  
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("fabric_colors")
            .insert({
              fabric_id: fabric.id,
              name: color.name,
              rolls: color.rolls,
              stock: color.stock,
              used: color.used,
            })
            .select()
            .single();
  
          if (error) throw error;
  
          color.id = data.id;
        }
      }
  
      // Delete removed colors
      const deletedIds = existingColors
        .filter((c) => !fabric.colors.some((x) => x.id === c.id))
        .map((c) => c.id);
  
      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from("fabric_colors")
          .delete()
          .in("id", deletedIds);
  
        if (error) throw error;
      }
  
      savedFabric = { ...fabric };
  
    } else {
      const { data: newFabric, error } = await supabase
        .from("fabrics")
        .insert(fabricToDb(fabric))
        .select()
        .single();
  
      if (error) throw error;
  
      savedFabric = {
        ...fabric,
        id: newFabric.id,
      };
  
      if (savedFabric.colors.length > 0) {
        const { data: insertedColors, error } = await supabase
          .from("fabric_colors")
          .insert(
            savedFabric.colors.map((c) => ({
              fabric_id: savedFabric.id,
              name: c.name,
              rolls: c.rolls,
              stock: c.stock,
              used: c.used,
            }))
          )
          .select();
  
        if (error) throw error;
  
        savedFabric = {
          ...savedFabric,
          colors: insertedColors.map((c) => ({
            id: c.id,
            name: c.name,
            rolls: c.rolls,
            stock: c.stock,
            used: c.used,
          })),
        };
      }
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        fabrics: isEdit
          ? prev.fabrics.map((f) =>
              f.id === savedFabric.id ? savedFabric : f
            )
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

  const saveRawMaterial = useCallback(async (material: RawMaterial) => {
    const isEdit = dataRef.current.rawMaterials.some(
      (m) => m.id === material.id
    );
  
    let savedMaterial = material;
  
    if (isEdit) {
      const { error } = await supabase
        .from("raw_materials")
        .update(rawMaterialToDb(material))
        .eq("id", material.id);
  
      if (error) throw error;
    } else {
      const { data: newMaterial, error } = await supabase
        .from("raw_materials")
        .insert(rawMaterialToDb(material))
        .select()
        .single();
  
      if (error) throw error;
  
      savedMaterial = {
        ...material,
        id: newMaterial.id,
      };
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        rawMaterials: isEdit
          ? prev.rawMaterials.map((m) =>
              m.id === material.id ? savedMaterial : m
            )
          : [...prev.rawMaterials, savedMaterial],
      };
  
      dataRef.current = next;
      return next;
    });
  }, []);

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
    // Recompute current_stock for this material from all transactions
    const allTx = isEdit
      ? dataRef.current.rawMaterialTransactions.map((t) => (t.id === tx.id ? tx : t))
      : [...dataRef.current.rawMaterialTransactions, tx];
    const materialTx = allTx.filter((t) => t.materialId === tx.materialId);
    const currentStock = materialTx.reduce((sum, t) => {
      if (t.type === 'Issue') return sum - t.qty;
      return sum + t.qty;
    }, 0);
    await supabase.from('raw_materials').update({ current_stock: currentStock }).eq('id', tx.materialId);
    setDataState((prev) => {
      const rawMaterialTransactions = isEdit
        ? prev.rawMaterialTransactions.map((t) => (t.id === tx.id ? tx : t))
        : [...prev.rawMaterialTransactions, tx];
      const rawMaterials = prev.rawMaterials.map((m) =>
        m.id === tx.materialId ? { ...m, currentStock } : m
      );
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
      const currentStock = remaining.reduce((sum, t) => {
        if (t.type === 'Issue') return sum - t.qty;
        return sum + t.qty;
      }, 0);
      await supabase.from('raw_materials').update({ current_stock: currentStock }).eq('id', tx.materialId);
      setDataState((prev) => {
        const rawMaterialTransactions = prev.rawMaterialTransactions.filter((t) => t.id !== txId);
        const rawMaterials = prev.rawMaterials.map((m) =>
          m.id === tx.materialId ? { ...m, currentStock } : m
        );
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
      await supabase
        .from("articles")
        .update(articleToDb(article))
        .eq("id", article.id);
  
      await supabase
        .from("article_size_consumption")
        .delete()
        .eq("article_id", article.id);
  
      await supabase
        .from("article_material_consumption")
        .delete()
        .eq("article_id", article.id);
  
    } else {
      const { data: newArticle, error } = await supabase
        .from("articles")
        .insert(articleToDb(article))
        .select()
        .single();
  
      if (error) throw error;
  
      savedArticle = {
        ...article,
        id: newArticle.id,
      };
    }
  
    const sizeRows = articleSizeConsumptionToDb(savedArticle);
      if (sizeRows.length > 0) {
        const { error } = await supabase
          .from("article_size_consumption")
          .insert(sizeRows);
    
        if (error) throw error;
      }
    
      const matRows = articleMaterialConsumptionToDb(savedArticle);
      if (matRows.length > 0) {
        const { error } = await supabase
          .from("article_material_consumption")
          .insert(matRows);
    
        if (error) throw error;
      }
    
      setDataState((prev) => {
        const next = {
          ...prev,
          articles: isEdit
            ? prev.articles.map((a) =>
                a.id === article.id ? savedArticle : a
              )
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
      const { error } = await supabase
        .from("lots")
        .update(lotToDb(lot))
        .eq("id", lot.id);
  
      if (error) throw error;
  
      await supabase
        .from("lot_color_plans")
        .delete()
        .eq("lot_id", lot.id);
  
      await supabase
        .from("lot_size_plans")
        .delete()
        .eq("lot_id", lot.id);
  
    } else {
      const { data: newLot, error } = await supabase
        .from("lots")
        .insert(lotToDb(lot))
        .select("*")
        .single();
  
      if (error) throw error;
  
      savedLot = {
        ...lot,
        id: newLot.id,
      };
    }
  
    console.log("Original Lot:", lot.id);
    console.log("Saved Lot:", savedLot.id);
  
    const cpRows = lotColorPlansToDb(savedLot);
    console.log("CP Rows", cpRows);
  
    if (cpRows.length > 0) {
      const { error } = await supabase
        .from("lot_color_plans")
        .insert(cpRows);
  
      if (error) {
        console.error(error);
        throw error;
      }
    }
  
    const spRows = lotSizePlansToDb(savedLot);
    console.log("SP Rows", spRows);
  
    if (spRows.length > 0) {
      const { error } = await supabase
        .from("lot_size_plans")
        .insert(spRows);
  
      if (error) {
        console.error(error);
        throw error;
      }
    }
  
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
      const { error } = await supabase
        .from("cutting_entries")
        .update(cuttingEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      await supabase
        .from("cutting_color_sizes")
        .delete()
        .eq("cutting_id", entry.id);
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("cutting_entries")
        .insert(cuttingEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    const csRows = cuttingColorSizesToDb(savedEntry);
  
    console.log("Cutting Rows", JSON.stringify(csRows, null, 2));
  
    if (csRows.length > 0) {
      const { error } = await supabase
        .from("cutting_color_sizes")
        .insert(csRows);
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        cuttings: isEdit
          ? prev.cuttings.map((c) =>
              c.id === entry.id ? savedEntry : c
            )
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
  
    let savedEntry = entry;
  
    if (isEdit) {
      const { error } = await supabase
        .from("stitching_entries")
        .update(stitchingEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      await supabase
        .from("stitching_color_sizes")
        .delete()
        .eq("stitching_id", entry.id);
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("stitching_entries")
        .insert(stitchingEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    const csRows = stitchingColorSizesToDb(savedEntry);
  
    if (csRows.length > 0) {
      const { error } = await supabase
        .from("stitching_color_sizes")
        .insert(csRows);
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        stitchings: isEdit
          ? prev.stitchings.map((s) =>
              s.id === entry.id ? savedEntry : s
            )
          : [...prev.stitchings, savedEntry],
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
      const { error } = await supabase
        .from("finishing_entries")
        .update(finishingEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      await supabase
        .from("finishing_color_sizes")
        .delete()
        .eq("finishing_id", entry.id);
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("finishing_entries")
        .insert(finishingEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    const csRows = finishingColorSizesToDb(savedEntry);
  
    if (csRows.length > 0) {
      const { error } = await supabase
        .from("finishing_color_sizes")
        .insert(csRows);
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        finishings: isEdit
          ? prev.finishings.map((f) =>
              f.id === entry.id ? savedEntry : f
            )
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
      const { error } = await supabase
        .from("pressing_entries")
        .update(pressingEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      await supabase
        .from("pressing_color_sizes")
        .delete()
        .eq("pressing_id", entry.id);
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("pressing_entries")
        .insert(pressingEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    const csRows = pressingColorSizesToDb(savedEntry);
  
    if (csRows.length > 0) {
      const { error } = await supabase
        .from("pressing_color_sizes")
        .insert(csRows);
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        pressings: isEdit
          ? prev.pressings.map((p) =>
              p.id === entry.id ? savedEntry : p
            )
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
    // Aggregate across all colors per size — Cut PCS is size-only
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
        entries.push({ lotId, packingId, colorId: '', size, leftPcs, date: packingDate, status: 'Available', createdAt: now() });
      }
    }
    return entries;
  };

  const savePackingEntry = useCallback(async (entry: PackingEntry) => {
    const isEdit = dataRef.current.packings.some((p) => p.id === entry.id);
  
    let savedEntry = entry;
  
    if (isEdit) {
      const { error } = await supabase
        .from("packing_entries")
        .update(packingEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      await supabase
        .from("packing_size_boxes")
        .delete()
        .eq("packing_id", entry.id);
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("packing_entries")
        .insert(packingEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    // Insert Boxes
    for (const box of savedEntry.boxes) {
      const { data: insertedBox, error } = await supabase
        .from("packing_size_boxes")
        .insert({
          packing_id: savedEntry.id,
          size: box.size,
          boxes: box.boxes,
          pcs_per_box: box.pcsPerBox,
        })
        .select("id")
        .single();
  
      if (error) throw error;
  
      if (box.contents.length > 0) {
        const { error: contentError } = await supabase
          .from("packing_box_contents")
          .insert(
            box.contents.map((c) => ({
              packing_size_box_id: insertedBox.id,
              color_id: c.colorId,
              pcs: c.pcs,
            }))
          );
  
        if (contentError) throw contentError;
      }
    }
  
    // Compute Cut PCS
    const updatedPackings = isEdit
      ? dataRef.current.packings.map((p) =>
          p.id === entry.id ? savedEntry : p
        )
      : [...dataRef.current.packings, savedEntry];
  
    const newCutEntries = computeCutPcsForLot(
      savedEntry.lotId,
      updatedPackings,
      savedEntry.date,
      savedEntry.id
    );
  
    await supabase
      .from("cut_pcs_entries")
      .delete()
      .eq("lot_id", savedEntry.lotId);
  
    if (newCutEntries.length > 0) {
      const { error } = await supabase
        .from("cut_pcs_entries")
        .insert(
          newCutEntries.map((ce) => ({
            lot_id: ce.lotId,
            packing_id: ce.packingId,
            color_id: ce.colorId,
            size: ce.size,
            left_pcs: ce.leftPcs,
            date: ce.date,
            status: ce.status,
          }))
        );
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const packings = isEdit
        ? prev.packings.map((p) =>
            p.id === entry.id ? savedEntry : p
          )
        : [...prev.packings, savedEntry];
  
      const otherCut = prev.cutPcsEntries.filter(
        (c) => c.lotId !== savedEntry.lotId
      );
  
      const next = {
        ...prev,
        packings,
        cutPcsEntries: [...otherCut, ...newCutEntries],
      };
  
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
          newCutEntries.map((ce) => ({ lot_id: ce.lotId, packing_id: ce.packingId, color_id: ce.colorId, size: ce.size, left_pcs: ce.leftPcs, date: ce.date, status: ce.status }))
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
      const { error } = await supabase
        .from("dispatch_entries")
        .update(dispatchEntryToDb(entry))
        .eq("id", entry.id);
  
      if (error) throw error;
  
      const { error: deleteError } = await supabase
        .from("dispatch_boxes")
        .delete()
        .eq("dispatch_id", entry.id);
  
      if (deleteError) throw deleteError;
  
    } else {
      const { data: newEntry, error } = await supabase
        .from("dispatch_entries")
        .insert(dispatchEntryToDb(entry))
        .select()
        .single();
  
      if (error) throw error;
  
      savedEntry = {
        ...entry,
        id: newEntry.id,
      };
    }
  
    const dbRows = dispatchBoxesToDb(savedEntry);
  
    if (dbRows.length > 0) {
      const { error } = await supabase
        .from("dispatch_boxes")
        .insert(dbRows);
  
      if (error) throw error;
    }
  
    setDataState((prev) => {
      const next = {
        ...prev,
        dispatches: isEdit
          ? prev.dispatches.map((d) =>
              d.id === entry.id ? savedEntry : d
            )
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
    for (const mat of sample.rawMaterials) await saveRawMaterial(mat);
    for (const article of sample.articles) await saveArticle(article);
    for (const lot of sample.lots) await saveLot(lot);
    await supabase.from('history_events').insert({ module: 'System', action: 'Create', description: 'Sample data loaded' });
    setDataState((prev) => {
      const next = { ...prev, history: [{ module: 'System', action: 'Create', description: 'Sample data loaded', timestamp: now() }, ...prev.history] };
      dataRef.current = next;
      return next;
    });
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
  const fabricId = uid('f_');
  const colors = [
    { id: uid('c_'), name: 'Black', rolls: 5, stock: 120, used: 0 },
    { id: uid('c_'), name: 'Grey', rolls: 3, stock: 80, used: 0 },
    { id: uid('c_'), name: 'Red', rolls: 2, stock: 50, used: 0 },
    { id: uid('c_'), name: 'Blue', rolls: 4, stock: 90, used: 0 },
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
    { id: matFabric, name: 'Dot Knit Fabric', category: 'Fabric', unit: 'KG', purchasePrice: 310.5, supplier: 'Textile Hub', gst: 5, status: 'Active', remarks: '220 GSM', createdAt: now() },
    { id: matRib, name: 'Rib Collar', category: 'Rib', unit: 'Meter', purchasePrice: 18.75, supplier: 'Rib Co', gst: 5, status: 'Active', remarks: '', createdAt: now() },
    { id: matThread, name: 'Polyester Thread', category: 'Thread', unit: 'Meter', purchasePrice: 0.022, supplier: 'Thread Works', gst: 12, status: 'Active', remarks: 'Tex-40', createdAt: now() },
    { id: matZip, name: 'Nylon Zip', category: 'Zip', unit: 'PCS', purchasePrice: 12, supplier: 'Zip Mart', gst: 12, status: 'Active', remarks: '', createdAt: now() },
    { id: matButton, name: 'Plastic Button', category: 'Button', unit: 'Pair', purchasePrice: 1.25, supplier: 'Button Co', gst: 12, status: 'Active', remarks: '15mm', createdAt: now() },
    { id: matLabel, name: 'Care Label', category: 'Label', unit: 'PCS', purchasePrice: 0.85, supplier: 'Label Mart', gst: 12, status: 'Active', remarks: '', createdAt: now() },
    { id: matPoly, name: 'Poly Bag', category: 'Packing', unit: 'PCS', purchasePrice: 2, supplier: 'Pack Pro', gst: 18, status: 'Active', remarks: '', createdAt: now() },
    { id: matCarton, name: 'Carton Box', category: 'Packing', unit: 'PCS', purchasePrice: 48, supplier: 'Pack Pro', gst: 18, status: 'Active', remarks: '', createdAt: now() },
  ];

  const articleId = uid('a_');
  const articles: import('../types').Article[] = [{
    id: articleId, code: 'ART-001', name: 'Round Neck T-Shirt', fabricId,
    consumption: [
      { size: 'S', consumption: 0.18 }, { size: 'M', consumption: 0.2 }, { size: 'L', consumption: 0.22 },
      { size: 'XL', consumption: 0.24 }, { size: 'XXL', consumption: 0.26 },
    ],
    consumptionSheet: [
      { id: uid('cr_'), materialId: matFabric, consumption: 0.285 },
      { id: uid('cr_'), materialId: matRib, consumption: 0.18 },
      { id: uid('cr_'), materialId: matThread, consumption: 32 },
      { id: uid('cr_'), materialId: matZip, consumption: 1 },
      { id: uid('cr_'), materialId: matButton, consumption: 2 },
      { id: uid('cr_'), materialId: matLabel, consumption: 1 },
      { id: uid('cr_'), materialId: matPoly, consumption: 1 },
      { id: uid('cr_'), materialId: matCarton, consumption: 0.04 },
    ],
    createdAt: now(),
  }];

  const lotId = uid('l_');
  const lotColors = [colors[0].id, colors[1].id, colors[2].id];
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
