
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { supabase } from "../supabase";
import { parseSizes } from "../utils/sizeHelper";

pdfMake.vfs = pdfFonts.vfs;

function safeFileName(str = "") {
  return str.trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
}

async function imageUrlToBase64(url) {
  const path = url.split("/payment-images/")[1];
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("payment-images")
    .download(path);

  if (error || !data) {
    console.error("Image download failed:", error);
    return null;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(data);
  });
}

const GRID = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => "#d5dfeb",
  vLineColor: () => "#d5dfeb",
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2
};

const HEADER_STYLE = {
  bold: true,
  fontSize: 7,
  color: "#ffffff",
  fillColor: "#10213a"
};

export async function generateQuotationPDF(
  data = {},
  action = "download"
) {
  const {
    party,
    phone,
    address,
    salesPerson,
    remark,
    quotationNo,
    rateDiscount = 0,
    spDiscount = 0,
    items = [],
    shipping = 0,
    advance = 0,
    billDiscount = 0,
    gymBagSelected = false,
    gymBagRemark = "",
    carryBagSelected = false,
    carryBagRemark = "",
    paymentImages = [],
    createdAt,
    updatedAt
  } = data;

  // Payment proof images
  const finalPaymentImages = [];

  for (const img of paymentImages) {
    if (typeof img === "string" && img.startsWith("data:image")) {
      finalPaymentImages.push(img);
    } else if (img?.url) {
      const base64 = await imageUrlToBase64(img.url);
      if (base64) finalPaymentImages.push(base64);
    }
  }

  const createdDate = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : "-";

  const updatedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString()
    : createdDate;

  const ALL_SIZES = [
    "26", "28", "30", "32", "34", "36",
    "S", "M", "L", "XL", "2XL", "3XL", "4XL"
  ];

  // ------------------------------------
  // ITEMS TABLE
  // ------------------------------------

  let totalAmount = 0;

  const itemBody = [[
    { text: "SKU / DESCRIPTION", ...HEADER_STYLE },
    { text: "SIZE ENTRIES", ...HEADER_STYLE },
    { text: "PCS", ...HEADER_STYLE, alignment: "center" },
    { text: "MRP (₹)", ...HEADER_STYLE, alignment: "right" },
    { text: "RATE (₹)", ...HEADER_STYLE, alignment: "right" },
    { text: "AMOUNT (₹)", ...HEADER_STYLE, alignment: "right" },
    { text: "PCS / BOX", ...HEADER_STYLE, alignment: "center" }
  ]];

  items.forEach((it) => {
    totalAmount += Number(it.amount || 0);

    const sizeMap = parseSizes(it.size) || {};

    const enteredSizes = ALL_SIZES
      .filter(size => Number(sizeMap[size] || 0) > 0)
      .map(size => `${size} × ${Number(sizeMap[size])}`)
      .join(", ") ||
      (typeof it.size === "string" && it.size.trim()
        ? it.size
        : "-");

    itemBody.push([
      { text: it.desc || "-", fontSize: 7 },
      { text: enteredSizes, fontSize: 10 },
      {
        text: String(it.pcs ?? "-"),
        fontSize: 7,
        alignment: "center"
      },
      {
        text: String(it.MRP ?? it.mrp ?? "-"),
        fontSize: 7,
        alignment: "right"
      },
      {
        text: `₹${it.rate ?? "-"}`,
        fontSize: 7,
        alignment: "right"
      },
      {
        text: `₹${it.amount ?? "-"}`,
        fontSize: 7,
        alignment: "right"
      },
      {
        text: String(it.pcsPerBox ?? "-"),
        fontSize: 7,
        alignment: "center"
      }
    ]);
  });

  const itemWidths = ["*", 150, 32, 50, 50, 65, 50];

  // Existing net calculation retained
  const net =
    totalAmount +
    Number(shipping || 0) -
    Number(billDiscount || 0) -
    Number(advance || 0);

  // ------------------------------------
  // CANCEL ITEM TABLE
  // Header + 5 blank rows
  // ------------------------------------


  const cancelItemBody = [
    [
      { text: "SKU", ...HEADER_STYLE },
      { text: "SIZE", ...HEADER_STYLE },
      { text: "REMARK", ...HEADER_STYLE }
    ],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
    ["", "", ""]
  ];
  
  const cancelItemTable = {
    table: {
      headerRows: 1,
      widths: ["*", 48, "*"],
      body: cancelItemBody,
      heights: () => 18,
      dontBreakRows: true
    },
    layout: {
      ...GRID,
      paddingTop: () => 3,
      paddingBottom: () => 3
    },
    fontSize: 7
  };


  // ------------------------------------
  // BILL SUMMARY
  // 8 rows total, including extra amount row
  // ------------------------------------

    
   
  const summaryBody = [
    [
      { text: "Gross / Bill Amount", fontSize: 7.5 },
      { text: `₹${totalAmount}`, fontSize: 7.5, alignment: "right" }
    ],
    [
      { text: "Rate Discount", fontSize: 7.5 },
      { text: `(${rateDiscount}%)`, fontSize: 7.5, alignment: "right" }
    ],
    [
      { text: "SP Discount", fontSize: 7.5 },
      { text: `(${spDiscount}%)`, fontSize: 7.5, alignment: "right" }
    ],
    [
      { text: "Bill Discount", fontSize: 7.5 },
      { text: `₹${Number(billDiscount || 0)}`, fontSize: 7.5, alignment: "right" }
    ],
    [
      { text: "Shipping", fontSize: 7.5 },
      { text: `₹${Number(shipping || 0)}`, fontSize: 7.5, alignment: "right" }
    ],
    [
      { text: "Advance Paid", fontSize: 7.5 },
      { text: `₹${Number(advance || 0)}`, fontSize: 7.5, alignment: "right" }
    ],
    [
      {
        text: `NET PAYABLE AMOUNT\n₹${net}`,
        colSpan: 2,
        alignment: "center",
        bold: true,
        fontSize: 14,
        color: "#10213a",
        fillColor: "#e8f5ee",
        margin: [0, 4, 0, 4]
      },
      {}
    ]
  ];
  
  const summaryTable = {
    table: {
      widths: ["*", 62],
      body: summaryBody,
      heights: (rowIndex) => rowIndex === 6 ? 36 : 18,
      dontBreakRows: true
    },
    layout: {
      ...GRID,
      paddingTop: () => 3,
      paddingBottom: () => 3
    }
  };


  // ------------------------------------
  // SIDE-BY-SIDE TABLES
  // ------------------------------------

  const cancelAndSummaryBlock = {
    unbreakable: true,
    columns: [
      {
        width: "58%",
        stack: [
          {
            text: "CANCEL ITEM FROM BILL",
            bold: true,
            fontSize: 9,
            color: "#10213a",
            margin: [0, 0, 0, 5]
          },
          cancelItemTable
        ]
      },
      {
        width: "42%",
        stack: [
          {
            text: "BILL SUMMARY",
            bold: true,
            fontSize: 9,
            color: "#10213a",
            margin: [0, 0, 0, 5]
          },
          summaryTable
        ]
      }
    ],
    columnGap: 12,
    margin: [0, 2, 0, 10]
  };

  // ------------------------------------
  // PACKING OPTIONS
  // ------------------------------------

  const packingRows = [];

  if (gymBagSelected) {
    packingRows.push([
      { text: "GYM BAG", bold: true, color: "#10213a" },
      { text: gymBagRemark || "-" }
    ]);
  }

  if (carryBagSelected) {
    packingRows.push([
      { text: "CARRY BAG", bold: true, color: "#10213a" },
      { text: carryBagRemark || "-" }
    ]);
  }

  const packingOptionsBlock = packingRows.length
    ? {
        table: {
          widths: [110, "*"],
          body: [
            [
              {
                text: "PACKING OPTIONS",
                colSpan: 2,
                bold: true,
                fontSize: 8,
                fillColor: "#10213a",
                color: "#ffffff"
              },
              {}
            ],
            ...packingRows
          ]
        },
        layout: GRID,
        fontSize: 8,
        margin: [0, 4, 0, 0]
      }
    : null;

  // ------------------------------------
  // DOCUMENT CONTENT
  // ------------------------------------

  const content = [
    {
      text: "ASTRIKE SPORTSWEAR PVT LTD",
      fontSize: 18,
      bold: true,
      color: "#10213a",
      margin: [0, 0, 0, 2]
    },
    {
      text:
        "Ground Floor B-124 Shop No. 2, Pratap Garden, Uttam Nagar, New Delhi\n" +
        "Phone: 7838000995 | GSTIN: 07ABCCA4620J1ZV",
      fontSize: 7,
      color: "#64748b",
      margin: [0, 0, 0, 8]
    },
    {
      canvas: [{
        type: "line",
        x1: 0,
        y1: 0,
        x2: 539,
        y2: 0,
        lineWidth: 1.5,
        lineColor: "#f05a28"
      }],
      margin: [0, 0, 0, 8]
    },
    {
      text: `QUOTATION ${quotationNo ? `- ${quotationNo}` : ""}`,
      fontSize: 12,
      bold: true,
      color: "#10213a",
      margin: [0, 0, 0, 8]
    },

    // Customer details
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            {
              text: [
                { text: "Party Name\n", bold: true },
                { text: party || "-" }
              ],
              fillColor: "#f4f7fb"
            },
            {
              text: [
                { text: "Phone\n", bold: true },
                { text: phone || "-" }
              ],
              fillColor: "#f4f7fb"
            }
          ],
          [
            {
              text: [
                { text: "Address\n", bold: true },
                { text: address || "-" }
              ],
              fillColor: "#f4f7fb",
              colSpan: 2
            },
            {}
          ],
          [
            {
              text: [
                { text: "Sales Person\n", bold: true },
                { text: salesPerson || "-" }
              ],
              fillColor: "#f4f7fb"
            },
            {
              text: [
                { text: "Date / Updated\n", bold: true },
                { text: `${createdDate} / ${updatedDate}` }
              ],
              fillColor: "#f4f7fb"
            }
          ],
          [
            {
              text: [
                { text: "Rate Discount\n", bold: true },
                { text: `${rateDiscount}%` }
              ],
              fillColor: "#f4f7fb"
            },
            {
              text: [
                { text: "SP Discount\n", bold: true },
                { text: `${spDiscount}%` }
              ],
              fillColor: "#f4f7fb"
            }
          ],
          [
            {
              text: [
                { text: "Remarks\n", bold: true },
                { text: remark || "-" }
              ],
              fillColor: "#f4f7fb",
              colSpan: 2
            },
            {}
          ]
        ]
      },
      layout: GRID,
      fontSize: 8,
      margin: [0, 0, 0, 10]
    },

    {
      text: "ITEM DETAILS",
      bold: true,
      fontSize: 9,
      color: "#10213a",
      margin: [0, 0, 0, 5]
    },

    // Full-width items table
    {
      table: {
        headerRows: 1,
        widths: itemWidths,
        body: itemBody,
        dontBreakRows: true,
        keepWithHeaderRows: 1
      },
      layout: {
        ...GRID,
        paddingTop: () => 4,
        paddingBottom: () => 4
      },
      margin: [0, 0, 0, 8]
    },

    cancelAndSummaryBlock,

    ...(packingOptionsBlock ? [packingOptionsBlock] : []),

    {
      text: "REMARKS / PAYMENT NOTES",
      bold: true,
      fontSize: 8,
      color: "#10213a",
      margin: [0, 8, 0, 3]
    },
    {
      text: remark || "-",
      fontSize: 8,
      color: "#334155"
    },
    {
      text: "Please verify sizes, quantities, rates and totals before confirming.",
      fontSize: 7,
      color: "#64748b",
      margin: [0, 10, 0, 0]
    }
  ];

  const docDefinition = {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [28, 24, 28, 24],
    content
  };

  // Append the packing slip to this same PDF. Keep this check against the
  // normalized `items` argument so it works for both new and server-loaded quotes.
  if (Array.isArray(items) && items.length > 0) {
    docDefinition.content.push(...buildPackingSlipContent({
      ...data,
      items,
      party: data.party || party,
      quotationNo: data.quotationNo || data.quotation_no || quotationNo
    }));
  }

  // Payment proof page
  if (finalPaymentImages.length > 0) {
    docDefinition.content.push({
      text: "Payment Proof",
      bold: true,
      fontSize: 12,
      pageBreak: "before",
      margin: [0, 0, 0, 10]
    });

    docDefinition.content.push({
      columnGap: 20,
      columns: finalPaymentImages.map(img => ({
        image: img,
        width: 240
      }))
    });
  }

  const baseName = safeFileName(data.party || "QUOTATION");
  const isUpdated = data.updatedAt || data.updated_at;

  const fileName = isUpdated
    ? `${baseName}_UPDATED.pdf`
    : `${baseName}.pdf`;

  const pdf = pdfMake.createPdf(docDefinition);

  if (action === "open") {
    pdf.open();
  } else {
    pdf.download(fileName);
  }
}

