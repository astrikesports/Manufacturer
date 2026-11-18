// src/components/StockCheckModal.jsx

import React, { useState } from "react";

function parseSizeString(sizeStr = "") {

  const result = {};

  sizeStr.split(",").forEach((item) => {

    const [size, qty] =
      item.trim().split("-");

    if (size && qty) {

      result[size.trim()] =
        Number(qty.trim());

    }
  });

  return result;
}

export default function StockCheckModal({
  open,
  onClose,
  quotationItems = [],
  products = [],
  quotations = [],
  currentQuotationId = null,
}) {

  const [expandedRow, setExpandedRow] =
    useState(null);

  if (!open) return null;

  return (

    <div style={overlayStyle}>

      <div style={modalStyle}>

        {/* HEADER */}
        <div style={headerStyle}>

          <div>

            <h2 style={titleStyle}>
              📦 Inventory Check
            </h2>

            <p style={subTitleStyle}>
              Live stock + reserved stock
            </p>

          </div>

          <button
            onClick={onClose}
            style={closeBtn}
          >
            ✕
          </button>

        </div>

        {/* EMPTY */}
        {quotationItems.length === 0 && (

          <div style={emptyBox}>
            No quotation items found
          </div>

        )}

        {/* TABLE */}
        {quotationItems.length > 0 && (

          <div style={tableWrapper}>

            <table style={tableStyle}>

              <thead>

                <tr>

                  <th style={th}>
                    Product
                  </th>

                  <th style={th}>
                    Size
                  </th>

                  <th style={th}>
                    Stock
                  </th>

                  <th style={th}>
                    Reserved
                  </th>

                  <th style={th}>
                    Your Qty
                  </th>

                  <th style={th}>
                    Free
                  </th>

                  <th style={th}>
                    Status
                  </th>

                  <th style={th}>
                    Details
                  </th>

                </tr>

              </thead>

              <tbody>

                {quotationItems.flatMap(
                  (item, index) => {

                    const sizeMap =
                      parseSizeString(
                        item.size
                      );

                    const product =
                      products.find(
                        (p) =>
                          p.product_name ===
                          item.desc
                      );

                    let variants = {};

                    try {

                      if (
                        typeof product?.variants ===
                        "string"
                      ) {

                        variants =
                          JSON.parse(
                            product.variants ||
                              "{}"
                          );

                      } else {

                        variants =
                          product?.variants ||
                          {};

                      }

                    } catch {

                      variants = {};

                    }

                    return Object.entries(
                      sizeMap
                    ).map(
                      ([
                        size,
                        qty,
                      ]) => {

                        const rowKey =
                          `${index}-${size}`;

                        // CURRENT STOCK
                        const currentQty =
                          Number(
                            variants?.[
                              size
                            ]?.qty || 0
                          );

                        // RESERVED
                        let reservedQty = 0;

                        const reservedBy =
                          [];

                        quotations.forEach(
                          (q) => {

                            // SKIP CURRENT
                            if (
                              q.id ===
                              currentQuotationId
                            )
                              return;

                            // ONLY PENDING
                            if (
                              q.status !==
                              "pending"
                            )
                              return;

                            (
                              q.items || []
                            ).forEach(
                              (
                                qItem
                              ) => {

                                if (
                                  qItem.desc !==
                                  item.desc
                                )
                                  return;

                                const qSizes =
                                  parseSizeString(
                                    qItem.size
                                  );

                                const reserved =
                                  Number(
                                    qSizes[
                                      size
                                    ] || 0
                                  );

                                if (
                                  reserved >
                                  0
                                ) {

                                  reservedQty +=
                                    reserved;

                                  reservedBy.push(
                                    {
                                      salesPerson:
                                        q.sales_person,

                                      party:
                                        q.party,

                                      qty:
                                        reserved,
                                    }
                                  );
                                }
                              }
                            );
                          }
                        );

                        // FREE STOCK
                        const freeQty =
                          currentQty -
                          reservedQty;

                        // STATUS
                        const canProceed =
                          freeQty >= qty;

                        return (

                          <React.Fragment
                            key={rowKey}
                          >

                            {/* MAIN ROW */}
                            <tr>

                              {/* PRODUCT */}
                              <td style={td}>
                                {item.desc}
                              </td>

                              {/* SIZE */}
                              <td style={td}>
                                {size}
                              </td>

                              {/* STOCK */}
                              <td style={td}>
                                {
                                  currentQty
                                }
                              </td>

                              {/* RESERVED */}
                              <td style={td}>

                                <span
                                  style={{
                                    background:
                                      reservedQty ===
                                      0
                                        ? "#dcfce7"
                                        : reservedQty <=
                                          5
                                        ? "#fef9c3"
                                        : "#fee2e2",

                                    color:
                                      reservedQty ===
                                      0
                                        ? "#166534"
                                        : reservedQty <=
                                          5
                                        ? "#854d0e"
                                        : "#991b1b",

                                    padding:
                                      "8px 14px",

                                    borderRadius:
                                      "999px",

                                    fontWeight:
                                      "900",

                                    fontSize:
                                      "13px",
                                  }}
                                >

                                  {
                                    reservedQty
                                  }

                                </span>

                              </td>

                              {/* YOUR QTY */}
                              <td style={td}>
                                {qty}
                              </td>

                              {/* FREE */}
                              <td
                                style={{
                                  ...td,

                                  color:
                                    canProceed
                                      ? "#16a34a"
                                      : "#dc2626",

                                  fontWeight:
                                    "900",
                                }}
                              >
                                {
                                  freeQty
                                }
                              </td>

                              {/* STATUS */}
                              <td style={td}>

                                <span
                                  style={{
                                    background:
                                      canProceed
                                        ? "#dcfce7"
                                        : "#fee2e2",

                                    color:
                                      canProceed
                                        ? "#166534"
                                        : "#991b1b",

                                    padding:
                                      "8px 14px",

                                    borderRadius:
                                      "999px",

                                    fontSize:
                                      "12px",

                                    fontWeight:
                                      "900",
                                  }}
                                >

                                  {canProceed
                                    ? "AVAILABLE"
                                    : "LOW"}

                                </span>

                              </td>

                              {/* DETAILS */}
                              <td style={td}>

                                {reservedBy.length >
                                0 ? (

                                  <button
                                    onClick={() =>
                                      setExpandedRow(
                                        expandedRow ===
                                          rowKey
                                          ? null
                                          : rowKey
                                      )
                                    }
                                    style={{
                                      border:
                                        "none",

                                      background:
                                        expandedRow ===
                                        rowKey
                                          ? "#dc2626"
                                          : "#111827",

                                      color:
                                        "#fff",

                                      padding:
                                        "10px 16px",

                                      borderRadius:
                                        "12px",

                                      cursor:
                                        "pointer",

                                      fontWeight:
                                        "900",

                                      fontSize:
                                        "13px",

                                      minWidth:
                                        "80px",
                                    }}
                                  >

                                    {expandedRow ===
                                    rowKey
                                      ? "Close"
                                      : "View"}

                                  </button>

                                ) : (

                                  <span
                                    style={{
                                      color:
                                        "#9ca3af",

                                      fontWeight:
                                        "700",
                                    }}
                                  >
                                    —
                                  </span>

                                )}

                              </td>

                            </tr>

                            {/* EXPAND ROW */}
                            {expandedRow ===
                              rowKey && (

                              <tr>

                                <td
                                  colSpan="8"
                                  style={{
                                    padding:
                                      "0px 20px 20px",

                                    background:
                                      "#fff",

                                    borderBottom:
                                      "1px solid #e5e7eb",
                                  }}
                                >

                                  <div
                                    style={{
                                      background:
                                        "#f9fafb",

                                      border:
                                        "1px solid #e5e7eb",

                                      borderRadius:
                                        "20px",

                                      padding:
                                        "18px",
                                    }}
                                  >

                                    {/* TOP */}
                                    <div
                                      style={{
                                        display:
                                          "flex",

                                        alignItems:
                                          "center",

                                        justifyContent:
                                          "space-between",

                                        marginBottom:
                                          "18px",

                                        flexWrap:
                                          "wrap",

                                        gap: "12px",
                                      }}
                                    >

                                      <div>

                                        <div
                                          style={{
                                            fontSize:
                                              "18px",

                                            fontWeight:
                                              "900",

                                            color:
                                              "#111827",
                                          }}
                                        >
                                          Reserved
                                          Details
                                        </div>

                                        <div
                                          style={{
                                            marginTop:
                                              "4px",

                                            color:
                                              "#6b7280",

                                            fontSize:
                                              "14px",

                                            fontWeight:
                                              "500",
                                          }}
                                        >
                                          Current
                                          booked
                                          quotations
                                        </div>

                                      </div>

                                      <div
                                        style={{
                                          background:
                                            "#fee2e2",

                                          color:
                                            "#991b1b",

                                          padding:
                                            "10px 14px",

                                          borderRadius:
                                            "12px",

                                          fontWeight:
                                            "900",

                                          fontSize:
                                            "13px",
                                        }}
                                      >

                                        Reserved :
                                        {" "}
                                        {
                                          reservedQty
                                        }

                                      </div>

                                    </div>

                                    {/* LIST */}
                                    <div
                                      style={{
                                        display:
                                          "grid",

                                        gridTemplateColumns:
                                          "repeat(auto-fit,minmax(260px,1fr))",

                                        gap: "14px",
                                      }}
                                    >

                                      {reservedBy.map(
                                        (
                                          r,
                                          i
                                        ) => (

                                          <div
                                            key={
                                              i
                                            }
                                            style={{
                                              background:
                                                "#fff",

                                              border:
                                                "1px solid #e5e7eb",

                                              borderRadius:
                                                "18px",

                                              padding:
                                                "16px",
                                            }}
                                          >

                                            {/* USER */}
                                            <div
                                              style={{
                                                display:
                                                  "flex",

                                                alignItems:
                                                  "center",

                                                gap: "12px",
                                              }}
                                            >

                                              <div
                                                style={{
                                                  width:
                                                    "48px",

                                                  height:
                                                    "48px",

                                                  borderRadius:
                                                    "14px",

                                                  background:
                                                    "#f3f4f6",

                                                  display:
                                                    "flex",

                                                  alignItems:
                                                    "center",

                                                  justifyContent:
                                                    "center",

                                                  fontSize:
                                                    "20px",
                                                }}
                                              >
                                                👨‍💼
                                              </div>

                                              <div>

                                                <div
                                                  style={{
                                                    fontWeight:
                                                      "900",

                                                    fontSize:
                                                      "16px",

                                                    color:
                                                      "#111827",
                                                  }}
                                                >
                                                  {
                                                    r.salesPerson
                                                  }
                                                </div>

                                                <div
                                                  style={{
                                                    marginTop:
                                                      "4px",

                                                    color:
                                                      "#6b7280",

                                                    fontWeight:
                                                      "600",

                                                    fontSize:
                                                      "14px",
                                                  }}
                                                >
                                                  🏢{" "}
                                                  {
                                                    r.party
                                                  }
                                                </div>

                                              </div>

                                            </div>

                                            {/* QTY */}
                                            <div
                                              style={{
                                                marginTop:
                                                  "16px",
                                              }}
                                            >

                                              <div
                                                style={{
                                                  display:
                                                    "inline-flex",

                                                  alignItems:
                                                    "center",

                                                  gap: "8px",

                                                  background:
                                                    "#111827",

                                                  color:
                                                    "#fff",

                                                  padding:
                                                    "10px 14px",

                                                  borderRadius:
                                                    "12px",

                                                  fontWeight:
                                                    "900",

                                                  fontSize:
                                                    "13px",
                                                }}
                                              >

                                                📦{" "}
                                                {
                                                  r.qty
                                                }

                                              </div>

                                            </div>

                                          </div>
                                        )
                                      )}

                                    </div>

                                  </div>

                                </td>

                              </tr>

                            )}

                          </React.Fragment>
                        );
                      }
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

// =========================
// STYLES START
// =========================

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(0,0,0,0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999999,
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "1400px",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: "28px",
  padding: "25px",
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.25)",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const titleStyle = {
  margin: 0,
  fontSize: "34px",
  fontWeight: "900",
};

const subTitleStyle = {
  margin: "8px 0 0",
  color: "#6b7280",
  fontSize: "15px",
  fontWeight: "500",
};

const closeBtn = {
  width: "50px",
  height: "50px",
  borderRadius: "14px",
  border: "none",
  background: "#f3f4f6",
  cursor: "pointer",
  fontSize: "22px",
  fontWeight: "700",
};

const tableWrapper = {
  overflowX: "auto",
  marginTop: "25px",
};

const tableStyle = {
  width: "100%",
  borderCollapse:
    "collapse",
};

const th = {
  textAlign: "left",
  padding: "16px",
  borderBottom:
    "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: "14px",
  fontWeight: "900",
  color: "#111827",
};

const td = {
  padding: "18px 16px",
  borderBottom:
    "1px solid #f3f4f6",
  fontSize: "15px",
  fontWeight: "700",
  color: "#111827",
};

const emptyBox = {
  marginTop: "25px",
  background: "#fee2e2",
  color: "#991b1b",
  padding: "18px",
  borderRadius: "18px",
  fontWeight: "700",
  textAlign: "center",
};

// =========================
// STYLES END
// =========================
