import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ItemForm from "../components/ItemForm";
import LoaderOverlay from "../components/LoaderOverlay";
import { createQuotation, updateQuotation, fetchQuotations, fetchQuotationById } from "../services/quotationService";
import { generateQuotationPDF } from "../utils/pdfService";
import { loadSkuDB, clearSkuCache } from "../utils/skuService";

const initialData = () => ({
  party: "", phone: "", address: "", salesPerson: localStorage.getItem("selectedSalesPerson") || "", remark: "",
  items: [], rateDiscount: 57, spDiscount: 0, billDiscount: 0, shipping: 0, advance: 0,
  paymentImages: [], gymBagSelected: false, gymBagRemark: "", carryBagSelected: false, carryBagRemark: ""
});
const money = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function MobileQuotation() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [skuDB, setSkuDB] = useState({});
  const [skuQuery, setSkuQuery] = useState("");
  const [manualRate, setManualRate] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualPcs, setManualPcs] = useState(1);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("customer");
  const [showOld, setShowOld] = useState(false);
  const [oldQuotations, setOldQuotations] = useState([]);

  useEffect(() => {
    loadSkuDB().then(setSkuDB).catch(() => toast.error("SKU sheet load nahi hui. Refresh karke try karein."));
  }, []);

  const gross = useMemo(() => data.items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [data.items]);
  const totalPcs = useMemo(() => data.items.reduce((sum, item) => sum + Number(item.pcs || 0), 0), [data.items]);
  const net = gross - Number(data.billDiscount || 0) + Number(data.shipping || 0) - Number(data.advance || 0);

  function patch(field, value) { setData(prev => ({ ...prev, [field]: value })); }

  function recalcItems(items, rateDiscount = data.rateDiscount, spDiscount = data.spDiscount) {
    return items.map(item => {
      if (item.isManual || item.isSample || !item.mrp) return item;
      let rate = Number(item.mrp) * (100 - Number(rateDiscount)) / 100;
      if (Number(spDiscount) > 0) rate *= (100 - Math.min(Number(spDiscount), 14)) / 100;
      rate = Math.round(rate);
      return { ...item, rate, amount: rate * Number(item.pcs || 0) };
    });
  }

  function addItem(item) {
    const mrp = Number(item.mrp || 0);
    let rate = Number(item.rate || 0);
    if (!item.isManual && !item.isSample && mrp) {
      rate = Math.round(mrp * (100 - Number(data.rateDiscount)) / 100 * (100 - Math.min(Number(data.spDiscount), 14)) / 100);
    }
    const normalized = { ...item, rate, amount: rate * Number(item.pcs || 0) };
    setData(prev => ({ ...prev, items: [...prev.items, normalized] }));
    toast.success(`${item.desc} added`);
    setSection("items");
  }

  function updateItem(index, patchItem) {
    setData(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? patchItem : item) }));
  }

  function removeItem(index) {
    setData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  function addManualItem() {
    const sku = skuQuery.trim();
    if (!sku || Number(manualPcs) <= 0 || Number(manualValue) <= 0) {
      toast.error("SKU, PCS aur rate bharein"); return;
    }
    addItem({ desc: sku.toUpperCase(), size: "-", pcs: Number(manualPcs), rate: Number(manualValue), amount: Number(manualPcs) * Number(manualValue), mrp: 0, isManual: true, isSample: false, pcsPerBox: 1 });
    setSkuQuery(""); setManualValue(""); setManualPcs(1); setManualRate(false);
  }

  async function openOldQuotations() {
    try {
      setBusy(true);
      const rows = await fetchQuotations();
      setOldQuotations(rows.slice(0, 60));
      setShowOld(true);
    } catch (error) {
      console.error(error); toast.error("Old quotations load nahi ho paaye");
    } finally { setBusy(false); }
  }

  async function selectOldQuotation(row) {
    try {
      setBusy(true);
      const saved = await fetchQuotationById(row.id);
      if (!saved) throw new Error("Quotation not found");
      // Keep the exact historical item rate/MRP snapshots from the saved quotation.
      setData({ ...initialData(), ...saved, paymentImages: saved.paymentImages || [], items: saved.items || [] });
      setShowOld(false);
      setSection("customer");
      toast.success(`Loaded ${saved.quotationNo || "old quotation"}`);
    } catch (error) {
      console.error(error); toast.error("Quotation load nahi ho paaya");
    } finally { setBusy(false); }
  }

  async function refreshProducts() {
    try {
      setBusy(true);
      clearSkuCache();
      const fresh = await loadSkuDB(true);
      setSkuDB(fresh);
      toast.success("SKU / MRP data refreshed");
    } catch { toast.error("Google Sheet refresh failed"); }
    finally { setBusy(false); }
  }

  function buildPayload() {
    const items = data.items.map(item => ({ ...item, size: typeof item.size === "string" ? item.size : "" }));
    const amount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const total63Value = items.reduce((sum, item) => sum + Math.round(Number(item.mrp || 0) * 37 / 100) * Number(item.pcs || 0), 0);
    return { ...data, items, amount, netAmount: net, total63Value, paymentImages: [] };
  }

  async function previewPDF() {
    if (!data.party.trim()) return toast.error("Party name required hai");
    if (!data.items.length) return toast.error("Pehle kam se kam ek item add karein");
    try {
      setBusy(true);
      await generateQuotationPDF(buildPayload(), "open");
      toast.success("PDF preview open ho raha hai");
    } catch (error) {
      console.error(error); toast.error("PDF preview nahi ban paya");
    } finally { setBusy(false); }
  }

  async function confirmAndSave() {
    if (!data.party.trim()) return toast.error("Party name required hai");
    if (!data.items.length) return toast.error("Pehle kam se kam ek item add karein");
    if (!window.confirm(`Quotation confirm karein?\nParty: ${data.party}\nNet payable: ${money(net)}`)) return;
    try {
      setBusy(true);
      const payload = { ...buildPayload(), status: "pending" };
      const saved = data.id ? await updateQuotation(data.id, payload) : await createQuotation(payload);
      if (!saved) throw new Error("Quotation save failed");
      await generateQuotationPDF({ ...saved, ...payload, quotationNo: saved.quotationNo || saved.quotation_no });
      toast.success("Quotation save ho gaya aur PDF download start ho gaya");
      setData(initialData());
      setSection("customer");
    } catch (error) {
      console.error(error); toast.error("Save failed. Internet aur Supabase connection check karein.");
    } finally { setBusy(false); }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[16px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const buttonClass = "rounded-xl px-4 py-3 text-sm font-bold active:scale-[.99]";

  return (
    <main className="min-h-screen bg-slate-100 pb-28 text-slate-900">
      <header className="sticky top-0 z-30 bg-slate-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div><div className="text-base font-black tracking-wide">ASTRIKE SPORTSWEAR</div><div className="text-xs text-slate-300">Mobile Quotation</div></div>
          <div className="flex gap-1.5"><button className="rounded-lg bg-white/10 px-2.5 py-2 text-xs font-semibold" onClick={openOldQuotations}>Old</button><button className="rounded-lg bg-white/10 px-2.5 py-2 text-xs font-semibold" onClick={refreshProducts}>↻ SKU</button><button className="rounded-lg bg-white/10 px-2.5 py-2 text-xs font-semibold" onClick={() => navigate("/dashboard")}>Dashboard</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-4 p-3 sm:p-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {[ ["customer", "1. Customer"], ["items", "2. Items"], ["totals", "3. Totals"] ].map(([key, label]) => <button key={key} onClick={() => setSection(key)} className={`rounded-xl px-2 py-3 text-xs font-bold ${section === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}
        </div>

        {section === "customer" && <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div><h2 className="text-lg font-extrabold">Customer details</h2><p className="text-sm text-slate-500">Quotation kis party ke naam par hai?</p></div>
          <input className={fieldClass} placeholder="Party Name *" value={data.party} onChange={e => patch("party", e.target.value)} />
          <input className={fieldClass} placeholder="Phone" inputMode="tel" value={data.phone} onChange={e => patch("phone", e.target.value)} />
          <textarea className={fieldClass} rows={2} placeholder="Address" value={data.address} onChange={e => patch("address", e.target.value)} />
          <input className={fieldClass} placeholder="Sales Person" value={data.salesPerson} onChange={e => patch("salesPerson", e.target.value)} />
          <textarea className={fieldClass} rows={2} placeholder="Remark / delivery instructions" value={data.remark} onChange={e => patch("remark", e.target.value)} />
          <button className={`${buttonClass} w-full bg-blue-600 text-white`} onClick={() => setSection("items")}>Continue to products →</button>
        </section>}

        {section === "items" && <div className="space-y-4">
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-extrabold">Add products</h2><p className="text-sm text-slate-500">SKU select karke size-wise boxes enter karein</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{Object.keys(skuDB).length} SKUs</span></div>
            <ItemForm onAddItem={addItem} editIndex={null} editItem={null} onUpdateItem={updateItem} onCancelEdit={() => {}} />
            <div className="border-t border-slate-100 pt-3">
              <button className="text-sm font-semibold text-blue-700" onClick={() => setManualRate(v => !v)}>{manualRate ? "− Hide manual item" : "+ Add manual-rate item"}</button>
              {manualRate && <div className="mt-3 grid grid-cols-2 gap-2"><input className={`${fieldClass} col-span-2`} placeholder="SKU / Description" value={skuQuery} onChange={e => setSkuQuery(e.target.value)} /><input className={fieldClass} type="number" min="1" placeholder="PCS" value={manualPcs} onChange={e => setManualPcs(e.target.value)} /><input className={fieldClass} type="number" min="1" placeholder="Rate ₹" value={manualValue} onChange={e => setManualValue(e.target.value)} /><button className={`${buttonClass} col-span-2 bg-slate-900 text-white`} onClick={addManualItem}>Add manual item</button></div>}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="font-extrabold">Quotation items</h3><span className="text-xs text-slate-500">{data.items.length} line(s)</span></div>
            {!data.items.length && <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Abhi koi item add nahi hua.</div>}
            {data.items.map((item, index) => <article key={`${item.desc}-${index}`} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2"><div><div className="font-extrabold">{item.desc}</div><div className="mt-1 text-xs text-slate-500">Size: {item.size || "-"} · {item.pcs} PCS</div></div><button aria-label="Remove item" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600" onClick={() => removeItem(index)}>Remove</button></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><div className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] text-slate-500">MRP</div><div className="font-semibold">{money(item.mrp)}</div></div><div className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] text-slate-500">Rate</div><div className="font-semibold">{money(item.rate)}</div></div><div className="rounded-lg bg-blue-50 p-2"><div className="text-[11px] text-blue-600">Amount</div><div className="font-extrabold text-blue-800">{money(item.amount)}</div></div></div>
            </article>)}
            <button className={`${buttonClass} w-full bg-blue-600 text-white`} onClick={() => setSection("totals")}>Continue to totals →</button>
          </section>
        </div>}

        {section === "totals" && <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <div><h2 className="text-lg font-extrabold">Discount & payment</h2><p className="text-sm text-slate-500">PDF preview se pehle totals check karein.</p></div>
          <div><label className="mb-2 block text-sm font-semibold">Rate discount</label><div className="grid grid-cols-2 gap-2">{[55,57].map(v => <button key={v} className={`${buttonClass} ${Number(data.rateDiscount) === v ? "bg-blue-600 text-white" : "bg-slate-100"}`} onClick={() => { patch("rateDiscount", v); setData(prev => ({ ...prev, rateDiscount: v, items: recalcItems(prev.items, v, prev.spDiscount) })); }}>{v}%</button>)}</div></div>
          <label className="block text-sm font-semibold">SP Discount (max 14%)<input className={`${fieldClass} mt-1`} type="number" min="0" max="14" value={data.spDiscount} onChange={e => { const v = Math.min(14, Math.max(0, Number(e.target.value))); setData(prev => ({ ...prev, spDiscount: v, items: recalcItems(prev.items, prev.rateDiscount, v) })); }} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Bill discount (₹)<input className={`${fieldClass} mt-1`} type="number" min="0" value={data.billDiscount} onChange={e => patch("billDiscount", Number(e.target.value))} /></label><label className="text-sm font-semibold">Shipping (₹)<input className={`${fieldClass} mt-1`} type="number" min="0" value={data.shipping} onChange={e => patch("shipping", Number(e.target.value))} /></label><label className="col-span-2 text-sm font-semibold">Advance (₹)<input className={`${fieldClass} mt-1`} type="number" min="0" value={data.advance} onChange={e => patch("advance", Number(e.target.value))} /></label></div>
          <div className="space-y-3 rounded-xl bg-slate-950 p-4 text-white"><div className="flex justify-between text-sm text-slate-300"><span>Total PCS</span><span>{totalPcs}</span></div><div className="flex justify-between text-sm text-slate-300"><span>Gross</span><span>{money(gross)}</span></div><div className="flex justify-between text-sm text-slate-300"><span>Bill discount</span><span>− {money(data.billDiscount)}</span></div><div className="flex justify-between text-sm text-slate-300"><span>Shipping</span><span>+ {money(data.shipping)}</span></div><div className="flex justify-between text-sm text-slate-300"><span>Advance</span><span>− {money(data.advance)}</span></div><div className="border-t border-white/15 pt-3"><div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Net payable</div><div className="text-3xl font-black">{money(net)}</div></div></div>
          <button className={`${buttonClass} w-full bg-slate-100 text-slate-900`} onClick={previewPDF}>👁 Preview PDF</button>
          <button className={`${buttonClass} w-full bg-emerald-600 text-white`} onClick={confirmAndSave}>✓ Confirm & Save PDF</button>
          <p className="text-center text-xs leading-5 text-slate-500">Confirm karne par quotation existing database mein save hoga aur PDF download hogi.</p>
        </section>}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3"><div><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net payable</div><div className="text-xl font-black">{money(net)}</div></div><div className="flex gap-2"><button className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-bold" onClick={() => setSection("items")}>Items ({data.items.length})</button><button className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white" onClick={previewPDF}>Preview PDF</button></div></div>
      </footer>
      {showOld && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
        <section className="max-h-[82vh] w-full max-w-xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
          <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-extrabold">Load old quotation</h2><p className="text-xs text-slate-500">Saved rates and items remain unchanged</p></div><button className="rounded-lg bg-slate-100 px-3 py-2 font-bold" onClick={() => setShowOld(false)}>✕</button></div>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
            {!oldQuotations.length && <p className="p-5 text-center text-sm text-slate-500">No quotations found.</p>}
            {oldQuotations.map(row => <button key={row.id} onClick={() => selectOldQuotation(row)} className="w-full rounded-xl border p-3 text-left active:bg-blue-50"><div className="flex items-start justify-between gap-2"><div className="font-bold">{row.party || "Unnamed party"}</div><div className="text-xs text-slate-500">{row.quotationNo}</div></div><div className="mt-1 flex justify-between text-sm text-slate-600"><span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : ""}</span><span className="font-extrabold text-slate-900">{money(row.netAmount ?? row.amount)}</span></div></button>)}
          </div>
        </section>
      </div>}
      {busy && <LoaderOverlay text="Please wait..." />}
    </main>
  );
}
