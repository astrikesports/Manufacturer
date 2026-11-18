import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import OrderStatusPage from "./OrderStatusPage";
import ConfirmDialog from "../components/ConfirmDialog";
import LoaderOverlay from "../components/LoaderOverlay";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";

export default function AdminDashboard() {

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");

  const [target, setTarget] = useState("");

  const [salesPersons, setSalesPersons] = useState([]);

  const [orders, setOrders] = useState([]);

  const [quotations, setQuotations] = useState([]);

  const [products, setProducts] =
  useState([]);

  const [uploadingCsv, setUploadingCsv] =
    useState(false);

  const [activePage, setActivePage] =
    useState("dashboard");
  
  const [dialogOpen, setDialogOpen] =
  useState(false);

  const [dialogConfig, setDialogConfig] =
    useState({});

  const [globalFilter, setGlobalFilter] =
  useState("today");


  // =========================
  // LIVE REALTIME SYNC
  // =========================
  
  useEffect(() => {
  
    // INITIAL LOAD
    fetchProducts();
  
    fetchSalesPersons();
  
    fetchOrders();
  
    const channel = supabase
  
      .channel("dashboard-live")
  
      // PRODUCTS LIVE
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
  
        async () => {
  
          await fetchProducts();
  
        }
      )
  
      // SALES PERSONS LIVE
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales_persons",
        },
  
        async () => {
  
          await fetchSalesPersons();
  
          toast.success(
            "Sales Person Updated"
          );
  
        }
      )
  
      // QUOTATIONS LIVE
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotations",
        },
  
        async () => {
  
          await fetchSalesPersons();
  
          toast.success(
            "Quotation Updated"
          );
  
        }
      )
  
      // ORDER STATUS LIVE
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_status",
        },
  
        async () => {
  
          await fetchOrders();
  
          toast.success(
            "Order Updated"
          );
  
        }
      )
  
      .subscribe();
  
    return () => {
  
      supabase.removeChannel(
        channel
      );
  
    };
  
  }, []);

  // FETCH

  // =========================
  // FETCH PRODUCTS
  // =========================
  
  const fetchProducts = async () => {
  
    const { data, error } =
      await supabase
        .from("products")
        .select("*")
        .order("id", {
          ascending: false,
        });
  
    if (!error) {
  
      setProducts(data || []);
  
    }
  };

  // SALES PERSONS
  const fetchSalesPersons = async () => {

    setLoading(true);

    // SALES PERSONS
    const { data } = await supabase

      .from("sales_persons")

      .select("*")

      .order("id", {
        ascending: false
      });

    setSalesPersons(data || []);

    // QUOTATIONS
    const {
      data: quotationData
    } = await supabase

      .from("quotations")

      .select("*");

    setQuotations(
      quotationData || []
    );

    setLoading(false);
  };

  // FETCH ORDERS
  const fetchOrders = async () => {

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
  
  };
  
  // TOTAL SALES
  const getTotalSales = () => {

    let total = 0;

    quotations.forEach((q) => {

      // ONLY CONFIRMED
      if (
        q.status !==
          "confirmed" ||
        !filterByDate(   
          q.created_at
        )
      )
        return;
    
      total += Number(
        q.amount || 0
      );
    
    });

    return total;
  };

  // PROFIT
  const getProfit = () => {

    return (
      getTotalSales() * 0.095
    );
  };

  // PERSON SALES
  const getPersonSales = (name) => {

    let total = 0;

    quotations.forEach((q) => {

      if (

        q.sales_person ===
          name &&
        q.status ===
          "confirmed" &&
        filterByDate(   
          q.created_at
        )
      
      ) {

        total += Number(
          q.amount || 0
        );
      }

    });

    return total;
  };

  // PROGRESS
  const getProgress = (
    sales,
    target
  ) => {

    if (!target) return 0;

    return Math.min(
      (
        (sales / target) *
        100
      ).toFixed(0),
      100
    );
  };

  // ADD SALES PERSON
  const addSalesPerson = async () => {

    if (!name || !target) {

      alert(
        "Enter name and target"
      );

      return;
    }

    setLoading(true);

    const { error } =
      await supabase

        .from("sales_persons")

        .insert([
          {
            name,
            target_amount: target
          }
        ]);

    setLoading(false);

    if (error) {

      alert(
        "Failed to add"
      );

      return;
    }

    setName("");

    setTarget("");

    fetchSalesPersons();
  };

  // UPDATE TARGET
  const updateTarget = async (
    id,
    value
  ) => {

    if (!value) return;

    setLoading(true);

    const { error } =
      await supabase

        .from("sales_persons")

        .update({
          target_amount: value
        })

        .eq("id", id);

    setLoading(false);

    if (error) {

      alert(
        "Failed to update target"
      );

      return;
    }

    fetchSalesPersons();
  };

  // DELETE
  const deleteSalesPerson =
    async (id) => {

      const confirmDelete =
        window.confirm(
          "Delete this sales person?"
        );

      if (!confirmDelete)
        return;

      setLoading(true);

      const { error } =
        await supabase

          .from("sales_persons")

          .delete()

          .eq("id", id);

      setLoading(false);

      if (error) {

        alert(
          "Delete failed"
        );

        return;
      }

      fetchSalesPersons();
    };

  // =========================
  // SAMPLE CSV DOWNLOAD START
  // =========================
  
  const downloadSampleCSV = () => {
    const sampleData = [
      ["product_name", "M", "L", "XL", "2XL"],
      ["QR25", "20", "15", "10", "5"],
      ["TRACK01", "50", "40", "25", "10"],
    ];
  
    const csvContent = sampleData
      .map((row) => row.join(","))
      .join("\n");
  
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
  
    const url =
      window.URL.createObjectURL(blob);
  
    const link =
      document.createElement("a");
  
    link.href = url;
  
    link.setAttribute(
      "download",
      "inventory_sample.csv"
    );
  
    document.body.appendChild(link);
  
    link.click();
  
    document.body.removeChild(link);
  };
  
  // =========================
  // SAMPLE CSV DOWNLOAD END
  // =========================


  const filterByDate = (
      dateString
    ) => {
    
      if (!dateString)
        return false;
    
      const itemDate =
        new Date(dateString);
    
      const today =
        new Date();
    
      // TODAY
      if (
        globalFilter ===
        "today"
      ) {
    
        return (
          itemDate
            .toISOString()
            .split("T")[0] ===
          today
            .toISOString()
            .split("T")[0]
        );
      }
    
      // THIS MONTH
      if (
        globalFilter ===
        "thisMonth"
      ) {
    
        return (
          itemDate.getMonth() ===
            today.getMonth() &&
          itemDate.getFullYear() ===
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
        itemDate.getMonth() ===
          lastMonth.getMonth() &&
        itemDate.getFullYear() ===
          lastMonth.getFullYear()
      );
    };
  
    const filteredOrders =
      useMemo(() => {
    
        return orders.filter(
          (o) =>
            filterByDate(
    
              o.status_updated_at ||
    
              o.created_date
            )
        );
    
      }, [
        orders,
        globalFilter
      ]);
    
    const filteredQuotations =
      useMemo(() => {
    
        return quotations.filter(
          (q) =>
            filterByDate(
              q.created_at
            )
        );
    
      }, [
        quotations,
        globalFilter
      ]);


    const saveDashboardPDF =
      async () => {
    
        // FILTER TITLE
        const filterTitle =
          globalFilter ===
          "today"
    
            ? "Today"
    
            : globalFilter ===
              "thisMonth"
    
            ? "This Month"
    
            : "Last Month";
    
        // TOTALS
        const confirmedOrders =
          filteredOrders.filter(
            (o) =>
              o.status ===
              "confirmed"
          );
    
        const shippedOrders =
          filteredOrders.filter(
            (o) =>
              o.status ===
              "shipped"
          );
    
        // ALL PENDING ORDERS
        const allPendingOrders =
          orders.filter(
            (o) =>
              o.status ===
              "pending"
          );
    
        const preparingOrders =
          filteredOrders.filter(
            (o) =>
              o.status ===
              "preparing"
          );
    
        // SALES TEAM HTML
        // TODAY DATE
        const todayDate = new Date().toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        );
        
        // SALES TEAM HTML
        const salesTeamHTML =
          salesPersons
        
            .map((person) => {
        
              // CURRENT FILTER SALES
              const personOrders =
                filteredQuotations.filter(
                  (q) =>
                    q.sales_person ===
                      person.name &&
                    q.status ===
                      "confirmed"
                );

              const person63Value = personOrders.reduce((acc, q) => {
                  return acc + Number(q.total_63_value || 0);
                }, 0);
        
              const personSales =
                personOrders.reduce(
                  (acc, q) =>
                    acc +
                    Number(
                      q.amount || 0
                    ),
                  0
                );
        
              // TOTAL MONTH SALES
              const monthSales =
                quotations
                  .filter((q) => {
        
                    const qDate =
                      new Date(
                        q.created_at
                      );
        
                    const today =
                      new Date();
        
                    return (
                      q.sales_person ===
                        person.name &&
                      q.status ===
                        "confirmed" &&
                      qDate.getMonth() ===
                        today.getMonth() &&
                      qDate.getFullYear() ===
                        today.getFullYear()
                    );
                  })
        
                  .reduce(
                    (acc, q) =>
                      acc +
                      Number(
                        q.amount || 0
                      ),
                    0
                  );
        
              if (
                personSales <= 0 &&
                monthSales <= 0
              )
                return "";
        
              return `
              
                <tr>
                
                  <td style="padding:12px;border:1px solid #ddd;font-weight:700;">
                    ${person.name}
                  </td>
        
                  <td style="padding:12px;border:1px solid #ddd;text-align:center;">
                    ${
                      personOrders.length
                    }
                  </td>
        
                  <td style="padding:12px;border:1px solid #ddd;font-weight:700;color:green;">
                    ₹${personSales.toLocaleString()}
                  </td>
                  
                  <td style="padding:12px;border:1px solid #ddd;font-weight:700;color:#2563eb;">
                    ₹${monthSales.toLocaleString()}
                  </td>
        
        
                </tr>
              `;
            })
        
            .join("");
    
        // PDF HTML  
        const pdfContent = `
                
        <div
          style="
            padding:14px;
            font-family:Arial;
            background:#f3f4f6;
          "
        >
        
          <!-- HEADER -->
          <div
            style="
              background:linear-gradient(135deg,#000,#111827);
              border-radius:16px;
              padding:16px 18px;
              color:white;
            "
          >
        
            <table
              style="
                width:100%;
                border-collapse:collapse;
              "
            >
        
              <tr>
        
                <td>
        
                  <p
                    style="
                      color:#22c55e;
                      font-size:10px;
                      letter-spacing:2px;
                      font-weight:bold;
                      margin:0;
                    "
                  >
                    ASTRIKE SPORTSWEAR
                  </p>
        
                  <h1
                    style="
                      font-size:30px;
                      margin:6px 0 2px;
                    "
                  >
                    Admin Dashboard Report
                  </h1>
        
                  <p
                    style="
                      font-size:12px;
                      color:#d1d5db;
                      margin:0;
                    "
                  >
                    ${filterTitle} Analytics Report
                  </p>
        
                </td>
        
                <td
                  style="
                    text-align:right;
                    vertical-align:top;
                  "
                >
        
                  <p
                    style="
                      font-size:11px;
                      color:#9ca3af;
                      margin:0;
                    "
                  >
                    Generated On
                  </p>
        
                  <h3
                    style="
                      margin-top:6px;
                      color:white;
                      font-size:14px;
                    "
                  >
                    ${todayDate}
                  </h3>
        
                </td>
        
              </tr>
        
            </table>
        
          </div>
        
          <!-- SUMMARY -->
          <table
            style="
              width:100%;
              margin-top:12px;
              border-spacing:10px;
            "
          >
        
            <tr>
        
              <!-- CARD -->
              <td
                style="
                  width:25%;
                  background:white;
                  border:1px solid #dcfce7;
                  border-radius:14px;
                  padding:12px;
                "
              >
        
                <p
                  style="
                    font-size:10px;
                    color:#16a34a;
                    font-weight:bold;
                    margin:0;
                  "
                >
                  CONFIRMED
                </p>
        
                <h1
                  style="
                    font-size:24px;
                    margin:6px 0 2px;
                    color:#111827;
                  "
                >
                  ${confirmedOrders.length}
                </h1>
        
                <p
                  style="
                    margin:0;
                    font-size:13px;
                    color:#16a34a;
                    font-weight:bold;
                  "
                >
                  ₹${confirmedOrders
                    .reduce(
                      (acc, o) =>
                        acc +
                        Number(
                          o.total_amount || 0
                        ),
                      0
                    )
                    .toLocaleString()}
                </p>
        
              </td>
        
              <!-- CARD -->
              <td
                style="
                  width:25%;
                  background:white;
                  border:1px solid #dbeafe;
                  border-radius:14px;
                  padding:12px;
                "
              >
        
                <p
                  style="
                    font-size:10px;
                    color:#2563eb;
                    font-weight:bold;
                    margin:0;
                  "
                >
                  SHIPPED
                </p>
        
                <h1
                  style="
                    font-size:24px;
                    margin:6px 0 2px;
                    color:#111827;
                  "
                >
                  ${shippedOrders.length}
                </h1>
        
                <p
                  style="
                    margin:0;
                    font-size:13px;
                    color:#2563eb;
                    font-weight:bold;
                  "
                >
                  ₹${shippedOrders
                    .reduce(
                      (acc, o) =>
                        acc +
                        Number(
                          o.total_amount || 0
                        ),
                      0
                    )
                    .toLocaleString()}
                </p>
        
              </td>
        
              <!-- CARD -->
              <td
                style="
                  width:25%;
                  background:white;
                  border:1px solid #fde68a;
                  border-radius:14px;
                  padding:12px;
                "
              >
        
                <p
                  style="
                    font-size:10px;
                    color:#d97706;
                    font-weight:bold;
                    margin:0;
                  "
                >
                  PENDING
                </p>
        
                <h1
                  style="
                    font-size:24px;
                    margin:6px 0 2px;
                    color:#111827;
                  "
                >
                  ${allPendingOrders.length}
                </h1>
        
                <p
                  style="
                    margin:0;
                    font-size:13px;
                    color:#d97706;
                    font-weight:bold;
                  "
                >
                  ₹${allPendingOrders
                    .reduce(
                      (acc, o) =>
                        acc +
                        Number(
                          o.total_amount || 0
                        ),
                      0
                    )
                    .toLocaleString()}
                </p>
        
              </td>
        
              <!-- CARD -->
              <td
                style="
                  width:25%;
                  background:white;
                  border:1px solid #fed7aa;
                  border-radius:14px;
                  padding:12px;
                "
              >
        
                <p
                  style="
                    font-size:10px;
                    color:#ea580c;
                    font-weight:bold;
                    margin:0;
                  "
                >
                  PREPARING
                </p>
        
                <h1
                  style="
                    font-size:24px;
                    margin:6px 0 2px;
                    color:#111827;
                  "
                >
                  ${preparingOrders.length}
                </h1>
        
                <p
                  style="
                    margin:0;
                    font-size:13px;
                    color:#ea580c;
                    font-weight:bold;
                  "
                >
                  ₹${preparingOrders
                    .reduce(
                      (acc, o) =>
                        acc +
                        Number(
                          o.total_amount || 0
                        ),
                      0
                    )
                    .toLocaleString()}
                </p>
        
              </td>
        
            </tr>
        
          </table>
        
          <!-- SALES SUMMARY -->
          <div
            style="
              margin-top:10px;
              background:linear-gradient(135deg,#000,#111827);
              border-radius:16px;
              padding:16px 18px;
              color:white;
            "
          >
        
            <table
              style="
                width:100%;
              "
            >
        
              <tr>
        
                <td>
        
                  <p
                    style="
                      font-size:10px;
                      color:#9ca3af;
                      margin:0;
                      letter-spacing:2px;
                    "
                  >
                    TOTAL SALES SUMMARY
                  </p>
        
                  <h1
                    style="
                      margin:6px 0 0;
                      font-size:34px;
                      color:#22c55e;
                    "
                  >
                    ₹${getTotalSales().toLocaleString()}
                  </h1>
        
                </td>
        
                <td
                  style="
                    text-align:right;
                    vertical-align:bottom;
                  "
                >
        
                  <p
                    style="
                      margin:0;
                      font-size:12px;
                      color:#d1d5db;
                    "
                  >
                    ${
                      globalFilter === "today"
                        ? "Today's Confirmed Sales"
                        : globalFilter === "thisMonth"
                        ? "This Month Confirmed Sales"
                        : "Last Month Confirmed Sales"
                    }
                  </p>
        
                </td>
        
              </tr>
        
            </table>
        
          </div>
        
          <!-- SALES TEAM -->
          <div
            style="
              background:white;
              border-radius:16px;
              padding:14px;
              margin-top:12px;
            "
          >
        
            <h2
              style="
                margin:0 0 10px;
                font-size:22px;
                color:#111827;
              "
            >
              Sales Team Report
            </h2>
        
            <table
              style="
                width:100%;
                border-collapse:collapse;
                font-size:11px;
              "
            >
        
              <thead>
        
                <tr
                  style="
                    background:#000;
                    color:white;
                  "
                >
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                      border-top-left-radius:10px;
                    "
                  >
                    Sales Person
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:center;
                    "
                  >
                    Orders
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                    "
                  >
                    Today Sales
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                      border-top-right-radius:10px;
                    "
                  >
                    Monthly Sales
                  </th>
        
                </tr>
        
              </thead>
        
              <tbody>
        
                ${salesTeamHTML}
        
              </tbody>
        
            </table>
        
          </div>
        
          <!-- PAGE BREAK -->
          <div
            style="
              page-break-before:always;
              break-before:page;
              height:1px;
            "
          ></div>
        
          <!-- PENDING -->
          <div
            style="
              background:white;
              border-radius:16px;
              padding:14px;
            "
          >
        
            <h2
              style="
                margin:0 0 10px;
                font-size:22px;
                color:#111827;
              "
            >
              Pending Orders Report
            </h2>
        
            <table
              style="
                width:100%;
                border-collapse:collapse;
                font-size:11px;
              "
            >
        
              <thead>
        
                <tr
                  style="
                    background:#f59e0b;
                    color:white;
                  "
                >
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                    "
                  >
                    Customer
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                    "
                  >
                    Phone
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                    "
                  >
                    Amount
                  </th>
        
                  <th
                    style="
                      padding:10px;
                      text-align:left;
                    "
                  >
                    Date
                  </th>
        
                </tr>
        
              </thead>
        
              <tbody>
        
                ${allPendingOrders
        
                  .map(
                    (order) => `
                  
                    <tr>
        
                      <td
                        style="
                          padding:8px 10px;
                          border:1px solid #f3f4f6;
                          font-weight:600;
                        "
                      >
                        ${
                          order.customer_name ||
                          "N/A"
                        }
                      </td>
        
                      <td
                        style="
                          padding:8px 10px;
                          border:1px solid #f3f4f6;
                        "
                      >
                        ${
                          order.phone ||
                          "N/A"
                        }
                      </td>
        
                      <td
                        style="
                          padding:8px 10px;
                          border:1px solid #f3f4f6;
                          color:#dc2626;
                          font-weight:bold;
                        "
                      >
                        ₹${Number(
                          order.total_amount || 0
                        ).toLocaleString()}
                      </td>
        
                      <td
                        style="
                          padding:8px 10px;
                          border:1px solid #f3f4f6;
                        "
                      >
                        ${new Date(
                          order.created_date
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
        
                    </tr>
        
                    <tr>
        
                      <td
                        colspan="4"
                        style="
                          padding:7px 10px;
                          background:#fffbeb;
                          border:1px solid #f3f4f6;
                          color:#92400e;
                          font-size:10px;
                        "
                      >
        
                        <span
                          style="
                            font-weight:bold;
                          "
                        >
                          Remark :
                        </span>
        
                        ${
                          order.remark ||
                          "No Remark Added"
                        }
        
                      </td>
        
                    </tr>
                  
                  `
                  )
        
                  .join("")}
        
              </tbody>
        
            </table>
        
          </div>
        
        </div>
        `;

    
        // TEMP DIV
        const element =
          document.createElement(
            "div"
          );
    
        element.innerHTML =
          pdfContent;
    
        html2pdf()
    
          .set({
    
            margin: 0.3,
    
            filename: `${filterTitle.toLowerCase()}-dashboard-report.pdf`,
    
            image: {
              type: "jpeg",
              quality: 1,
            },
    
            html2canvas: {
              scale: 2,
            },
    
            jsPDF: {
              unit: "in",
              format: "a4",
              orientation:
                "portrait",
            },
          })
    
          .from(element)
    
          .save();
      };
  
  // =========================
  // CSV UPLOAD START
  // =========================
  
  const handleCSVUpload = async (e) => {
  
    const file = e.target.files[0];
  
    if (!file) return;
  
    setUploadingCsv(true);
  
    try {
  
      const text = await file.text();
  
      const rows = text.split("\n");
  
      const headers = rows[0]
        .split(",")
        .map((h) => h.trim());
  
      for (let i = 1; i < rows.length; i++) {
  
        if (!rows[i].trim())
          continue;
  
        const cols = rows[i]
          .split(",")
          .map((c) => c.trim());
  
        const productName = cols[0];
  
        const variants = {};
  
        for (let j = 1; j < headers.length; j++) {
  
          const size = headers[j];
  
          const qty = Number(
            cols[j] || 0
          );
  
          variants[size] = {
            qty,
          };
        }
  
        // CHECK EXISTING PRODUCT
        const {
          data: existingProduct
        } = await supabase
          .from("products")
          .select("*")
          .eq(
            "product_name",
            productName
          )
          .maybeSingle();
  
        // UPDATE IF EXISTS
        if (existingProduct) {
  
          await supabase
            .from("products")
            .update({
              variants,
            })
            .eq(
              "id",
              existingProduct.id
            );
  
        } else {
  
          // INSERT NEW
          await supabase
            .from("products")
            .insert([
              {
                product_name:
                  productName,
  
                variants,
              },
            ]);
        }
      }
  
      setDialogConfig({
        title: "Success",
        message:
          "Inventory Uploaded Successfully",
        confirmText: "OK",
        onConfirm: () =>
          setDialogOpen(false),
      });
  
      setDialogOpen(true);
  
      fetchProducts();
  
    } catch (err) {
  
      console.log(err);
  
      setDialogConfig({
        title: "CSV Error",
        message:
          "CSV parsing failed",
        confirmText: "OK",
        onConfirm: () =>
          setDialogOpen(false),
      });
  
      setDialogOpen(true);
  
    } finally {
  
      setUploadingCsv(false);
  
    }
  };
  
  // =========================
  // CSV UPLOAD END
  // =========================
  
  return (

    <div className="min-h-screen bg-[#f4f6f8] p-4 md:p-8">

      {/* LOADER */}
      {loading && (
        <LoaderOverlay text="Processing..." />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-r from-black to-gray-900 rounded-[32px] p-8 md:p-10 text-white shadow-2xl mb-8 overflow-hidden relative">

        {/* BG */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" />

        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

          {/* LEFT */}
          <div>

            <p className="text-green-400 font-bold tracking-[4px] uppercase text-xs">
              ASTRIKE SPORTSWEAR
            </p>

            <h1 className="text-4xl md:text-6xl font-black mt-4 leading-tight">
              Admin Dashboard
            </h1>

            <p className="text-gray-300 mt-4 text-lg">
              Manage sales team & targets
            </p>

            {/* NAV BUTTONS */}
            <div className="flex flex-wrap gap-3 mt-8">

              <button
                onClick={() =>
                  setActivePage("dashboard")
                }
                className={`h-12 px-6 rounded-2xl font-bold transition-all duration-200 ${
                  activePage === "dashboard"
                    ? "bg-green-500 text-black shadow-2xl"
                    : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                }`}
              >
                📊 Dashboard
              </button>

              <button
                onClick={() =>
                  setActivePage("sales")
                }
                className={`h-12 px-6 rounded-2xl font-bold transition-all duration-200 ${
                  activePage === "sales"
                    ? "bg-green-500 text-black shadow-2xl"
                    : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                }`}
              >
                👥 Sales Persons
              </button>

              <button
                onClick={() =>
                  setActivePage("inventory")
                }
                className={`h-12 px-6 rounded-2xl font-bold transition-all duration-200 ${
                  activePage === "inventory"
                    ? "bg-green-500 text-black shadow-2xl"
                    : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                }`}
              >
                📦 Inventory
              </button>

              <button
                onClick={() =>
                  setActivePage("items")
                }
                className={`h-12 px-6 rounded-2xl font-bold transition-all duration-200 ${
                  activePage === "items"
                    ? "bg-green-500 text-black shadow-2xl"
                    : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                }`}
              >
                ➕ Add Items
              </button>

              <button
                onClick={() =>
                  setActivePage("order-status")
                }
                className={`h-12 px-6 rounded-2xl font-bold transition-all duration-200 ${
                  activePage === "order-status"
                    ? "bg-green-500 text-black shadow-2xl"
                    : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                }`}
              >
                🚚 Order Status
              </button>

            </div>

            {/* GLOBAL FILTERS */}
              <div className="flex flex-wrap gap-3 mt-4">
              
                {[
                  {
                    label: "Today",
                    value: "today"
                  },
                  {
                    label: "This Month",
                    value: "thisMonth"
                  },
                  {
                    label: "Last Month",
                    value: "lastMonth"
                  }
                ].map((item) => (
              
                  <button
                    key={item.value}
                    onClick={() =>
                      setGlobalFilter(
                        item.value
                      )
                    }
                    className={`h-11 px-5 rounded-2xl font-bold transition-all duration-200 ${
                      globalFilter ===
                      item.value
                        ? "bg-green-500 text-black shadow-2xl"
                        : "bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20"
                    }`}
                  >
              
                    {item.label}
              
                  </button>
                ))}

                <button
                  onClick={saveDashboardPDF}
                  className="h-11 px-5 rounded-2xl bg-white text-black font-black shadow-2xl hover:scale-[1.03] transition-all duration-200"
                >
                  📄 Save PDF
                </button>
              
              </div>

          </div>

          {/* RIGHT STATS */}
          <div className="grid grid-cols-1 gap-4 min-w-[320px]">
          
            {/* TOTAL TARGET */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
          
              <div className="flex items-center justify-between">
          
                <div>
          
                  <p className="text-gray-400 text-xs font-bold tracking-[2px]">
                    TOTAL TARGET
                  </p>
          
                  <h2 className="text-4xl font-black mt-2 text-white">
          
                    ₹{
          
                      salesPersons
          
                        .reduce(
                          (acc, person) =>
          
                            acc +
                            Number(
                              person.target_amount || 0
                            ),
          
                          0
                        )
          
                        .toLocaleString()
          
                    }
          
                  </h2>
          
                </div>
          
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-2xl">
                  🎯
                </div>
          
              </div>
          
            </div>
          
            {/* REMAINING */}
            <div className="bg-gradient-to-r from-red-400 to-red-500 rounded-3xl p-5 shadow-2xl">
            
              <div className="flex items-center justify-between">
            
                <div>
            
                  <p className="text-black/70 text-xs font-black tracking-[2px]">
                    REMAINING TARGET
                  </p>
            
                  <h2 className="text-4xl font-black mt-2 text-black">
            
                    ₹{
            
                      (
                        salesPersons.reduce(
                          (acc, person) =>
            
                            acc +
                            Number(
                              person.target_amount || 0
                            ),
            
                          0
                        ) -
            
                        getTotalSales()
            
                      ).toLocaleString()
            
                    }
            
                  </h2>
            
                </div>
            
                <div className="w-14 h-14 rounded-2xl bg-black/10 flex items-center justify-center text-2xl">
                  🔥
                </div>
            
              </div>
            
            </div>
          
          </div>

        </div>

      </div>

      {/* DASHBOARD PAGE */}
      {activePage === "dashboard" && (
      
        <div className="space-y-8">
      
          {/* TOP STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      
            {/* TOTAL SALES */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
      
              <p className="text-gray-500 font-semibold">
                Total Sales
              </p>
      
              <h2 className="text-4xl font-black mt-3">
                ₹{
                  getTotalSales()
                    .toLocaleString()
                }
              </h2>
      
            </div>
      
            {/* PROFIT */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
      
              <p className="text-gray-500 font-semibold">
                Profit
              </p>
      
              <h2 className="text-4xl font-black mt-3 text-green-600">
                ₹{
                  getProfit()
                    .toFixed(0)
                    .toLocaleString()
                }
              </h2>
      
            </div>
      
            {/* ORDERS */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
      
              <p className="text-gray-500 font-semibold">
                Confirmed Orders
              </p>
      
              <h2 className="text-4xl font-black mt-3">
      
                {
                  quotations.filter(
                    (q) =>
                      q.status ===
                        "confirmed" &&
                      filterByDate(   
                        q.created_at
                      )
                  ).length
                }
      
              </h2>
      
            </div>
      
            {/* TEAM */}
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
      
              <p className="text-gray-500 font-semibold">
                Active Team
              </p>
      
              <h2 className="text-4xl font-black mt-3">
                {
                  salesPersons.length
                }
              </h2>
      
            </div>
      
          </div>
      
          {/* ORDER ANALYTICS */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          
            {/* HEADER */}
            <div className="px-8 py-6 border-b border-gray-100">
          
              <h2 className="text-3xl font-black">
                Order Analytics
              </h2>
          
              <p className="text-gray-500 mt-2">
                Live order status summary
              </p>
          
            </div>
          
            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          
              {/* TODAY CONFIRMED */}
              <div className="p-8 border-b xl:border-b-0 xl:border-r border-gray-100">
          
                <div className="flex items-start justify-between">
          
                  <div>
          
                    <p className="text-gray-500 text-sm font-semibold">
                      Today Confirmed
                    </p>
          
                    <h2 className="text-5xl font-black mt-3 text-green-500">
          
                      {
                        filteredOrders.filter(
                          (o) =>
                            o.status ===
                              "confirmed" &&
                            filterByDate(   
                              o.status_updated_at ||
                            o.created_date
                          )
                        ).length
                      }
          
                    </h2>
          
                    {/* AMOUNT */}
                    <div className="mt-6">
          
                      <p className="text-xs text-gray-400 font-semibold uppercase">
                        Amount
                      </p>
          
                      <h3 className="text-2xl font-black text-green-600 mt-1">
          
                        ₹{

                            filteredOrders.filter(
                                (o) =>
                                  o.status ===
                                    "confirmed" &&
                                  filterByDate(   
                                  o.status_updated_at ||
                                  o.created_date
                                )
                              )
                          
                              .reduce(
                                (acc, o) =>
                                  acc +
                                  Number(
                                    o.total_amount || 0
                                  ),
                                0
                              )
                          
                              .toLocaleString()
                          
                          }
          
                      </h3>
          
                    </div>
          
                  </div>
          
                  <div className="w-16 h-16 rounded-3xl bg-green-500 text-black flex items-center justify-center text-3xl">
                    ✅
                  </div>
          
                </div>
          
              </div>
          
              {/* TOTAL SHIPPED */}
              <div className="p-8 border-b xl:border-b-0 xl:border-r border-gray-100">
          
                <div className="flex items-start justify-between">
          
                  <div>
          
                    <p className="text-gray-500 text-sm font-semibold">
                      Total Shipped
                    </p>
          
                    <h2 className="text-5xl font-black mt-3 text-blue-600">
          
                      {
                        filteredOrders.filter(
                          (o) =>
                            o.status ===
                            "shipped" &&
                            
                            filterByDate(   o.status_updated_at ||
                            o.created_date
                          )
                        ).length
                      }
          
                    </h2>
          
                    {/* AMOUNT */}
                    <div className="mt-6">
          
                      <p className="text-xs text-gray-400 font-semibold uppercase">
                        Amount
                      </p>
          
                      <h3 className="text-2xl font-black text-blue-600 mt-1">
          
                        ₹{

                            filteredOrders.filter(
                                (o) =>
                                  o.status ===
                                  "shipped" &&
                                  
                                  filterByDate(   o.status_updated_at ||
                                  o.created_date
                                )
                              )
                          
                              .reduce(
                                (acc, o) =>
                                  acc +
                                  Number(
                                    o.total_amount || 0
                                  ),
                                0
                              )
                          
                              .toLocaleString()
                          
                          }
          
                      </h3>
          
                    </div>
          
                  </div>
          
                  <div className="w-16 h-16 rounded-3xl bg-blue-500 text-white flex items-center justify-center text-3xl">
                    🚚
                  </div>
          
                </div>
          
              </div>
          
              {/* TOTAL PENDING */}
              <div className="p-8 border-b md:border-b-0 xl:border-r border-gray-100">
          
                <div className="flex items-start justify-between">
          
                  <div>
          
                    <p className="text-gray-500 text-sm font-semibold">
                      Total Pending
                    </p>
          
                    <h2 className="text-5xl font-black mt-3 text-yellow-500">
          
                      {
                          filteredOrders.filter(
                            (o) =>
                              o.status ===
                                "pending" &&
                              filterByDate(   o.status_updated_at ||
                                o.created_date
                              )
                          ).length
                        }
          
                    </h2>
          
                    {/* AMOUNT */}
                    <div className="mt-6">
          
                      <p className="text-xs text-gray-400 font-semibold uppercase">
                        Amount
                      </p>
          
                      <h3 className="text-2xl font-black text-yellow-500 mt-1">
          
                        ₹{
          
                          filteredOrders.filter(
                            (o) =>
                              o.status ===
                                "pending" &&
                              filterByDate(   o.status_updated_at ||
                                o.created_date
                              )
                          )
          
                            .reduce(
                              (acc, o) =>
                                acc +
                                Number(
                                  o.total_amount || 0
                                ),
                              0
                            )
          
                            .toLocaleString()
          
                        }
          
                      </h3>
          
                    </div>
          
                  </div>
          
                  <div className="w-16 h-16 rounded-3xl bg-yellow-400 text-black flex items-center justify-center text-3xl">
                    ⏳
                  </div>
          
                </div>
          
              </div>
          
              {/* TOTAL PREPARING */}
              <div className="p-8">
          
                <div className="flex items-start justify-between">
          
                  <div>
          
                    <p className="text-gray-500 text-sm font-semibold">
                      Total Preparing
                    </p>
          
                    <h2 className="text-5xl font-black mt-3 text-orange-500">
          
                      {
                        filteredOrders.filter(
                          (o) =>
                            o.status ===
                            "preparing" &&

                            filterByDate(   o.status_updated_at ||
                            o.created_date
                          )
                        ).length
                      }
          
                    </h2>
          
                    {/* AMOUNT */}
                    <div className="mt-6">
          
                      <p className="text-xs text-gray-400 font-semibold uppercase">
                        Amount
                      </p>
          
                      <h3 className="text-2xl font-black text-orange-500 mt-1">
          
                        ₹{
          
                          filteredOrders.filter(
                              (o) =>
                                o.status ===
                                "preparing" &&

                                filterByDate(   o.status_updated_at ||
                                o.created_date
                              )
                            )
          
                            .reduce(
                              (acc, o) =>
                                acc +
                                Number(
                                  o.total_amount || 0
                                ),
                              0
                            )
          
                            .toLocaleString()
          
                        }
          
                      </h3>
          
                    </div>
          
                  </div>
          
                  <div className="w-16 h-16 rounded-3xl bg-orange-500 text-white flex items-center justify-center text-3xl">
                    📋
                  </div>
          
                </div>
          
              </div>
          
            </div>
          
          </div>

          {/* SALES TEAM */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mt-8">
            
              {/* HEADER */}
              <div className="px-8 py-6 border-b border-gray-100">
            
                <h2 className="text-3xl font-black">
            
                  {globalFilter === "today" &&
                    "Today Sales Team"}
            
                  {globalFilter ===
                    "thisMonth" &&
                    "This Month Sales Team"}
            
                  {globalFilter ===
                    "lastMonth" &&
                    "Last Month Sales Team"}
            
                </h2>
            
                <p className="text-gray-500 mt-2">
            
                  {globalFilter === "today" &&
                    "Today confirmed sales by sales person"}
            
                  {globalFilter ===
                    "thisMonth" &&
                    "This month confirmed sales by sales person"}
            
                  {globalFilter ===
                    "lastMonth" &&
                    "Last month confirmed sales by sales person"}
            
                </p>
            
              </div>
            
              <div className="p-6">
            
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
                  {salesPersons
            
                    // ONLY SALES > 0
                    .filter((person) => {
            
                      const personSales =
                        filteredQuotations
            
                          .filter(
                            (q) =>
            
                              q.sales_person ===
                                person.name &&
            
                              q.status ===
                                "confirmed"
                          )
            
                          .reduce(
                            (acc, q) =>
                              acc +
                              Number(
                                q.amount || 0
                              ),
                            0
                          );
            
                      return personSales > 0;
                    })
            
                    .map((person) => {
            
                      // PERSON ORDERS
                      const personOrders =
                        filteredQuotations.filter(
                          (q) =>
            
                            q.sales_person ===
                              person.name &&
            
                            q.status ===
                              "confirmed"
                        );
            
                      // PERSON SALES
                      const personSales =
                        personOrders.reduce(
                          (acc, q) =>
                            acc +
                            Number(
                              q.amount || 0
                            ),
                          0
                        );

                      const person63Value = personOrders.reduce(
                          (acc, q) => acc + Number(q.total_63_value || 0),
                          0
                        );
                                    
                      return (
            
                        <div
                          key={person.id}
                          className="border border-gray-100 rounded-[30px] p-6 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
                        >
            
                          {/* TOP */}
                          <div className="flex items-center justify-between">
            
                            <div className="flex items-center gap-4">
            
                              <div className="w-16 h-16 rounded-3xl bg-black text-white flex items-center justify-center text-2xl font-black shadow-lg">
            
                                {person.name?.charAt(0)}
            
                              </div>
            
                              <div>
            
                                <h3 className="text-2xl font-black leading-tight">
            
                                  {person.name}
            
                                </h3>
            
                                <p className="text-sm text-gray-500 mt-1">
            
                                  Sales Executive
            
                                </p>
            
                              </div>
            
                            </div>
            
                            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-sm font-black">
            
                              ACTIVE
            
                            </div>
            
                          </div>
            
                          {/* SALES */}
                          <div className="mt-8">
            
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-[2px]">
            
                              {globalFilter ===
                                "today" &&
                                "Today Sales"}
            
                              {globalFilter ===
                                "thisMonth" &&
                                "This Month Sales"}
            
                              {globalFilter ===
                                "lastMonth" &&
                                "Last Month Sales"}
            
                            </p>
            
                            <h2 className="text-5xl font-black text-green-600 mt-3">
            
                              ₹{personSales.toLocaleString()}

                              {/* 63% Value */}
                              <p className="mt-3 text-lg font-bold text-blue-600">
                                63% Value : ₹{person63Value.toLocaleString()}
                              </p>

                              <p className="mt-3 text-lg font-bold text-blue-600">
                                Value : ₹{(personSales - person63Value).toLocaleString()}
                              </p>
            
                            </h2>
            
                          </div>
            
                          {/* BOTTOM */}
                          <div className="mt-8 flex items-center justify-between">
            
                            {/* ORDERS */}
                            <div>
            
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-[2px]">
            
                                Confirmed Orders
            
                              </p>
            
                              <h3 className="text-3xl font-black mt-2">
            
                                {personOrders.length}
            
                              </h3>
            
                            </div>
            
                            {/* ICON */}
                            <div className="w-16 h-16 rounded-3xl bg-green-500 text-black flex items-center justify-center text-3xl shadow-xl">
            
                              💰
            
                            </div>
            
                          </div>
            
                        </div>
                      );
                    })}
            
                </div>
            
              </div>
            
            </div>
          
        </div>

        )}

      {/* SALES PAGE */}
      {activePage === "sales" && (

        <>

          {/* ADD FORM */}
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100 mb-8">

            <div className="mb-7">

              <h2 className="text-3xl font-black">
                Add Sales Person
              </h2>

              <p className="text-gray-500 mt-2">
                Create new sales executive
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* NAME */}
              <input
                type="text"
                placeholder="Sales Person Name"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                className="h-14 rounded-2xl border border-gray-200 px-5 outline-none focus:border-black text-lg font-semibold"
              />

              {/* TARGET */}
              <input
                type="number"
                placeholder="Monthly Target"
                value={target}
                onChange={(e) =>
                  setTarget(
                    e.target.value
                  )
                }
                className="h-14 rounded-2xl border border-gray-200 px-5 outline-none focus:border-black text-lg font-semibold"
              />

              {/* BUTTON */}
              <button
                onClick={
                  addSalesPerson
                }
                className="h-14 rounded-2xl bg-black text-white font-bold text-lg hover:scale-[1.02] transition-all duration-200 shadow-xl"
              >
                + Add Sales Person
              </button>

            </div>

          </div>

          {/* SALES PERSONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {salesPersons.map(
              (person) => {

                const sales =
                  getPersonSales(
                    person.name
                  );

                const progress =
                  getProgress(
                    sales,
                    person.target_amount
                  );

                const profit =
                  sales * 0.095;

                return (

                  <div
                    key={person.id}
                    className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300"
                  >

                    {/* TOP */}
                    <div className="flex items-center justify-between">

                      <div>

                        <h2 className="text-3xl font-black leading-tight">
                          {person.name}
                        </h2>

                        <p className="text-gray-500 mt-2 font-medium">
                          Sales Executive
                        </p>

                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-black shadow-xl">
                        {
                          person.name?.charAt(
                            0
                          )
                        }
                      </div>

                    </div>

                    {/* SALES */}
                    <div className="mt-8">

                      <p className="text-gray-500 font-semibold text-sm">
                        CURRENT SALES
                      </p>

                      <h3 className="text-4xl font-black mt-2">
                        ₹{
                          sales.toLocaleString()
                        }
                      </h3>

                      <p className="text-sm text-green-600 font-bold mt-2">
                        Profit ₹{
                          profit
                            .toFixed(0)
                            .toLocaleString()
                        }
                      </p>

                    </div>

                    {/* TARGET */}
                    <div className="mt-8">

                      <div className="flex items-center justify-between mb-4">

                        <div>

                          <p className="text-gray-500 font-semibold text-sm">
                            MONTHLY TARGET
                          </p>

                          <h3 className="text-4xl font-black mt-2">
                            ₹{
                              Number(
                                person.target_amount || 0
                              ).toLocaleString()
                            }
                          </h3>

                        </div>

                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-sm font-black">
                          ACTIVE
                        </div>

                      </div>

                      {/* EDIT */}
                      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-4">

                        <label className="text-xs font-black text-gray-400 tracking-[2px] uppercase">
                          Update Target
                        </label>

                        <input
                          type="number"
                          defaultValue={
                            person.target_amount
                          }
                          id={
                            "target-" +
                            person.id
                          }
                          className="w-full bg-transparent mt-3 text-3xl font-black outline-none"
                          placeholder="Enter Target"
                        />

                      </div>

                    </div>

                    {/* PROGRESS */}
                    <div className="mt-7">

                      <div className="flex items-center justify-between mb-2">

                        <span className="text-sm text-gray-500 font-semibold">
                          Progress
                        </span>

                        <span className="font-black">
                          {progress}%
                        </span>

                      </div>

                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">

                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${progress}%`
                          }}
                        />

                      </div>

                    </div>

                    {/* BUTTONS */}
                    <div className="mt-8 grid grid-cols-2 gap-4">

                      {/* SAVE */}
                      <button
                        onClick={() => {

                          const value =
                            document.getElementById(
                              "target-" +
                              person.id
                            ).value;

                          updateTarget(
                            person.id,
                            value
                          );
                        }}
                        className="h-14 rounded-2xl bg-black text-white font-black text-lg hover:scale-[1.02] transition-all duration-200 shadow-xl"
                      >
                        Save
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() =>
                          deleteSalesPerson(
                            person.id
                          )
                        }
                        className="h-14 rounded-2xl bg-red-500 text-white font-black text-lg hover:bg-red-600 transition-all duration-200 shadow-lg"
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </>

      )}

      {/* INVENTORY PAGE */}
      {activePage === "inventory" && (
      
        <div className="space-y-6">
      
          {/* TOP */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          
              {/* LEFT */}
              <div>
          
                <h2 className="text-4xl font-black">
                  Inventory
                </h2>
          
                <p className="text-gray-500 mt-3 text-lg">
                  Current live inventory stock
                </p>
          
                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap gap-4 mt-6">
          
                  {/* DOWNLOAD */}
                  <button
                    onClick={
                      downloadSampleCSV
                    }
                    className="h-14 px-6 rounded-2xl bg-black text-white font-black hover:scale-[1.02] transition-all duration-200"
                  >
                    ⬇ Download Sample CSV
                  </button>
          
                  {/* UPLOAD */}
                  <label className="h-14 px-6 rounded-2xl bg-green-500 text-black font-black flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-all duration-200">
          
                    {uploadingCsv
                      ? "Uploading..."
                      : "⬆ Bulk Upload CSV"}
          
                    <input
                      type="file"
                      accept=".csv"
                      onChange={
                        handleCSVUpload
                      }
                      hidden
                    />
          
                  </label>
          
                </div>
          
              </div>
          
              {/* RIGHT */}
              <div className="bg-black text-white rounded-3xl px-6 py-5 min-w-[220px]">
          
                <p className="text-xs tracking-[3px] uppercase text-gray-400 font-bold">
                  Total Products
                </p>
          
                <h2 className="text-5xl font-black mt-2">
                  {products.length}
                </h2>
          
              </div>
          
            </div>
          
          </div>
      
          {/* TABLE */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
      
            <div className="overflow-x-auto">
      
              <table className="w-full">
      
                {/* HEAD */}
                <thead className="bg-black text-white">
      
                  <tr>
      
                    <th className="text-left px-6 py-5 text-sm font-black">
                      Product
                    </th>
      
                    <th className="text-left px-6 py-5 text-sm font-black">
                      Total Stock
                    </th>
      
                    <th className="text-left px-6 py-5 text-sm font-black">
                      Sizes Inventory
                    </th>
      
                    <th className="text-left px-6 py-5 text-sm font-black">
                      Status
                    </th>
      
                  </tr>
      
                </thead>
      
                {/* BODY */}
                <tbody>
      
                  {products.map((product) => {
      
                    // SAFE VARIANTS
                    let variants = {};
      
                    try {
      
                      if (
                        typeof product.variants === "string"
                      ) {
      
                        variants = JSON.parse(
                          product.variants || "{}"
                        );
      
                      } else if (
                        typeof product.variants === "object" &&
                        product.variants !== null
                      ) {
      
                        variants = product.variants;
      
                      }
      
                    } catch (err) {
      
                      variants = {};
      
                    }
      
                    // TOTAL STOCK
                    let totalStock = 0;
      
                    Object.values(variants).forEach(
                      (v) => {
      
                        totalStock += Number(
                          v?.qty || 0
                        );
      
                      }
                    );
      
                    return (
      
                      <tr
                        key={product.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                      >
      
                        {/* PRODUCT */}
                        <td className="px-6 py-5 min-w-[250px]">
      
                          <div>
      
                            <h2 className="text-lg font-black break-words">
                              {product.product_name ||
                                "No Name"}
                            </h2>
      
                            <p className="text-gray-500 text-sm mt-1">
                              Product ID :
                              {" "}
                              {product.id}
                            </p>
      
                          </div>
      
                        </td>
      
                        {/* TOTAL */}
                        <td className="px-6 py-5">
      
                          <div className="text-3xl font-black">
                            {totalStock}
                          </div>
      
                        </td>
      
                        {/* SIZES */}
                        <td className="px-6 py-5 min-w-[400px]">
      
                          {Object.keys(variants).length === 0 ? (
      
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-2xl text-sm font-bold inline-block">
                              No Inventory
                            </div>
      
                          ) : (
      
                            <div className="flex flex-wrap gap-2">
      
                              {Object.entries(
                                variants
                              ).map(
                                ([size, data]) => {
      
                                  const qty =
                                    Number(
                                      data?.qty || 0
                                    );
      
                                  return (
      
                                    <div
                                      key={size}
                                      className={`px-4 py-2 rounded-2xl text-sm font-black border ${
                                        qty <= 5
                                          ? "bg-red-50 border-red-200 text-red-600"
                                          : qty <= 20
                                          ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                                          : "bg-gray-50 border-gray-200 text-black"
                                      }`}
                                    >
      
                                      {size} :
                                      {" "}
                                      {qty}
      
                                    </div>
                                  );
                                }
                              )}
      
                            </div>
      
                          )}
      
                        </td>
      
                        {/* STATUS */}
                        <td className="px-6 py-5">
      
                          <div
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black ${
                              totalStock <= 5
                                ? "bg-red-100 text-red-600"
                                : totalStock <= 20
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
      
                            {totalStock <= 5
                              ? "Low"
                              : totalStock <= 20
                              ? "Medium"
                              : "Good"}
      
                          </div>
      
                        </td>
      
                      </tr>
                    );
                  })}
      
                </tbody>
      
              </table>
      
            </div>
      
          </div>
      
        </div>
      
      )}

      {/* ITEMS PAGE */}
      {activePage === "items" && (

        <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">

          <h2 className="text-4xl font-black">
            Add Items
          </h2>

          <p className="text-gray-500 mt-3 text-lg">
            Item management coming soon...
          </p>

        </div>

      )}

      {/* ORDER STATUS PAGE */}
      {activePage === "order-status" && (
        <OrderStatusPage
          quotations={quotations}
          orders={orders}
        />
      )}

    </div>
  );
}
