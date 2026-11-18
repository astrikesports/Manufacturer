import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { deletePaymentImages } from "../services/paymentImageService";
import {
  deleteQuotation,
  fetchQuotationById
} from "../services/quotationService";
import { generateQuotationPDF } from "../utils/pdfService";
import { useNavigate } from "react-router-dom";
import LoadQuotationModal from "./LoadQuotationModal";
import StockCheckModal from "./StockCheckModal";
import DistrictCheckModal from "./DistrictCheckModal";

import {
  createQuotation,
  updateQuotation
} from "../services/quotationService";

  export default function Header({
  onNewQuotation,
  onRefreshSku,
  pdfData = {},          // ✅ default
  setPdfData,
  setLoading,
  setLoadingText,
  setConfirm,
  net,
  }) {

  const navigate = useNavigate();
  const [showLoad, setShowLoad] = useState(false);
  const [showStock,setShowStock] = useState(false)
  const [showDistrict, setShowDistrict] = useState(false);
  const [products, setProducts] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [allQuotations, setAllQuotations] = useState([]);
    
  const handleSave = async () => {
  try {
  /* ================= VALIDATION (DIALOG BASED) ================= */

  if (!pdfData.party || pdfData.party.trim() === "") {
  setConfirm({
  open: true,
  title: "Missing Party Name",
  message: "Party name is required to save quotation.",
  onConfirm: () => setConfirm({ open: false }) // 👈 ONLY OK
  });
  return;
  }

  if (!Array.isArray(pdfData.items) || pdfData.items.length === 0) {
  setConfirm({
  open: true,
  title: "No Items Added",
  message: "Please add at least one item before saving.",
  onConfirm: () => setConfirm({ open: false }) // 👈 ONLY OK
  });
  return;
  }

  const hasValidItem = pdfData.items.some(it =>
  it &&
  it.desc &&
  String(it.desc).trim() !== "" &&
  Number(it.pcs || 0) > 0 &&
  Number(it.rate || 0) > 0
  );

  if (!hasValidItem) {
  setConfirm({
  open: true,
  title: "Invalid Items",
  message: "Each item must have description, PCS and rate.",
  onConfirm: () => setConfirm({ open: false }) // 👈 ONLY OK
  });
  return;
  }

  /* ================= ORIGINAL CODE (UNCHANGED) ================= */

  setLoading(true);
  setLoadingText("Saving quotation & generating PDF...");

  // ✅ 1️⃣ CLEAN DATA
  const cleanItems = pdfData.items.map(it => ({
  ...it,
  size: typeof it.size === "string" ? it.size : ""
  }));


  const total63PercentValue = cleanItems.reduce((total, item) => {
  const mrp = Number(item.mrp || 0);
  const pcs = Number(item.pcs || 0);

  const rate63 = Math.round((mrp * 37) / 100);

  return total + rate63 * pcs;
}, 0);

      
  // ✅ PAYLOAD
  const payload = {
  
  ...pdfData,
  
  status: "pending",

  total63Value: total63PercentValue,
  
  // ✅ GROSS AMOUNT
  amount:
  cleanItems.reduce(
  (acc, item) =>
  acc +
  Number(
  item.amount || 0
  ),
  0
  ),
  
  // ✅ NET AMOUNT
  netAmount: net,
  
  items: cleanItems,
  
  paymentImages: []
  };


  // ✅ 2️⃣ SAVE
  const saved = pdfData.id
  ? await updateQuotation(pdfData.id, payload)
  : await createQuotation(payload);

  // ✅ 3️⃣ SYNC STATE
  // Keep the packing selections/remarks in the current quotation state.
  // They are used by the PDF and are intentionally not part of the DB payload.
  setPdfData({
    ...saved,
    gymBagSelected: !!pdfData.gymBagSelected,
    gymBagRemark: pdfData.gymBagRemark || "",
    carryBagSelected: !!pdfData.carryBagSelected,
    carryBagRemark: pdfData.carryBagRemark || "",
    paymentImages: pdfData.paymentImages || []
  });

  // ✅ 4️⃣ GENERATE PDF (with packing details + images)
  await generateQuotationPDF({
    ...saved,
    gymBagSelected: !!pdfData.gymBagSelected,
    gymBagRemark: pdfData.gymBagRemark || "",
    carryBagSelected: !!pdfData.carryBagSelected,
    carryBagRemark: pdfData.carryBagRemark || "",
    paymentImages: pdfData.paymentImages
  });
    
  // OPEN SALES PERSON PERFORMANCE
  localStorage.setItem(
    "selectedSalesPerson",
    saved.salesPerson || ""
  );

  // GO TO DASHBOARD
  navigate("/dashboard");

  } catch (err) {
  console.error("SAVE ERROR:", err);
  setConfirm({
  open: true,
  title: "Save Failed",
  message: "Something went wrong while saving quotation.",
  onConfirm: () => setConfirm({ open: false }) // 👈 ONLY OK
  });
  } finally {
  setLoading(false);
  }
  };


  const handleRefresh = () => {
  setConfirm({
  open: true,
  title: "Refresh Sheet",
  message: "Refresh Google Sheet data? This may update item rates.",
  onConfirm: async () => {
  try {
  setConfirm({ open: false });
  setLoading(true);
  setLoadingText("Refreshing Sheet...");

  await onRefreshSku();

  setLoading(false);

  // ✅ SUCCESS DIALOG (NO ALERT)
  setConfirm({
  open: true,
  title: "Refresh Complete",
  message: "Google Sheet data refreshed successfully.",
  onConfirm: () => setConfirm({ open: false })
  });

  } catch (err) {
  setLoading(false);

  // ❌ ERROR DIALOG (NO ALERT)
  setConfirm({
  open: true,
  title: "Refresh Failed",
  message: "Failed to refresh Google Sheet data.",
  onConfirm: () => setConfirm({ open: false })
  });

  console.error("REFRESH ERROR:", err);
  }
  }
  });
  };

  /* LOAD SELECT */
  const handleLoadSelect = async (id) => {
  try {
  setLoading(true);
  setLoadingText("Loading Quotation...");

  const data = await fetchQuotationById(id);
  setPdfData(prev => ({
  ...prev,
  ...data,
  paymentImages: data.paymentImages || [] // 🔥 URLs only
  }));

  await fetchQuotationItems(id);


  setTimeout(() => {
  setLoading(false);
  setShowLoad(false);
  }, 300);
  } catch {
  setLoading(false);
  }
  };
    
  /* LOAD SELECT */
  useEffect(() => {

    const quotationId =
      localStorage.getItem(
        "selectedQuotationId"
      );
  
    if (!quotationId)
      return;
  
    handleLoadSelect(
      quotationId
    );
  
    // CLEAR AFTER LOAD
    localStorage.removeItem(
      "selectedQuotationId"
    );
  
  }, []);

  const handleNewQuotation = () => {
  setLoading(true);
  setLoadingText("Creating New Quotation...");

  setTimeout(() => {
  onNewQuotation();
  setLoading(false);
  }, 300);
  };

  // =========================
  // FETCH PRODUCTS START
  // =========================
  
  const fetchProducts = async () => {
  
    const { data, error } =
      await supabase
        .from("products")
        .select("*");
  
    if (!error) {
  
      setProducts(data || []);
  
    }
  };
  
  // =========================
  // FETCH PRODUCTS END
  // =========================
  
  
  // =========================
  // FETCH QUOTATION ITEMS START
  // =========================
  
  const fetchQuotationItems =
    async (quotationId) => {
  
      if (!quotationId) return;
  
      const { data, error } =
        await supabase
          .from("quotations")
          .select("items")
          .eq("id", quotationId)
          .single();
  
      if (!error) {
  
        setQuotationItems(
          Array.isArray(data?.items)
            ? data.items
            : []
        );
  
      }
  };
  
  // =========================
  // FETCH QUOTATION ITEMS END
  // =========================

  // =========================
  // FETCH ALL QUOTATIONS START
  // =========================
  
  const fetchAllQuotations =
    async () => {
  
      const { data, error } =
        await supabase
          .from("quotations")
          .select("*");
  
      if (!error) {
  
        setAllQuotations(
          data || []
        );
  
      }
  };
  
  // =========================
  // FETCH ALL QUOTATIONS END
  // =========================

  /* HANDLE DELETE */
  const handleDelete = async (quotation) => {
  return new Promise((resolve, reject) => {
  setConfirm({
  open: true,
  title: "Delete Quotation",
  message: "This quotation will be permanently deleted.",
  onConfirm: async () => {
  try {
  setConfirm({ open: false });
  setLoading(true);
  setLoadingText("Deleting quotation...");
  
  // delete quotation
  const imageUrls = await deleteQuotation(quotation.id);
  
  // delete images
  await deletePaymentImages(imageUrls);
  
  setLoading(false);
  resolve();   // 🔥 IMPORTANT
  } catch (err) {
  setLoading(false);
  console.error(err);
  reject(err);
  }
  }
  });
  });
  };

  useEffect(() => {

    fetchProducts();
    fetchAllQuotations();
  
  }, []);



  return (
  <>
  <div className="bg-gradient-to-r from-black via-gray-900 to-black text-white px-8 py-5 flex justify-between items-center shadow-2xl border border-white/10 relative overflow-hidden">

  {/* BG EFFECT */}
  <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

  <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl" />

    {/* CONTENT */}
  <div className="relative z-10 flex justify-between items-center w-full">
  
  {/* LEFT */}
  <div>
  <h1 className="text-xl font-bold">ASTRIKE SPORTSWEAR</h1>
  <p className="text-sm text-blue-100">
  Quotation Management System
  </p>
  </div>

  {/* RIGHT */}
  <div className="flex gap-2 items-center">


  <button
    onClick={() =>
      navigate("/dashboard")
    }
  className="h-11 px-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white font-bold hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-[1.03]"  >
    
    📊 Dashboard
  </button>

  <button
    onClick={() => navigate("/mobile-quotation")}
    className="h-11 px-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/20 text-white font-bold hover:bg-cyan-500/30 transition-all duration-300"
  >
    📱 Mobile Quotation
  </button>

  <button
  onClick={() => setShowDistrict(true)}
  className="h-11 px-5 rounded-2xl bg-purple-500/20 backdrop-blur-xl border border-purple-400/20 text-white font-bold hover:bg-purple-500/30 transition-all duration-300 shadow-lg hover:scale-[1.03]" >
    
  📍 Check District
  </button>

  <button
  onClick={() => setShowStock(true)}
  className="h-11 px-5 rounded-2xl bg-green-500/20 backdrop-blur-xl border border-green-400/20 text-white font-bold hover:bg-green-500/30 transition-all duration-300 shadow-lg hover:scale-[1.03]"
  >
  📦 Check Stock
  </button>

  {/* RIGHT 
  <button
  onClick={handleNewQuotation}
  className="px-3 py-2 text-sm rounded bg-white text-blue-700 font-semibold"
  >
  + New Quotation
  </button>

  <button
  onClick={handleRefresh}
  className="px-4 py-2 text-sm rounded bg-yellow-400 text-black font-semibold"
  >
  🔄 Refresh Sheet
  </button>
  
  */}

  <button
  onClick={() => setShowLoad(true)}
  className="h-11 px-5 rounded-2xl bg-blue-500/20 backdrop-blur-xl border border-blue-400/20 text-white font-bold hover:bg-blue-500/30 transition-all duration-300 shadow-lg hover:scale-[1.03]"  >
    
  Load Old Quotation
  </button>


  <button
  onClick={handleSave}
  className="h-11 px-5 rounded-2xl bg-green-500/20 backdrop-blur-xl text-white font-bold hover:bg-green-500/30 transition-all duration-300 shadow-2xl hover:scale-[1.03]"  >
    
  💾 Save & Download PDF
  </button>

  </div>
  </div>
  </div>

  {/* LOAD POPUP */}
  {showLoad && (
  <LoadQuotationModal
  onClose={() => setShowLoad(false)}
  onSelect={handleLoadSelect}
  onDelete={handleDelete}
  />

  )}
  {/* STOCK CHECK POPUP */}
  {showStock && (
    <StockCheckModal
      open={showStock}
      onClose={() =>
        setShowStock(false)
      }
    
      quotationItems={
        quotationItems
      }
    
      products={products}
    
      quotations={
        allQuotations
      }
    
      currentQuotationId={
        pdfData?.id
      }
    />
  )}
    
  {/* STOCK CHECK POPUP */}
    
    {showDistrict && (
  <DistrictCheckModal
    onClose={() => setShowDistrict(false)}
  />
)}
  
  </>
  );
  }
