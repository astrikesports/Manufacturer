  import { useEffect, useState } from "react";
  import { useMemo } from "react";
  import ConfirmDialog from "../components/ConfirmDialog";
  import Header from "../components/Header";
  import ItemsTable from "../components/ItemsTable";
  import LoaderOverlay from "../components/LoaderOverlay";
  import Sidebar from "../components/Sidebar";
  import Summary from "../components/Summary";
  import { clearSkuCache, loadSkuDB } from "../utils/skuService";
import { fetchQuotationById } from "../services/quotationService";
  
  
  
  
  export default function Quotation() {
  
  /* ================= LOADER ================= */
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [confirm, setConfirm] = useState({
  open: false,
  title: "",
  message: "",
  onConfirm: null
  });
  
  
  /* ================= SINGLE SOURCE OF TRUTH ================= */
  const [pdfData, setPdfData] = useState({
  party: "",
  phone: "",
  address: "",
  salesPerson: "",
  remark: "",
  items: [],
  rateDiscount: 57,
  spDiscount: 0,
  billDiscount: 0,
  shipping: 0,
  advance: 0,
  paymentImages: [], // 🔥 MUST

  gymBagSelected: false,
  gymBagRemark: "",
  carryBagSelected: false,
  carryBagRemark: "",
  });
  
  
  const {
  items,
  rateDiscount,
  spDiscount,
  billDiscount,
  shipping,
  advance
  } = pdfData;

  /* ================= EDIT FLOW ================= */
  const [editIndex, setEditIndex] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [paymentImages, setPaymentImages] = useState([]);
  
  
  
  /* ================= LOAD SELECTED SAVED QUOTATION ================= */
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedQuotation() {
      const selectedId = localStorage.getItem("selectedQuotationId");
      if (!selectedId) return;

      setLoading(true);
      setLoadingText("Loading saved quotation...");

      try {
        const quote = await fetchQuotationById(selectedId);
        if (cancelled) return;

        if (!quote) {
          console.error("Selected quotation was not found:", selectedId);
          localStorage.removeItem("selectedQuotationId");
          return;
        }

        setPdfData({
          party: quote.party || "",
          phone: quote.phone || "",
          address: quote.address || "",
          salesPerson: quote.salesPerson || "",
          remark: quote.remark || "",
          items: Array.isArray(quote.items) ? quote.items : [],
          rateDiscount: Number(quote.rateDiscount ?? 57),
          spDiscount: Number(quote.spDiscount ?? 0),
          billDiscount: Number(quote.billDiscount ?? 0),
          shipping: Number(quote.shipping ?? 0),
          advance: Number(quote.advance ?? 0),
          paymentImages: Array.isArray(quote.paymentImages) ? quote.paymentImages : [],
          gymBagSelected: Boolean(quote.gymBagSelected),
          gymBagRemark: quote.gymBagRemark || "",
          carryBagSelected: Boolean(quote.carryBagSelected),
          carryBagRemark: quote.carryBagRemark || "",
          quotationId: quote.id,
          quotationNo: quote.quotationNo || ""
        });
      } catch (error) {
        console.error("Failed to load selected quotation:", error);
        if (!cancelled) {
          window.alert("Quotation load nahi ho paya. Please refresh karke dobara try karein.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSelectedQuotation();
    return () => { cancelled = true; };
  }, []);

  /* ================= CORE PYTHON RATE LOGIC ================= */
  function applyAutoRates(list) {
  return list.map(item => {
  if (item.isSample || item.isManual || !item.mrp) return item;
  
  const mrp = Number(item.mrp);
  
  let rate = (mrp * (100 - rateDiscount)) / 100;
  
  if (spDiscount > 0) {
  rate = (rate * (100 - Math.min(spDiscount, 14))) / 100;
  }
  
  rate = Math.round(rate);
  
  return {
  ...item,
  rate,
  amount: rate * item.pcs,
  };
  });
  }
  
  
  /* ================= AUTO APPLY ON DISCOUNT CHANGE ================= */
  useEffect(() => {
  setPdfData(prev => ({
  ...prev,
  items: applyAutoRates(prev.items)
  }));
  }, [rateDiscount, spDiscount]);
  
  /* ================= ITEM ACTIONS ================= */
  function addItem(item) {
  
  setPdfData(prev => {
  
  // FIND SAME ITEM
  const existingIndex =
  prev.items.findIndex(
  (p) =>
  
  p.desc === item.desc &&
  
  p.mrp === item.mrp
  );
  
  let updatedItems = [...prev.items];
  
  // ITEM EXISTS
  if (existingIndex !== -1) {
  
  const existing =
  updatedItems[
  existingIndex
  ];
  
  // PCS
  existing.pcs =
  Number(existing.pcs || 0) +
  Number(item.pcs || 0);
  
  // AMOUNT
  existing.amount =
  Number(existing.amount || 0) +
  Number(item.amount || 0);
  
  // SIZE MERGE
  // SIZE MERGE
  const sizeMap = {};
  
  // OLD SIZES
  (existing.size || "")
  .split(",")
  .forEach(s => {
  
  const [
  size,
  qty
  ] = s.trim().split("-");
  
  if (!size) return;
  
  sizeMap[size] =
  (sizeMap[size] || 0) +
  Number(qty || 0);
  
  });
  
  // NEW SIZES
  (item.size || "")
  .split(",")
  .forEach(s => {
  
  const [
  size,
  qty
  ] = s.trim().split("-");
  
  if (!size) return;
  
  sizeMap[size] =
  (sizeMap[size] || 0) +
  Number(qty || 0);
  
  });
  
  // FINAL STRING
  existing.size =
  Object.entries(sizeMap)
  .map(
  ([k, v]) =>
  `${k}-${v}`
  )
  .join(", ");
  
  }
  
  // NEW ITEM
  else {
  
  updatedItems.push(item);
  
  }
  
  return {
  ...prev,
  items:
  applyAutoRates(
  updatedItems
  )
  };
  
  });
  
  }
  
  function startEdit(index) {
  setEditIndex(index);
  setEditItem(items[index]);
  }
  
  function updateItem(index, item) {
  
  setPdfData(prev => {
  
  let updatedItems =
  [...prev.items];
  
  // REMOVE CURRENT ITEM
  updatedItems.splice(
  index,
  1
  );
  
  // FIND SAME ITEM
  const existingIndex =
  updatedItems.findIndex(
  (p) =>
  
  p.desc === item.desc
  );
  
  // MERGE
  if (existingIndex !== -1) {
  
  const existing =
  updatedItems[
  existingIndex
  ];
  
  // PCS
  existing.pcs =
  Number(existing.pcs || 0) +
  Number(item.pcs || 0);
  
  // AMOUNT
  existing.amount =
  Number(existing.amount || 0) +
  Number(item.amount || 0);
  
  // SIZE MAP
  const sizeMap = {};
  
  // OLD
  (existing.size || "")
  .split(",")
  .forEach(s => {
  
  const [
  size,
  qty
  ] =
  s.trim().split("-");
  
  if (!size) return;
  
  sizeMap[size] =
  (sizeMap[size] || 0) +
  Number(qty || 0);
  
  });
  
  // NEW
  (item.size || "")
  .split(",")
  .forEach(s => {
  
  const [
  size,
  qty
  ] =
  s.trim().split("-");
  
  if (!size) return;
  
  sizeMap[size] =
  (sizeMap[size] || 0) +
  Number(qty || 0);
  
  });
  
  existing.size =
  Object.entries(sizeMap)
  .map(
  ([k, v]) =>
  `${k}-${v}`
  )
  .join(", ");
  
  }
  
  // NEW
  else {
  
  updatedItems.push(item);
  
  }
  
  return {
  ...prev,
  items:
  applyAutoRates(
  updatedItems
  )
  };
  
  });
  
  cancelEdit();
  
  }
  
  function cancelEdit() {
  setEditIndex(null);
  setEditItem(null);
  }
  
  function deleteItem(index) {
  setPdfData(prev => ({
  ...prev,
  items: prev.items.filter((_, i) => i !== index)
  }));
  }
  
  /* ================= PAYMENT IMAGES (FILE BASED) ================= */
  function handlePaymentImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (pdfData.paymentImages.length >= 2) {
  alert("Maximum 2 payment images allowed");
  return;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
  setPdfData(prev => ({
  ...prev,
  paymentImages: [...prev.paymentImages, reader.result] // ✅ base64 only
  }));
  };
  
  reader.readAsDataURL(file);
  e.target.value = "";
  }
  
  
  function removePaymentImage(index) {
  setPdfData(prev => ({
  ...prev,
  paymentImages: prev.paymentImages.filter((_, i) => i !== index)
  }));
  }
  
  
  /* ================= REFRESH SKU ================= */
  async function refreshSkuData() {
  try {
  setLoading(true);
  setLoadingText("Refreshing Google Sheet...");
  
  // 🔥 1. frontend cache clear
  clearSkuCache();
  
  // 🔥 2. fresh SKU DB fetch
  await loadSkuDB(true);
  
  // 🔥 3. IMPORTANT — applyAutoRates ko AWAIT karo
  const updatedItems = await applyAutoRates(pdfData.items);
  
  // 🔥 4. state update with REAL items (not Promise)
  setPdfData(prev => ({
  ...prev,
  items: updatedItems
  }));
  
  setConfirm({
  open: true,
  title: "Sheet Refreshed",
  message: "Google Sheet data updated successfully."
  });
  
  } catch (e) {
  console.error(e);
  setConfirm({
  open: true,
  title: "Refresh Failed",
  message: "Failed to refresh Google Sheet."
  });
  } finally {
  setLoading(false);
  }
  }
  
  
  /* ================= NEW QUOTATION ================= */
  function newQuotation() {
  setConfirm({
  open: true,
  title: "New Quotation",
  message: "Create new quotation? Current data will be cleared.",
  onConfirm: () => {
  setConfirm({ open: false });
  
  setLoading(true);
  setLoadingText("Creating New Quotation...");
  
  setTimeout(() => {
  setPdfData({
  party: "",
  phone: "",
  address: "",
  salesPerson: "",
  remark: "",
  rateDiscount: 57,
  spDiscount: 0,
  billDiscount: 0,
  shipping: 0,
  advance: 0,
  items: [],
  paymentImages: [],
  gymBagSelected: false,
  gymBagRemark: "",
  carryBagSelected: false,
  carryBagRemark: ""
  });

    // Clear saved total
  localStorage.removeItem("total63PercentValue");

  cancelEdit();
  setLoading(false);
  }, 300);
  }
  });
  }
  
  /* ================= TOTALS ================= */
  const totalPCS = items.reduce((s, i) => s + i.pcs, 0);
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const net =
  totalAmount -
  Number(billDiscount) +
  Number(shipping) -
  Number(advance);

  
  /* ================= TOTALS 63% ================= */
  const total63PercentValue = useMemo(() => {
    console.log("Items:", items);
  
    const total = items.reduce((sum, item) => {
      console.log("Item:", item);
  
      const mrp = Number(item.mrp || 0);
      const pcs = Number(item.pcs || 0);
  
      const rate63 = Math.round((mrp * 37) / 100);
  
      console.log({
        mrp,
        pcs,
        rate63,
        amount: rate63 * pcs,
      });
  
      return sum + rate63 * pcs;
    }, 0);
  
    console.log("63% Total =", total);
  
    return total;
  }, [items]);  
    
  /* ================= SAVE IN LOCAL STORAGE ================= */
  useEffect(() => {
    console.log("Saving to localStorage:", total63PercentValue);
  
    localStorage.setItem(
      "total63PercentValue",
      JSON.stringify(total63PercentValue)
    );
  }, [total63PercentValue]);
  
  /* ================= UI ================= */
  return (
  <div className="h-screen flex flex-col bg-blue-50">
  
  <Header
  onNewQuotation={newQuotation}
  onRefreshSku={refreshSkuData}
  pdfData={pdfData}
  setPdfData={setPdfData}
  setLoading={setLoading}
  setLoadingText={setLoadingText}
  /* 🔥 ADD THESE */
  setConfirm={setConfirm}
  // ADD THIS
  net={net}
  />
  
  <div className="flex flex-1 overflow-hidden">
  
  <Sidebar
  pdfData={pdfData}
  setPdfData={setPdfData}
  
  onAddItem={addItem}
  editIndex={editIndex}
  editItem={editItem}
  onUpdateItem={updateItem}
  onCancelEdit={cancelEdit}
  
  handlePaymentImage={handlePaymentImage}
  paymentImages={pdfData.paymentImages}
  removePaymentImage={removePaymentImage}
  
  />
  
  <ItemsTable
  items={items}
  onDelete={deleteItem}
  onEdit={startEdit}
  />
  </div>
  
  <Summary
  pcs={totalPCS}
  amount={totalAmount}
  billDiscount={billDiscount}
  setBillDiscount={(v) =>
  setPdfData(prev => ({ ...prev, billDiscount: v }))
  }
  shipping={shipping}
  setShipping={(v) =>
  setPdfData(prev => ({ ...prev, shipping: v }))
  }
  advance={advance}
  setAdvance={(v) =>
  setPdfData(prev => ({ ...prev, advance: v }))
  }
  net={net}
  />
  
  {/* 🔥 GLOBAL LOADER */}
  {loading && <LoaderOverlay text={loadingText} />}
  
  <ConfirmDialog
  open={confirm.open}
  title={confirm.title}
  message={confirm.message}
  onConfirm={confirm.onConfirm}
  onCancel={() => setConfirm({ open: false })}
  />
  
  
  </div>
  );
  }
