import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabase";

export default function OrderStatusPage() {

  const [loading, setLoading] =
    useState(false);

  const [orders, setOrders] =
    useState([]);

  const handleInputChange = (
    id,
    field,
    value
  ) => {
  
    setOrders((prev) =>
  
      prev.map((order) =>
  
        order.id === id
  
          ? {
              ...order,
              [field]: value
            }
  
          : order
      )
  
    );
  
  };

  const handleFileUpload = (
    e,
    id,
    field
  ) => {
  
    const file =
      e.target.files?.[0];
  
    if (!file) return;
  
    const fileUrl =
      URL.createObjectURL(file);
  
    setOrders((prev) =>
  
      prev.map((order) =>
  
        order.id === id
  
          ? {
              ...order,
              [field]: fileUrl
            }
  
          : order
               
      )
  
    );
  
  };

  const [currentPage, setCurrentPage] =
    useState(1);

  const [searchTerm, setSearchTerm] =
    useState("");
  
  const [activeTab, setActiveTab] =
    useState("confirmed");

  const ordersPerPage = 10;

  // =========================
  // FETCH ORDERS
  // =========================

  const fetchOrders = async () => {

    setLoading(true);

    const { data, error } =
      await supabase

        .from("order_status")

        .select("*")

        .order("created_date", {
          ascending: false,
        });

    if (!error) {

      setOrders(data || []);

    }

    setLoading(false);

  };

  useEffect(() => {

    fetchOrders();

  }, []);

  // =========================
  // STATUS COLORS
  // =========================

  const getStatusColor = (
    status
  ) => {

    switch (status) {

      case "pending":
        return "bg-yellow-100 text-yellow-700 bg-yellow-500";

      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";

      case "preparing":
        return "bg-orange-100 text-orange-700 border-orange-200";

      case "booking pending":
        return "bg-pink-100 text-pink-700 border-pink-200";

      case "shipped":
        return "bg-blue-100 text-blue-700 border-blue-200";

      default:
        return "bg-gray-100 text-gray-700 border-gray-200";

    }

  };

  // =========================
  // COUNTS
  // =========================

  const confirmedOrders =
    orders.filter(
      (o) =>
        o.status === "confirmed"
    );

  const pendingOrders =
    orders.filter(
      (o) =>
        o.status === "pending"
    );

  const preparingOrders =
    orders.filter(
      (o) =>
        o.status === "preparing"
    );

  const bookingPendingOrders =
    orders.filter(
      (o) =>
        o.status ===
        "booking pending"
    );

  const shippedOrders =
    orders.filter(
      (o) =>
        o.status === "shipped"
    );

  // =========================
  // FILTERED ORDERS
  // =========================

  const filteredOrders =
    orders.filter((o) => {
  
      const matchesStatus =
        activeTab === "all"
          ? true
          : o.status ===
            activeTab;
  
      const matchesSearch =
  
        o.quotation_no
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
  
        o.customer_name
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          );
  
      return (
        matchesStatus &&
        matchesSearch
      );
  
    });

  // =========================
  // PAGINATION
  // =========================

  const totalPages = Math.ceil(
    filteredOrders.length /
      ordersPerPage
  );

  const paginatedOrders =
    useMemo(() => {

      const start =
        (currentPage - 1) *
        ordersPerPage;

      const end =
        start + ordersPerPage;

      return filteredOrders.slice(
        start,
        end
      );

    }, [
      filteredOrders,
      currentPage,
    ]);

  // =========================
  // UPDATE STATUS
  // =========================

  const updateStatus = async (
    id,
    status
  ) => {
  
    const { error } =
      await supabase
  
        .from("order_status")
  
        .update({
          status:
            String(status).trim(),

          status_updated_at:
            new Date().toISOString()
        })
  
        .eq(
          "id",
          Number(id)
        );
  
    if (error) {
  
      console.log(
        "STATUS ERROR",
        error
      );
  
      return;
  
    }
  
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
            }
          : o
      )
    );
  
  };

  // =========================
  // UPDATE COD
  // =========================

  const updateCOD = async (
    id,
    cod_amount
  ) => {
  
    const { error } =
      await supabase
  
        .from("order_status")
  
        .update({
          cod_amount:
            cod_amount
              ? Number(cod_amount)
              : null,
        })
  
        .eq(
          "id",
          Number(id)
        );
  
    if (error) {
  
      console.log(error);
  
    }
  
  };
  
  // =========================
  // UPDATE AWB
  // =========================

  const updateAWB = async (
    id,
    awb_link
  ) => {

    await supabase

      .from("order_status")

      .update({
        awb_link,
      })

      .eq(   "id",   Number(id) );

  };

  // =========================
  // BILL UPLOAD
  // =========================

  const uploadBill = async (
    e,
    order
  ) => {

    const file =
      e.target.files[0];

    if (!file) return;

    const fileName =
      `bill-${Date.now()}-${file.name}`;

    const { error } =
      await supabase.storage

        .from("bills")

        .upload(
          fileName,
          file
        );

    if (error) {

      alert(
        "Bill Upload Failed"
      );

      return;

    }

    const {
      data: publicUrlData,
    } = supabase.storage

      .from("bills")

      .getPublicUrl(
        fileName
      );

    await supabase

      .from("order_status")

      .update({
        bill_image:
          publicUrlData.publicUrl,
      })

      .eq("id", order.id);

    fetchOrders();

  };

  // =========================
  // QUOTATION IMAGE
  // =========================

  const uploadQuotationImage =
    async (
      e,
      order
    ) => {

      const file =
        e.target.files[0];

      if (!file) return;

      const fileName =
        `quotation-${Date.now()}-${file.name}`;

      const { error } =
        await supabase.storage

          .from("quotations")

          .upload(
            fileName,
            file
          );

      if (error) {

        alert(
          "Quotation Upload Failed"
        );

        return;

      }

      const {
        data: publicUrlData,
      } = supabase.storage

        .from("quotations")

        .getPublicUrl(
          fileName
        );

      await supabase

        .from("order_status")

        .update({
          quotation_image:
            publicUrlData.publicUrl,
        })

        .eq("id", order.id);

      fetchOrders();

    };

  return (

    <div className="space-y-8 w-full">

      {/* LOADING */}
      {loading && (

        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">

          <div className="bg-white px-8 py-5 rounded-3xl font-black text-xl">

            Loading...

          </div>

        </div>

      )}

      {/* TOP CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

        {/* CONFIRMED */}
        <button
          onClick={() => {

            setCurrentPage(1);

            setActiveTab(
              activeTab ===
                "confirmed"
                ? "all"
                : "confirmed"
            );

          }}
          className={`rounded-[32px] p-8 text-left shadow-2xl border-[4px] transition-all duration-200 hover:scale-[1.02] ${
            activeTab ===
            "confirmed"
              ? "bg-green-600 border-black text-white"
              : "bg-green-500 border-transparent text-black"
          }`}
        >

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-black tracking-[2px] uppercase">
                Confirmed
              </p>

              <h2 className="text-5xl font-black mt-4">
                {
                  confirmedOrders.length
                }
              </h2>

            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              activeTab ===
              "confirmed"
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}>
              ✅
            </div>

          </div>

        </button>


        {/* PREPARING */}
        <button
          onClick={() => {

            setCurrentPage(1);

            setActiveTab(
              activeTab ===
                "preparing"
                ? "all"
                : "preparing"
            );

          }}
          className={`rounded-[32px] p-8 text-left shadow-2xl border-[4px] transition-all duration-200 hover:scale-[1.02] ${
            activeTab ===
            "preparing"
              ? "bg-orange-600 border-black text-white"
              : "bg-orange-500 border-transparent text-white"
          }`}
        >

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-black tracking-[2px] uppercase">
                Preparing
              </p>

              <h2 className="text-5xl font-black mt-4">
                {
                  preparingOrders.length
                }
              </h2>

            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              activeTab ===
              "preparing"
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}>
              📦
            </div>

          </div>

        </button>

        {/* BOOKING PENDING */}
        <button
          onClick={() => {
        
            setCurrentPage(1);
        
            setActiveTab(
              activeTab ===
                "booking pending"
                ? "all"
                : "booking pending"
            );
        
          }}
          className={`rounded-[32px] p-8 text-left shadow-2xl border-[4px] transition-all duration-200 hover:scale-[1.02] ${
            activeTab ===
            "booking pending"
              ? "bg-pink-600 border-black text-white"
              : "bg-pink-500 border-transparent text-white"
          }`}
        >
        
          <div className="flex items-start justify-between">
        
            <div>
        
              <p className="text-sm font-black tracking-[2px] uppercase">
                Booking Pending
              </p>
        
              <h2 className="text-5xl font-black mt-4">
                {
                  bookingPendingOrders.length
                }
              </h2>
        
            </div>
        
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              activeTab ===
              "booking pending"
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}>
              📌
            </div>
        
          </div>
        
        </button>

        {/* SHIPPED */}
        <button
          onClick={() => {

            setCurrentPage(1);

            setActiveTab(
              activeTab ===
                "shipped"
                ? "all"
                : "shipped"
            );

          }}
          className={`rounded-[32px] p-8 text-left shadow-2xl border-[4px] transition-all duration-200 hover:scale-[1.02] ${
            activeTab ===
            "shipped"
              ? "bg-blue-600 border-black text-white"
              : "bg-blue-500 border-transparent text-white"
          }`}
        >

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-black tracking-[2px] uppercase">
                Shipped
              </p>

              <h2 className="text-5xl font-black mt-4">
                {
                  shippedOrders.length
                }
              </h2>

            </div>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              activeTab ===
              "shipped"
                ? "bg-white text-black"
                : "bg-black text-white"
            }`}>
              🚚
            </div>

          </div>

        </button>

        {/* PENDING */}
          <button
            onClick={() => {
  
              setCurrentPage(1);
  
              setActiveTab(
                activeTab ===
                  "pending"
                  ? "all"
                  : "pending"
              );
  
            }}
            className={`rounded-[32px] p-8 text-left shadow-2xl border-[4px] transition-all duration-200 hover:scale-[1.02] ${
              activeTab ===
              "pending"
              ? "bg-red-700 border-white text-white"
              : "bg-red-600 border-transparent text-white"
            }`}
          >
  
            <div className="flex items-start justify-between">
  
              <div>
  
                <p className="text-sm font-black tracking-[2px] uppercase">
                  Pending | ERROR
                </p>
  
                <h2 className="text-5xl font-black mt-4">
                  {
                    pendingOrders.length
                  }
                </h2>
  
              </div>
  
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                activeTab ===
                "pending"
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}>
                ⏳
              </div>
  
            </div>
  
          </button>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden w-full">

        {/* HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">

          <div>

            <h2 className="text-3xl font-black">
              Order Status
            </h2>

            <p className="text-gray-500 mt-2">
              Manage all orders
            </p>

          </div>

          <input
              type="text"
              placeholder="Search quotation / customer..."
              value={searchTerm}
              onChange={(e) => {
            
                setSearchTerm(
                  e.target.value
                );
            
                setCurrentPage(1);
            
              }}
              className="w-[320px] h-14 rounded-2xl border border-gray-200 px-5 outline-none font-semibold"
            />

          <div className="bg-black text-white px-5 py-3 rounded-2xl font-black">

            Total :
            {" "}
            {
              filteredOrders.length
            }

          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-x-auto w-full">

          <table className="w-full">

            <thead className="bg-black text-white sticky top-0 z-10">

              <tr>

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[140px]">
                  Quotation
                </th>

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[130px]">
                  Date
                </th>

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[240px]">
                  Customer
                </th>

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[170px]">
                  Sales Person
                </th>
                
                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[140px]">
                  Amount
                </th>
                    
                {
                  activeTab !== "pending" && (
                
                    <th className="px-4 py-5 text-left text-sm font-black whitespace-nowrap">
                
                      Payment Type
                
                    </th>
                
                  )
                }
                    
                {
                  activeTab !== "pending" && (
                
                    <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[120px]">
                
                      COD
                
                    </th>
                
                  )
                }

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[170px]">
                  Status
                </th>
                    
                {
                  activeTab !== "pending" && (
                
                    <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[260px]">
                
                      Bilti Upload
                
                    </th>
                
                  )
                }
                    
                {
                  activeTab !== "pending" && (
                
                    <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[150px]">
                
                      Bill
                
                    </th>
                
                  )
                }
                    
                {
                  activeTab !== "pending" && (
                
                    <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[170px]">
                
                      Quotation Image
                
                    </th>
                
                  )
                }

                {
                  activeTab === "pending" && (
                
                    <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[300px]">
                
                      Remark
                
                    </th>
                
                  )
                }

                <th className="text-left px-4 py-5 text-sm font-black whitespace-nowrap min-w-[120px]">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {paginatedOrders.map(
                (order) => (

                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                  >

                    <td className="px-4 py-5 font-black whitespace-nowrap">
                      {
                        order.quotation_no ||
                        "N/A"
                      }
                    </td>

                    <td className="px-4 py-5 font-semibold text-gray-600 whitespace-nowrap">
                      {
                        order.created_date ||
                        "N/A"
                      }
                    </td>

                    <td className="px-4 py-5 font-bold">
                      {
                        order.customer_name ||
                        "N/A"
                      }
                    </td>

                    <td className="px-4 py-5 whitespace-nowrap">
                      {
                        order.sales_person ||
                        "N/A"
                      }
                    </td>

                    <td className="px-4 py-5 font-black whitespace-nowrap">
                      ₹{
                        Number(
                          order.amount || order.total_amount || 0
                        ).toLocaleString()
                      }
                    </td>
      
                    {
                      order.status !== "pending" && (
                        
                    <td className="px-4 py-5">

                      <select
                    
                        value={
                          order.payment_type || "cod"
                        }
                    
                        onChange={(e) =>
                          handleInputChange(
                            order.id,
                            "payment_type",
                            e.target.value
                          )
                        }
                    
                        className={`
                          h-12 px-4 rounded-2xl border font-bold outline-none
                    
                          ${
                            (
                              order.payment_type ||
                              "cod"
                            ) === "credit"
                    
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                    
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                          }
                        `}
                      >
                    
                        <option value="cod">
                          COD
                        </option>
                    
                        <option value="credit">
                          CREDIT
                        </option>
                    
                      </select>
                    
                    </td>
                      )
                    }

                  {
                    order.status !== "pending" && (
                  
                      <td className="px-4 py-5">
                  
                        {
                          (
                            order.payment_type ||
                            "cod"
                          ) === "cod"
                  
                          ? (
                  
                            <input
                              type="number"
                              defaultValue={
                                order.cod_amount || 0
                              }
                              onBlur={(e) =>
                                updateCOD(
                                  order.id,
                                  e.target.value
                                )
                              }
                              placeholder="COD"
                              className="w-full min-w-[100px] h-11 rounded-2xl border border-gray-200 px-4 outline-none"
                            />
                  
                          ) : (
                  
                            <div className="text-sm font-bold text-gray-400">
                              --
                            </div>
                  
                          )
                        }
                  
                      </td>
                  
                    )
                  }

                    <td className="px-4 py-5">

                      <select
                        value={
                          order.status
                        }
                        onChange={(e) =>
                          updateStatus(
                            order.id,
                            e.target.value
                          )
                        }
                        className={`w-full min-w-[150px] h-11 rounded-2xl border px-4 font-bold outline-none ${getStatusColor(
                          order.status
                        )}`}
                      >

                        <option value="pending">
                          Pending
                        </option>

                        <option value="confirmed">
                          Confirmed
                        </option>

                        <option value="preparing">
                          Preparing
                        </option>

                        <option value="booking pending">
                          Booking Pending
                        </option>

                        <option value="shipped">
                          Shipped
                        </option>

                      </select>

                    </td>

                    {
                      order.status !== "pending" && (
                    
                        <td className="px-4 py-5">
                    
                          <div className="flex items-center gap-3">
                        
                            {/* AWB LINK */}
                        
                            <input
                              type="text"
                        
                              value={
                                order.awb_link || ""
                              }
                        
                              onChange={(e) =>
                                handleInputChange(
                                  order.id,
                                  "awb_link",
                                  e.target.value
                                )
                              }
                        
                              placeholder="Paste AWB Link"
                        
                              className="w-56 h-12 rounded-2xl border border-gray-200 px-4 outline-none"
                            />
                        
                            {/* CREDIT ONLY BILTI */}
                        
                            {
                              (
                                order.payment_type ||
                                "cod"
                              ) === "credit" && (
                        
                                <label className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center cursor-pointer text-white text-xl">
                    
                                  {
                                    order.bilti_image && (
                                  
                                      <button
                                  
                                        onClick={() =>
                                          handleInputChange(
                                            order.id,
                                            "bilti_image",
                                            ""
                                          )
                                        }
                                  
                                        className="w-12 h-12 rounded-2xl bg-red-500 text-white font-black"
                                      >
                                        ✕
                                      </button>
                                  
                                    )
                                  }
                                                              
                                  📦
                        
                                  <input
                                    type="file"
                                    hidden
                        
                                    onChange={(e) =>
                                      handleFileUpload(
                                        e,
                                        order.id,
                                        "bilti_image"
                                      )
                                    }
                                  />
                        
                                </label>
                        
                              )
                            }
                        
                          </div>
                        
                        </td>
                    
                      )
                    }

                    {
                      activeTab !== "pending" && (
                        
                    <td className="px-4 py-5">

                      <div className="flex items-center gap-2">

                        <label className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center cursor-pointer shrink-0">

                          📄

                          <input
                            type="file"
                            accept="image/*,.pdf"
                            hidden
                            onChange={(e) =>
                              uploadBill(
                                e,
                                order
                              )
                            }
                          />

                        </label>

                        {order.bill_image && (

                          <div className="flex items-center gap-2">
                        
                            <a
                              href={
                                order.bill_image
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="h-11 px-4 rounded-2xl bg-blue-500 text-white font-black flex items-center justify-center whitespace-nowrap"
                            >
                              View
                            </a>
                        
                            <button
                        
                              onClick={() =>
                                handleInputChange(
                                  order.id,
                                  "bill_image",
                                  ""
                                )
                              }
                        
                              className="w-11 h-11 rounded-2xl bg-red-500 text-white font-black"
                            >
                              ✕
                            </button>
                        
                          </div>
                        
                        )}

                      </div>

                    </td>
                      )
                    }

                    {
                      activeTab !== "pending" && (
                        
                    <td className="px-4 py-5">

                      <div className="flex items-center gap-2">

                        <label className="w-11 h-11 rounded-2xl bg-green-500 text-black flex items-center justify-center cursor-pointer shrink-0">

                          🖼️

                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                              uploadQuotationImage(
                                e,
                                order
                              )
                            }
                          />

                        </label>

                        {order.quotation_image && (

                          <div className="flex items-center gap-2">
                          
                            <img
                              src={
                                order.quotation_image
                              }
                              alt="quotation"
                              className="w-12 h-12 rounded-2xl object-cover border shrink-0"
                            />
                        
                            <button
                        
                              onClick={() =>
                                handleInputChange(
                                  order.id,
                                  "quotation_image",
                                  ""
                                )
                              }
                        
                              className="w-11 h-11 rounded-2xl bg-red-500 text-white font-black"
                            >
                              ✕
                            </button>
                        
                          </div>
                        
                        )}

                      </div>

                    </td>

                        )
                      }

                    {
                      order.status === "pending" && (
                    
                        <td className="px-4 py-5 min-w-[300px]">
                    
                          <textarea
                    
                            value={
                              order.remark || ""
                            }
                    
                            onChange={(e) =>
                              handleInputChange(
                                order.id,
                                "remark",
                                e.target.value
                              )
                            }
                    
                            placeholder="Enter pending remark..."
                    
                            className="w-full min-h-[90px] rounded-2xl border border-gray-200 p-4 outline-none resize-none font-semibold"
                          />
                    
                        </td>
                    
                      )
                    }

                    <td className="px-4 py-5">

                      <button
                        onClick={async () => {
                      
                          setLoading(true);
                      
                          const { error } =
                            await supabase
                      
                              .from("order_status")
                      
                              .update({

                                  status:
                                    order.status,
                                
                                  cod_amount:
                                    order.cod_amount,
                                
                                  awb_link:
                                    order.awb_link,
                                
                                  payment_type:
                                    order.payment_type,
                                
                                  remark:
                                    order.remark,
                                
                                  bilti_image:
                                    order.bilti_image,
                                
                                  bill_image:
                                    order.bill_image,
                                
                                  quotation_image:
                                    order.quotation_image
                                
                                })
                      
                              .eq(
                                "id",
                                order.id
                              );
                      
                          setLoading(false);
                      
                          if (error) {
                      
                            alert(
                              "Update Failed"
                            );
                      
                            console.log(error);
                      
                            return;
                      
                          }
                      
                          alert(
                            "Order Updated Successfully"
                          );
                      
                          fetchOrders();
                      
                        }}
                      
                        className="w-full min-w-[90px] h-11 rounded-2xl bg-black text-white font-black hover:scale-[1.02] transition-all duration-200"
                      >
                        Save
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-center gap-3 p-6 border-t border-gray-100">

          <button
            disabled={
              currentPage === 1
            }
            onClick={() =>
              setCurrentPage(
                currentPage - 1
              )
            }
            className={`h-12 px-5 rounded-2xl font-black ${
              currentPage === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white"
            }`}
          >
            Prev
          </button>

          <div className="h-12 px-6 rounded-2xl bg-green-500 text-black font-black flex items-center justify-center">

            {currentPage}
            {" / "}
            {totalPages || 1}

          </div>

          <button
            disabled={
              currentPage ===
              totalPages
            }
            onClick={() =>
              setCurrentPage(
                currentPage + 1
              )
            }
            className={`h-12 px-5 rounded-2xl font-black ${
              currentPage ===
              totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-black text-white"
            }`}
          >
            Next
          </button>

        </div>

      </div>

    </div>

  );

}
