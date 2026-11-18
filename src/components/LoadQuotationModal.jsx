import { useEffect, useMemo, useState } from "react";
import { fetchQuotations } from "../services/quotationService";

const PAGE_SIZE = 10;

export default function LoadQuotationModal({
  onClose,
  onSelect,
  onDelete
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 search + pagination state
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

  /* 🔹 LOAD DATA */
  const loadList = async () => {
    setLoading(true);
    try {
      const data = await fetchQuotations();
      setList(data || []);
    } catch (e) {
      console.error("Failed to load quotations", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  /* 🔍 FILTER (SEARCH) */
  const filteredList = useMemo(() => {

    const selectedSalesPerson =
      localStorage.getItem(
        "selectedSalesPerson"
      );
  
    let filtered = [...list];
  
    // SALES PERSON FILTER
    if (selectedSalesPerson) {
  
      filtered = filtered.filter(
        (it) =>
  
          it.salesPerson ===
            selectedSalesPerson ||
  
          it.sales_person ===
            selectedSalesPerson
      );
  
    }
  
    // SEARCH
    if (!search.trim()) {
  
      return filtered;
  
    }
  
    const q =
      search.toLowerCase();
  
    return filtered.filter(it =>
  
      (it.party || "")
        .toLowerCase()
        .includes(q)
  
      ||
  
      (
        it.quotationNo ||
        it.quotation_no ||
        ""
      )
        .toLowerCase()
        .includes(q)
  
    );
  
  }, [list, search]);

  /* 📄 PAGINATION */
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);

  const paginatedList = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, page]);

  /* ⚡ OPTIMISTIC DELETE */
  const handleDeleteClick = async (q) => {
    // instant UI remove
    const backup = list;
    setList(prev => prev.filter(it => it.id !== q.id));

    try {
      await onDelete(q);     // actual delete
    } catch (e) {
      console.error("Delete failed, restoring list", e);
      setList(backup);      // rollback
    }
  };

  // reset page on search
  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      
        <div className="bg-[#f4f6f8] w-full max-w-5xl h-[90vh] rounded-[36px] shadow-2xl overflow-hidden flex flex-col">
      
          {/* HEADER */}
          <div className="bg-gradient-to-r from-black via-[#071120] to-black px-8 py-7 border-b border-white/10 relative overflow-hidden">
      
            {/* BG EFFECT */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 blur-3xl rounded-full" />
      
            <div className="relative z-10 flex items-center justify-between gap-5">
      
              {/* LEFT */}
              <div>
      
                <p className="text-green-400 text-xs font-black tracking-[4px] uppercase">
                  ASTRIKE SPORTSWEAR
                </p>
      
                <h2 className="text-4xl font-black text-white mt-3">
                  Load Quotations
                </h2>
      
                <p className="text-gray-400 mt-2">
                  Manage & access saved quotations
                </p>
      
              </div>
      
              {/* CLOSE */}
              <button
                onClick={onClose}
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white text-2xl font-black hover:bg-white/20 transition-all"
              >
                ✕
              </button>
      
            </div>
      
          </div>
      
          {/* SEARCH */}
          <div className="p-6 border-b border-gray-200 bg-white">
      
            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search party / quotation no..."
              className="w-full h-14 rounded-2xl border border-gray-200 px-5 text-lg font-semibold outline-none focus:border-black"
            />
      
          </div>
      
          {/* LIST */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f4f6f8]">
      
            {/* LOADING */}
            {loading && (
      
              <div className="bg-white rounded-[32px] p-10 text-center text-gray-500 font-semibold shadow-sm">
                Loading quotations...
              </div>
      
            )}
      
            {/* DATA */}
            {!loading && paginatedList.map(q => (
      
              <div
                key={q.id}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
      
                <div className="p-6">
      
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      
                    {/* LEFT */}
                    <div className="flex-1">
      
                      {/* TOP */}
                      <div className="flex items-start gap-4">
      
                        {/* ICON */}
                        <div className="w-16 h-16 rounded-3xl bg-black text-white flex items-center justify-center text-2xl font-black shadow-xl">
                          #
                        </div>
      
                        {/* TITLE */}
                        <div>
      
                          <p className="text-gray-400 text-xs font-black tracking-[3px]">
                            QUOTATION NO
                          </p>
      
                          <h3 className="text-3xl font-black mt-2">
                            {q.quotationNo || "N/A"}
                          </h3>
      
                          <p className="text-gray-500 mt-2 text-lg font-medium">
                            {q.party || "-"}
                          </p>
      
                        </div>
      
                      </div>
      
                      {/* INFO */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7">
      
                        {/* SALES PERSON */}
                        <div className="bg-gray-50 rounded-3xl p-4 border border-gray-100">
      
                          <p className="text-gray-400 text-[11px] font-black tracking-[2px]">
                            SALES PERSON
                          </p>
      
                          <h4 className="text-xl font-black mt-2">
                            {q.salesPerson || "-"}
                          </h4>
      
                        </div>
      
                        {/* SALE */}
                        <div className="bg-green-500 rounded-3xl p-4 shadow-lg">
      
                          <p className="text-black/70 text-[11px] font-black tracking-[2px]">
                            SALE AMOUNT
                          </p>
      
                          <h4 className="text-2xl font-black text-black mt-2">
                            ₹{
                              Number(
                                q.netAmount || 0
                              ).toLocaleString()
                            }
                          </h4>
      
                        </div>
      
                        {/* CREATED */}
                        <div className="bg-gray-50 rounded-3xl p-4 border border-gray-100">
      
                          <p className="text-gray-400 text-[11px] font-black tracking-[2px]">
                            CREATED
                          </p>
      
                          <h4 className="text-lg font-black mt-2">
      
                            {q.createdAt
                              ? formatDate(q.createdAt)
                              : "-"}
      
                          </h4>
      
                        </div>
      
                        {/* UPDATED */}
                        <div className="bg-gray-50 rounded-3xl p-4 border border-gray-100">
      
                          <p className="text-gray-400 text-[11px] font-black tracking-[2px]">
                            UPDATED
                          </p>
      
                          <h4 className="text-lg font-black mt-2">
      
                            {q.updatedAt
                              ? formatDate(q.updatedAt)
                              : "-"}
      
                          </h4>
      
                        </div>
      
                      </div>
      
                    </div>
      
                    {/* ACTIONS */}
                    <div className="flex xl:flex-col gap-3">
      
                      {/* EDIT */}
                      <button
                        onClick={() => onSelect(q.id)}
                        className="w-14 h-14 rounded-2xl bg-blue-500 text-white text-xl shadow-xl hover:scale-105 transition-all"
                      >
                        ➜]
                      </button>
      
                      {/* DELETE */}
                      <button
                        onClick={() => handleDeleteClick(q)}
                        className="w-14 h-14 rounded-2xl bg-red-500 text-white text-xl shadow-xl hover:scale-105 transition-all"
                      >
                          X
                      </button>
      
                      {/* SAVE */}
                      <button
                        className="w-14 h-14 rounded-2xl bg-green-500 text-white text-xl shadow-xl hover:scale-105 transition-all"
                      >
                        🡻
                      </button>
      
                    </div>
      
                  </div>
      
                </div>
      
              </div>
      
            ))}
      
            {/* EMPTY */}
            {!loading && filteredList.length === 0 && (
      
              <div className="bg-white rounded-[32px] p-10 text-center text-gray-500 font-semibold shadow-sm">
                No quotations found
              </div>
      
            )}
      
          </div>
      
          {/* PAGINATION */}
          {totalPages > 1 && (
      
            <div className="bg-white border-t border-gray-200 px-6 py-5 flex items-center justify-between">
      
              <button
                disabled={page === 1}
                onClick={() =>
                  setPage(p => p - 1)
                }
                className="h-12 px-6 rounded-2xl bg-black text-white font-bold disabled:opacity-40"
              >
                ← Prev
              </button>
      
              <div className="font-black text-lg">
                Page {page} / {totalPages}
              </div>
      
              <button
                disabled={page === totalPages}
                onClick={() =>
                  setPage(p => p + 1)
                }
                className="h-12 px-6 rounded-2xl bg-black text-white font-bold disabled:opacity-40"
              >
                Next →
              </button>
      
            </div>
      
          )}
      
        </div>
      
      </div>
          
  );
}
