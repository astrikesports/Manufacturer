import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../supabase";

import LoaderOverlay from "../components/LoaderOverlay";
import { fetchQuotations } from "../services/quotationService";

export default function Dashboard({
  onSelect
}) {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [salesPersons, setSalesPersons] = useState([]);

  const [quotations, setQuotations] = useState([]);
  
  const [monthFilter, setMonthFilter] =
  useState("current");

  const [orderStatusData, setOrderStatusData] =
  useState([]);

  const [selectedPerson, setSelectedPerson] =
    useState(null);

  // LOAD DATA
  useEffect(() => {
  
    fetchData();
  
    // AUTO OPEN SALES PERSON
    const selected =
      localStorage.getItem(
        "selectedSalesPerson"
      );
  
    if (selected) {
  
      setSelectedPerson({
        name: selected
      });
    }
  
  }, []);

  // FETCH DATA
  const fetchData = async () => {

    setLoading(true);

    // SALES PERSONS
    const {
      data: salesData
    } = await supabase

      .from("sales_persons")

      .select("*")

      .order("id", {
        ascending: false
      });

    // ORDER STATUS
    const {
      data: orderData
    } = await supabase
    
      .from("order_status")
    
      .select("*");
    
    setOrderStatusData(
      orderData || []
    );

    
    // QUOTATIONS
    const {
      data: quotationData
    } = await supabase

      .from("quotations")

      .select("*")

      .order("id", {
        ascending: false
      });

    setSalesPersons(salesData || []);

    setQuotations(quotationData || []);

    setLoading(false);
  };


  // ORDER GET
  const getOrderData = (
    quotationNo
  ) => {
  
    return orderStatusData.find(
      (o) =>
        o.quotation_no ===
        quotationNo
    );
  
  };

  // GET PERSON QUOTATIONS
  const getPersonQuotations = (name) => {
  
    return quotations
  
      .filter((q) => {
  
        // SALES PERSON
        if (
          q.sales_person !==
          name
        ) {
          return false;
        }
  
        const quoteDate =
          new Date(
            q.created_at
          );
  
        const today =
          new Date();
  
        // CURRENT MONTH
        if (
          monthFilter ===
          "current"
        ) {
  
          return (
  
            quoteDate.getMonth() ===
              today.getMonth() &&
  
            quoteDate.getFullYear() ===
              today.getFullYear()
  
          );
        }
  
        // LAST MONTH
        const lastMonth =
          new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1
          );
  
        return (
  
          quoteDate.getMonth() ===
            lastMonth.getMonth() &&
  
          quoteDate.getFullYear() ===
            lastMonth.getFullYear()
  
        );
  
      })
  
      .sort(
        (a, b) =>
  
          new Date(
            b.created_at
          ) -
  
          new Date(
            a.created_at
          )
      );
  
  };

  // CALCULATE SALES
  const calculateSales = (name) => {
  
    const personQuotations =
      getPersonQuotations(name);
  
    let total = 0;
  
    personQuotations.forEach((q) => {
  
      total += Number(
        q.net_amount || 0
      );
  
    });
  
    return total;
  };


  
  // =========================
  // ACTION FUNCTIONS START
  // =========================
  
  // VIEW QUOTATION
  const handleViewQuotation = (
    id
  ) => {
  
    localStorage.setItem(
      "selectedQuotationId",
      id
    );
  
    navigate("/quotation");
  
  };
  
  // DOWNLOAD PDF
  const handleDownloadPDF = async (
    quote
  ) => {
  
    localStorage.setItem(
      "selectedQuotationId",
      quote.id
    );
  
    navigate("/quotation");
  
  };
  
  // DELETE QUOTATION
  const handleDeleteQuotation =
    async (id) => {
  
      const confirmDelete =
        window.confirm(
          "Delete quotation?"
        );
  
      if (!confirmDelete)
        return;
  
      await supabase
        .from("quotations")
        .delete()
        .eq("id", id);
  
      fetchData();
    };
  
  // CONFIRM QUOTATION
  const handleConfirmQuotation =
    async (quote) => {
  
      try {
  
        // ALREADY CONFIRMED
        if (
          quote.status ===
          "confirmed"
        ) {
  
          alert(
            "Already confirmed"
          );
  
          return;
        }
  
        // GET PRODUCTS
        const {
          data: products
        } = await supabase
          .from("products")
          .select("*");
  
        // UPDATE STOCK
        for (const item of quote.items ||
          []) {
  
          const product =
            products.find(
              (p) =>
                p.product_name ===
                item.desc
            );
  
          if (!product)
            continue;
  
          let variants =
            typeof product.variants ===
            "string"
  
              ? JSON.parse(
                  product.variants
                )
  
              : product.variants ||
                {};
  
          // PARSE SIZE
          item.size
            ?.split(",")
            .forEach((s) => {
  
              const [
                size,
                qty,
              ] = s
                .trim()
                .split("-");
  
              const requiredQty =
                Number(qty || 0);
  
              if (
                variants[size]
              ) {
  
                variants[
                  size
                ].qty =
                  Number(
                    variants[
                      size
                    ].qty || 0
                  ) -
                  requiredQty;
              }
            });
  
          // UPDATE PRODUCT
          await supabase
            .from("products")
            .update({
              variants,
            })
            .eq(
              "id",
              product.id
            );
        }
  
        // UPDATE STATUS
        await supabase
          .from("quotations")
          .update({
            status:
              "confirmed",
          })
          .eq("id", quote.id);
  
        fetchData();
  
        alert(
          "Quotation confirmed & inventory updated"
        );
  
      } catch (err) {
  
        console.log(err);
  
        alert(
          "Confirmation failed"
        );
  
      }
    };
  
  // =========================
  // ACTION FUNCTIONS END
  // =========================

  return (

    <div className="min-h-screen bg-[#f4f6f8] p-4 md:p-8">

      {/* LOADER */}
      {loading && (
        <LoaderOverlay text="Loading Dashboard..." />
      )}

      {/* TOP BAR */}
      <div className="bg-gradient-to-r from-black to-gray-900 rounded-[32px] p-8 md:p-10 text-white shadow-2xl mb-8 overflow-hidden relative">

        <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          <div>

            <p className="text-green-400 font-bold tracking-[4px] uppercase text-xs">
              ASTRIKE SPORTSWEAR
            </p>

            <h1 className="text-4xl md:text-6xl font-black mt-4 leading-tight">
              Sales Dashboard
            </h1>

            <p className="text-gray-300 mt-4 text-lg">
              Team Performance Overview
            </p>

          </div>

        </div>

        <div className="flex gap-3 mt-6">
      
          {/* CURRENT MONTH */}
          <button
            onClick={() =>
              setMonthFilter(
                "current"
              )
            }
            className={`h-12 px-6 rounded-2xl font-black transition-all duration-200 ${
              monthFilter ===
              "current"
        
                ? "bg-green-500 text-black shadow-xl"
        
                : "bg-white/10 border border-white/10 text-white hover:bg-white/20"
            }`}
          >
            This Month
          </button>
        
          {/* LAST MONTH */}
          <button
            onClick={() =>
              setMonthFilter(
                "last"
              )
            }
            className={`h-12 px-6 rounded-2xl font-black transition-all duration-200 ${
              monthFilter ===
              "last"
        
                ? "bg-green-500 text-black shadow-xl"
        
                : "bg-white/10 border border-white/10 text-white hover:bg-white/20"
            }`}
          >
            Last Month
          </button>
        
        </div>

      </div>

      {/* SALES PERSON CARDS */}
      {!selectedPerson && (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

          {salesPersons.map((person) => {

            const isLocked =
              person.locked;
            
            const personPin =
              person.pin;

            const personQuotations =
              getPersonQuotations(person.name);

            const totalSales =
              calculateSales(person.name);

            const target =
              Number(person.target_amount || 0);

            const percent =
              target > 0
                ? Math.min(
                    (
                      (totalSales / target) *
                      100
                    ).toFixed(0),
                    100
                  )
                : 0;

            return (

              <div
                key={person.id}
                onClick={() => {

                // LOCKED CARD
                if (isLocked) {
              
                  const enteredPin =
                    prompt(
                      `Enter PIN for ${person.name}`
                    );
              
                  // WRONG PIN
                  if (
                    enteredPin !==
                    String(personPin)
                  ) {
              
                    alert("Wrong PIN");
              
                    return;
                  }
              
                }
              
                setSelectedPerson(person);
              
              }}
                className="bg-white rounded-[32px] p-6 shadow-sm border cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-gray-100"
              >

                {/* TOP */}
                <div className="flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="text-3xl font-black">
                        {person.name}
                      </h2>
                    
                      {isLocked && (
                    
                        <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg">
                          🔒
                        </div>
                    
                      )}
                    
                    </div>

                    <p className="text-gray-500 mt-2 font-medium">
                      Sales Executive
                    </p>

                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-black shadow-xl">
                    {person.name?.charAt(0)}
                  </div>

                </div>

                {/* SALES */}
                <div className="mt-8">

                  <p className="text-gray-500 font-semibold text-sm">
                    TOTAL SALES
                  </p>

                  <h3 className="text-4xl font-black mt-2">
                    ₹{totalSales.toLocaleString()}
                  </h3>

                </div>

                {/* TARGET */}
                <div className="mt-6">

                  <div className="flex items-center justify-between mb-2">

                    <span className="text-gray-500 text-sm font-semibold">
                      Target
                    </span>

                    <span className="font-black">
                      ₹{target.toLocaleString()}
                    </span>

                  </div>

                  {/* BAR */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${percent}%`
                      }}
                    />

                  </div>

                  <div className="flex justify-between mt-2">

                    <span className="text-sm text-gray-500">
                      Completion
                    </span>

                    <span className="font-black text-green-600">
                      {percent}%
                    </span>

                  </div>

                </div>

                {/* QUOTATIONS */}
                <div className="mt-6 flex items-center justify-between bg-gray-50 rounded-2xl p-4">

                  <div>

                    <p className="text-sm text-gray-500 font-semibold">
                      Quotations
                    </p>

                    <h4 className="text-2xl font-black mt-1">
                      {personQuotations.length}
                    </h4>

                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-2xl shadow-lg">
                    📄
                  </div>

                </div>

              </div>
            );
          })}

        </div>

      )}

      {/* DETAIL PAGE */}
      {selectedPerson && (

        <div className="mt-2">

          {/* TOP */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">

            {/* LEFT */}
            <div className="flex items-center gap-4">

              {/* BACK */}
              <button
                onClick={() => {

                  localStorage.removeItem(
                    "selectedSalesPerson"
                  );
                
                  setSelectedPerson(null);
                
                }}
                
                className="w-14 h-14 rounded-2xl bg-black text-white text-2xl font-black shadow-xl hover:scale-[1.02] transition-all"
              >
                ←
              </button>

              <div>

                <h2 className="text-5xl font-black">
                  {selectedPerson.name}
                </h2>

                <p className="text-gray-500 mt-2 text-lg">
                  Sales Performance & Quotations
                </p>

              </div>

            </div>

            {/* RIGHT */}
            <div className="flex flex-col gap-4">

              {/* TOTAL QUOTATIONS */}
              <div className="bg-black text-white px-8 py-5 rounded-3xl shadow-2xl">

                <p className="text-gray-300 text-sm font-semibold">
                  TOTAL QUOTATIONS
                </p>

                <h3 className="text-5xl font-black mt-2">
                  {
                    getPersonQuotations(
                      selectedPerson.name
                    ).length
                  }
                </h3>

              </div>

              {/* NEW QUOTATION BUTTON */}
              <button
                onClick={() => {

                  // SAVE SALES PERSON
                  localStorage.setItem(
                    "selectedSalesPerson",
                    selectedPerson.name
                  );

                  // REDIRECT
                  navigate("/quotation");
                }}
                className="h-14 px-8 rounded-2xl bg-green-500 text-white font-black text-lg hover:scale-[1.02] transition-all duration-200 shadow-xl"
              >
                + New Quotation
              </button>

              <button
                onClick={() => {
                  localStorage.setItem("selectedSalesPerson", selectedPerson.name);
                  navigate("/mobile-quotation");
                }}
                className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-black text-lg hover:scale-[1.02] transition-all duration-200 shadow-xl md:hidden"
              >
                📱 Mobile Quotation
              </button>

            </div>

          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            {/* SALES */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">

              <p className="text-gray-500 font-semibold">
                Total Sales
              </p>

              <h2 className="text-5xl font-black mt-3">
                ₹{calculateSales(
                  selectedPerson.name
                ).toLocaleString()}
              </h2>

            </div>

            {/* TARGET */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">

              <p className="text-gray-500 font-semibold">
                Monthly Target
              </p>

              <h2 className="text-5xl font-black mt-3">
                ₹{Number(
                  selectedPerson.target_amount || 0
                ).toLocaleString()}
              </h2>

            </div>

            {/* COMPLETION */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">

              <p className="text-gray-500 font-semibold">
                Completion
              </p>

              <h2 className="text-5xl font-black mt-3 text-green-600">

                {Number(
                  selectedPerson.target_amount
                ) > 0

                  ? Math.min(
                      (
                        (calculateSales(
                          selectedPerson.name
                        ) /

                          Number(
                            selectedPerson.target_amount
                          )) *

                        100
                      ).toFixed(0),
                      100
                    )

                  : 0}%

              </h2>

            </div>

          </div>

          {/* TABLE */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          
            <div className="overflow-x-auto">
          
              <table className="w-full">
          
                <thead className="bg-black text-white">
          
                  <tr>
          
                    <th className="text-left p-5 font-bold">
                      Party
                    </th>
          
                    <th className="text-left p-5 font-bold">
                      Phone
                    </th>
                    
                    <th className="text-left p-5 font-bold">
                      Date
                    </th>
                    
                    <th className="text-left p-5 font-bold">
                      Amount
                    </th>
          
                    <th className="text-left p-5 font-bold">
                      Status
                    </th>

                    <th className="text-left p-5 font-bold">
                      Tracking
                    </th>
                    
                    <th className="text-left p-5 font-bold">
                      Bill
                    </th>
          
                    <th className="text-center p-5 font-bold">
                      Actions
                    </th>
          
                  </tr>
          
                </thead>
          
                <tbody>
          
                  {getPersonQuotations(
                    selectedPerson.name
                  ).map((quote) => {
                  
                    const orderData =
                      getOrderData(
                        quote.quotation_no
                      );
                  
                    return (
                      
                    <tr
                      key={quote.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                    >
          
                      {/* PARTY */}
                      <td className="p-5">
          
                        <div>
          
                          <h3 className="font-black text-lg">
                            {quote.party}
                          </h3>
          
                        </div>
          
                      </td>
          
                      {/* PHONE */}
                      <td className="p-5 font-semibold text-gray-700">
                        {quote.phone}
                      </td>
          
                      {/* DATE */}
                      <td className="p-5 text-gray-500 font-semibold">
          
                        {new Date(
                          quote.created_at
                        ).toLocaleDateString()}
          
                      </td>
                      
                      {/* AMOUNT */}
                      <td className="p-5">
                      
                        <div className="font-black text-lg text-green-600">
                      
                          ₹{
                            Number(
                              quote.amount || 0
                            ).toLocaleString()
                          }
                      
                        </div>
                      
                      </td>
                      
                      {/* STATUS */}

                      <td className="p-5">
                      
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm ${
                            quote.status ===
                            "confirmed"
                      
                              ? "bg-green-100 text-green-700"
                      
                              : quote.status ===
                                "cancelled"
                      
                              ? "bg-red-100 text-red-700"
                      
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                      
                          <div
                            className={`w-2 h-2 rounded-full ${
                              quote.status ===
                              "confirmed"
                      
                                ? "bg-green-500"
                      
                                : quote.status ===
                                  "cancelled"
                      
                                ? "bg-red-500"
                      
                                : "bg-yellow-500"
                            }`}
                          />
                      
                          {quote.status ===
                          "confirmed"
                      
                            ? "Confirmed"
                      
                            : quote.status ===
                              "cancelled"
                      
                            ? "Cancelled"
                      
                            : "Pending"}
                      
                        </div>
                      
                      </td>

                      {/* TRACKING */}
                      <td className="p-5">
                      
                        {orderData ? (
                      
                          <div className="inline-flex items-center gap-2">
                      
                            {orderData.status === "shipped" ? (
                      
                              orderData.payment_type === "credit" ? (
                      
                                orderData.bilti_image ? (
                      
                                  <a
                                    href={orderData.bilti_image}
                                    target="_blank"
                                    rel="noreferrer"
                      
                                    className="bg-purple-500 text-white px-4 py-2 rounded-2xl font-bold inline-flex items-center gap-2"
                                  >
                                    📦 View Bilti
                                  </a>
                      
                                ) : (
                      
                                  <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl font-bold">
                      
                                    No Bilti
                      
                                  </div>
                      
                                )
                      
                              ) : (
                      
                                <a
                                  href={orderData.awb_link}
                                  target="_blank"
                                  rel="noreferrer"
                      
                                  className="bg-blue-500 text-white px-4 py-2 rounded-2xl font-bold inline-flex items-center gap-2"
                                >
                                  🚚 Track Order
                                </a>
                      
                              )
                      
                            ) : (
                      
                              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl font-bold inline-flex items-center gap-2">
                      
                                🚚 {orderData.status}
                      
                              </div>
                      
                            )}
                      
                          </div>
                      
                        ) : (
                      
                          <div className="text-gray-400">
                            No Tracking
                          </div>
                      
                        )}
                      
                      </td>
                      
                      {/* BILL */}
                      <td className="p-5">
                      
                        {orderData?.bill_image ? (
                      
                          <a
                            href={orderData.bill_image}
                            target="_blank"
                            rel="noreferrer"
                      
                            className="bg-blue-500 text-white px-4 py-2 rounded-2xl font-bold inline-flex items-center"
                          >
                            📄 Bill
                          </a>
                      
                        ) : (
                      
                          <div className="text-gray-400">
                            No Bill
                          </div>
                      
                        )}
                      
                      </td>
                    
          
                      {/* ACTIONS */}
                      <td className="p-5">
                      
                        <div className="flex items-center justify-center gap-3">
                      
                          {/* VIEW */}
                          <button
                            onClick={() =>
                              handleViewQuotation(
                                quote.id
                              )
                            }
                            className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center text-lg shadow-lg hover:scale-105 transition-all"
                            title="View"
                          >
                            👁
                          </button>
                      
                          {/* DOWNLOAD */}
                          <button
                            onClick={() => {
                          
                              localStorage.setItem(
                                "selectedQuotationId",
                                quote.id
                              );
                          
                              window.location.href =
                                "/quotation";
                          
                            }}
                            className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-lg shadow-lg hover:scale-105 transition-all"
                            title="Download"
                          >
                            📥
                          </button>
                      
                          {/* DELETE */}
                          <button
                            onClick={() =>
                              handleDeleteQuotation(
                                quote.id
                              )
                            }
                            className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center text-lg shadow-lg hover:scale-105 transition-all"
                            title="Delete"
                          >
                            🗑
                          </button>
                      
                          {/* CONFIRM */}
                          <button
                            onClick={() =>
                              handleConfirmQuotation(
                                quote
                              )
                            }
                      
                            disabled={
                              quote.status ===
                              "confirmed"
                            }
                      
                            className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center text-lg shadow-lg transition-all ${
                              quote.status ===
                              "confirmed"
                      
                                ? "bg-gray-400 cursor-not-allowed"
                      
                                : "bg-green-600 hover:scale-105"
                            }`}
                            title="Confirm"
                          >
                            ✓
                          </button>
                      
                        </div>
                      
                      </td>
                      
                    </tr>

                      );
                    
                    })}
          
                </tbody>
          
              </table>
          
            </div>
          
          </div>

          {/* TABLE END */}

        </div>

      )}

    </div>
  );
}