// ------------------------------------------------------------
// A5 PACKING SLIP — generated from the same server-loaded quote
// ------------------------------------------------------------
function getPackingSizeEntries(sizeValue) {
  if (!sizeValue) return [];

  if (typeof sizeValue === "object" && !Array.isArray(sizeValue)) {
    return Object.entries(sizeValue)
      .map(([size, qty]) => ({ size: String(size).trim(), qty: Number(qty) || 0 }))
      .filter(entry => entry.size && entry.qty > 0);
  }

  if (Array.isArray(sizeValue)) {
    return sizeValue.map(entry => ({
      size: String(entry?.size ?? entry?.name ?? "").trim(),
      qty: Number(entry?.qty ?? entry?.quantity ?? 0) || 0
    })).filter(entry => entry.size && entry.qty > 0);
  }

  const raw = String(sizeValue).trim();
  if (!raw || raw === "-") return [];

  // Quotation records normally store sizes as "M-2,L-2". Also accept
  // imported formats such as "M × 2 | L × 2" and JSON-encoded size maps.
  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      return getPackingSizeEntries(JSON.parse(raw));
    } catch {
      // Fall through to the delimited text parser.
    }
  }

  return raw.split(/[,|]/).map(part => {
    const token = part.trim();
    const match = token.match(/^(.+?)\s*(?:-|×|x|:)\s*(\d+(?:\.\d+)?)$/i);
    return match ? { size: match[1].trim(), qty: Number(match[2]) || 0 } : null;
  }).filter(entry => entry && entry.size && entry.qty > 0);
}

