import { useEffect, useRef, useState } from "react";
import { loadSkuDB } from "../utils/skuService";

const NORMAL_SIZES = ["S", "M", "L", "XL", "2XL"];
const BIG_SIZES = ["3XL", "4XL"];
const KIDS_SIZES = ["26", "28", "30", "32", "34", "36"];

export default function ItemForm({
  onAddItem,
  editIndex,
  editItem,
  onUpdateItem,
  onCancelEdit,
}) {
  const [sku, setSku] = useState("");
  const [rate, setRate] = useState("");
  const [sizes, setSizes] = useState({});
  const [manual, setManual] = useState(false);

  const [skuDB, setSkuDB] = useState({});
  const [suggestions, setSuggestions] = useState([]);

  // SAMPLE
  const [sampleName, setSampleName] = useState("");
  const [samplePCS, setSamplePCS] = useState("");
  const [sampleRate, setSampleRate] = useState("");

  const skuRef = useRef(null);

  /* ================= BIG SIZE DETECT ================= */
  const isBigSizeItem =
    sku.toUpperCase().includes("BIG SIZE") ||
    sku.toUpperCase().includes("BIGSIZE");

  /* ================= LOAD SKU DB ================= */
  useEffect(() => {
    loadSkuDB().then(setSkuDB);
    setTimeout(() => skuRef.current?.focus(), 0);
  }, []);

  /* ================= EDIT MODE FILL ================= */
  useEffect(() => {
    if (!editItem) return;

    setSku(editItem.desc);
    setRate(editItem.rate || "");
    setManual(editItem.isManual || false);

    const sizeObj = {};
    if (editItem.size && editItem.size !== "-") {
      editItem.size.split(",").forEach(p => {
        const [s, v] = p.trim().split("-");
        sizeObj[s] = v;
      });
    }
    setSizes(sizeObj);
  }, [editItem]);

  /* ================= CLEAR NORMAL SIZES IF BIG SIZE ================= */
  useEffect(() => {
    if (!isBigSizeItem) return;

    setSizes(prev => {
      const clean = {};
      [...BIG_SIZES, ...KIDS_SIZES].forEach(s => {
        if (prev[s]) clean[s] = prev[s];
      });
      return clean;
    });
  }, [isBigSizeItem]);

  /* ================= AUTOSUGGEST ================= */
  function onSkuChange(val) {
    setSku(val);
    if (!val) {
      setSuggestions([]);
      return;
    }

    const up = val.toUpperCase();
    setSuggestions(
      Object.keys(skuDB).filter(s => s.includes(up)).slice(0, 8)
    );
  }

  function selectSku(s) {
    setSku(s);
    setSuggestions([]);
  }

  function resetForm() {
    setSku("");
    setRate("");
    setSizes({});
    setManual(false);
    setSuggestions([]);
    onCancelEdit?.();
    setTimeout(() => skuRef.current?.focus(), 0);
  }

  /* ================= ADD / UPDATE ITEM ================= */
  function handleAddItem() {
    const sizeEntries = Object.entries(sizes).filter(
      ([_, v]) => Number(v) > 0
    );

    if (!sku || sizeEntries.length === 0) {
      alert("SKU & Size required");
      return;
    }

    if (manual && !rate) {
      alert("Rate required for manual item");
      return;
    }

    const skuKey = sku.toUpperCase();
    const skuInfo = skuDB[skuKey];

    const boxes = sizeEntries.reduce((s, [_, v]) => s + Number(v), 0);
    const pcsPerBox = skuInfo?.pcs || editItem?.pcsPerBox || 1;
    const pcs = boxes * pcsPerBox;

    const item = {
      desc: skuKey,
      size: sizeEntries.map(([s, v]) => `${s}-${v}`).join(", "),
      pcs,

      // 🔥 AUTO items → rate = 0 (Quotation.jsx calculate karega)
      rate: manual ? Number(rate) : 0,
      amount: manual ? pcs * Number(rate) : 0,

      mrp: skuInfo?.mrp || editItem?.mrp || 0,

      isManual: manual,
      isSample: false,
      pcsPerBox,
    };

    if (editIndex !== null) {
      onUpdateItem(editIndex, item);
    } else {
      onAddItem(item);
    }

    resetForm();
  }

  /* ================= SAMPLE ITEM ================= */
  function handleAddSample() {
    if (!sampleName || !samplePCS || !sampleRate) {
      alert("Sample Name, PCS & Rate required");
      return;
    }

    onAddItem({
      desc: `${sampleName} (SAMPLE)`,
      size: "-",
      pcs: Number(samplePCS),
      rate: Number(sampleRate),
      amount: Number(samplePCS) * Number(sampleRate),
      isManual: true,
      isSample: true,
      pcsPerBox: 1,
    });

    setSampleName("");
    setSamplePCS("");
    setSampleRate("");
  }

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      {/* ADD ITEM */}
      <div className="border rounded-xl p-3 bg-blue-50/40">
        <h4 className="text-sm font-semibold text-blue-700 mb-2">
          Add Item
        </h4>

        <input
          ref={skuRef}
          className="w-full mb-2 px-3 py-2 border rounded-lg text-sm"
          placeholder="SKU"
          value={sku}
          onChange={e => onSkuChange(e.target.value)}
        />

        {suggestions.length > 0 && (
          <div className="border rounded bg-white max-h-40 overflow-auto mb-2">
            {suggestions.map(s => (
              <div
                key={s}
                className="px-3 py-1 cursor-pointer hover:bg-blue-50"
                onClick={() => selectSku(s)}
              >
                {s}
              </div>
            ))}
          </div>
        )}

        {/* MANUAL TOGGLE */}
        <label className="flex items-center gap-2 text-xs mb-2">
          <input
            type="checkbox"
            checked={manual}
            onChange={e => {
              setManual(e.target.checked);
              if (!e.target.checked) setRate("");
            }}
          />
          Manual Rate
        </label>

        <input
          className={`w-full mb-2 px-3 py-2 border rounded-lg text-sm ${
            manual ? "bg-white" : "bg-gray-100 cursor-not-allowed"
          }`}
          placeholder={manual ? "Enter Rate" : "Auto Rate"}
          type="number"
          value={rate}
          disabled={!manual}
          onChange={e => setRate(e.target.value)}
        />

        {/* SIZE GRID: adult, big and kids sizes */}
        <div className="mb-2 text-xs font-semibold text-slate-500">Adult / Big Sizes</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {(isBigSizeItem ? BIG_SIZES : [...NORMAL_SIZES, ...BIG_SIZES]).map(s => (
            <input
              key={s}
              className="px-2 py-1 border rounded text-center text-sm"
              placeholder={s}
              type="number"
              min={0}
              value={sizes[s] || ""}
              onChange={e => {
                const val = Number(e.target.value);
                if (val < 0) return;
                setSizes({ ...sizes, [s]: val });
              }}
            />
          ))}
        </div>

        <div className="mb-2 text-xs font-semibold text-slate-500">Kids Sizes</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {KIDS_SIZES.map(s => (
            <input
              key={s}
              className="min-w-0 px-2 py-2 border rounded-lg text-center text-sm bg-white"
              aria-label={`Kids size ${s} boxes`}
              placeholder={s}
              type="number"
              min={0}
              value={sizes[s] || ""}
              onChange={e => {
                const val = Number(e.target.value);
                if (val < 0) return;
                setSizes({ ...sizes, [s]: val });
              }}
            />
          ))}
        </div>

        <button
          onClick={handleAddItem}
          className={`w-full py-2 rounded-lg font-semibold ${
            editIndex !== null
              ? "bg-yellow-500 hover:bg-yellow-600 text-black"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {editIndex !== null ? "✅ Update Item" : "➕ Add Item"}
        </button>
      </div>

      {/* SAMPLE ITEM 
      <div className="border rounded-xl p-3 bg-yellow-50 ">
        <h4 className="text-sm font-semibold text-yellow-700 mb-2">
          Sample / Free Item
        </h4>

        <input
          className="w-full mb-2 px-3 py-2 border rounded-lg text-sm"
          placeholder="Sample Item Name"
          value={sampleName}
          onChange={e => setSampleName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="PCS"
            type="number"
            value={samplePCS}
            onChange={e => setSamplePCS(e.target.value)}
          />
          <input
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="Rate"
            type="number"
            value={sampleRate}
            onChange={e => setSampleRate(e.target.value)}
          />
        </div>

        <button
          onClick={handleAddSample}
          className="w-full py-2 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
        >
          🧪 Add Sample Item
        </button>
      </div>
      */}
    </div>
  );
}