function buildPackingSlipContent(data = {}) {
  const items = Array.isArray(data.items) ? data.items : [];
  const navy = "#10213A";
  const border = "#CBD5E1";
  let totalPcs = 0;
  let totalBoxes = 0;

  const headerCell = (text, alignment = "center") => ({
    text, bold: true, color: "#FFFFFF", fillColor: navy,
    fontSize: 8, alignment, margin: [3, 6, 3, 6],
    noWrap: text === "S.NO." || text === "PCS/BOX"
  });

  const bodyRows = items.map((item, index) => {
    const pcs = Number(item.pcs ?? item.totalPcs ?? item.total_pcs ?? 0) || 0;
    const pcsPerBox = Number(item.pcsPerBox ?? item.pcs_per_box ?? item.pcsPerCarton ?? item.pcs_per_carton ?? 0) || 0;
    const boxes = pcsPerBox > 0 ? Math.ceil(pcs / pcsPerBox) : 0;
    totalPcs += pcs;
    totalBoxes += boxes;

    const sizeEntries = getPackingSizeEntries(item.size ?? item.sizeBreakup ?? item.size_breakup ?? item.size_break_up);
    const sizeText = sizeEntries.length
      ? sizeEntries.map(({ size, qty }) => `${size} × ${qty}`).join(" | ")
      : (typeof item.size === "string" && item.size.trim() ? item.size.trim() : "-");
    const rowFill = index % 2 === 0 ? "#F1F5F9" : "#FFFFFF";
    const cell = (text, alignment = "center", bold = false) => ({
      text: String(text), fontSize: 8, color: "#172033", alignment,
      bold, fillColor: rowFill, margin: [4, 6, 4, 6]
    });

    return [
      cell(index + 1),
      cell(item.sku ?? item.code ?? item.desc ?? item.description ?? "-", "left", true),
      cell(sizeText, "left"),
      cell(item.MRP ?? item.mrp ?? item.mrpPrice ?? item.mrp_price ?? "-"),
      cell(pcs),
      cell(pcsPerBox || "-"),
      cell(boxes || (pcs > 0 ? "—" : "0"))
    ];
  });

  const tableBody = [[
    headerCell("S.NO."),
    headerCell("SKU", "left"),
    headerCell("SIZE BREAKUP (SIZE × QTY)", "left"),
    headerCell("MRP (₹)"),
    headerCell("PCS"),
    headerCell("PCS/BOX"),
    headerCell("BOXES")
  ], ...bodyRows];

  tableBody.push([
    { text: "", colSpan: 4, fillColor: "#E2E8F0", margin: [4, 6, 4, 6] }, {}, {}, {},
    { text: String(totalPcs), bold: true, alignment: "center", fontSize: 9, fillColor: "#E2E8F0", margin: [4, 6, 4, 6] },
    { text: "TOTAL", bold: true, alignment: "center", fontSize: 8, fillColor: "#E2E8F0", margin: [4, 6, 4, 6] },
    { text: String(totalBoxes), bold: true, alignment: "center", fontSize: 9, fillColor: "#E2E8F0", margin: [4, 6, 4, 6] }
  ]);

  return [
    {
      table: { widths: [34, 66, "*", 48, 42, 52, 48], body: [[{
        stack: [
          { text: "ASTRIKE SPORTSWEAR PVT LTD", fontSize: 16, bold: true, color: "#FFFFFF", alignment: "center" },
          { text: "PACKING DETAILS", fontSize: 11, bold: true, color: "#DCE8F7", alignment: "center", margin: [0, 4, 0, 0] }
        ], fillColor: navy, margin: [8, 12, 8, 12], border: [false, false, false, false]
      }]] }, layout: "noBorders", margin: [0, 0, 0, 12], pageBreak: "before"
    },
    {
      columns: [
        { width: "50%", text: [{ text: "Quotation No.: ", bold: true }, data.quotationNo || data.quotation_no || data.id || "-"], fontSize: 9 },
        { width: "50%", text: [{ text: "Party Name: ", bold: true }, data.party || "-"], fontSize: 9, alignment: "right" }
      ], margin: [0, 0, 0, 12]
    },
    {
      table: { headerRows: 1, widths: [34, 66, "*", 48, 42, 52, 48], body: tableBody, dontBreakRows: true, keepWithHeaderRows: 1 },
      layout: {
        hLineWidth: () => 0.65, vLineWidth: () => 0.65,
        hLineColor: () => border, vLineColor: () => border,
        paddingLeft: () => 2, paddingRight: () => 2,
        paddingTop: () => 2, paddingBottom: () => 2
      },
      margin: [0, 0, 0, 0]
    },
    {
      columns: [
        { text: `TOTAL PCS: ${totalPcs}`, bold: true, fontSize: 11, color: navy },
        { text: `TOTAL BOXES: ${totalBoxes}`, bold: true, fontSize: 11, color: navy, alignment: "right" }
      ], margin: [0, 14, 0, 0]
    }
  ];
}
