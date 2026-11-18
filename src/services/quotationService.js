/* ================= MAPPERS ================= */

// frontend → DB
function mapToDB(data) {
  return {
    party: data.party,
    phone: data.phone,
    address: data.address,
    sales_person: data.salesPerson,
    remark: data.remark,

    rate_discount: data.rateDiscount,
    sp_discount: data.spDiscount,
    payment_images: data.paymentImages ?? [],
    bill_discount: data.billDiscount,
    shipping: data.shipping,
    advance: data.advance,
    amount: data.amount,
    net_amount: data.netAmount,

        // ✅ ADD THIS
    total_63_value: data.total63Value,

    items: data.items
  };
}

// DB → frontend
function mapFromDB(row) {
  if (!row) return null;

  return {
    id: row.id,
    quotationNo: row.quotation_no ?? "",
    party: row.party ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    salesPerson: row.sales_person ?? "",
    remark: row.remark ?? "",

    rateDiscount: Number(row.rate_discount ?? 0),
    spDiscount: Number(row.sp_discount ?? 0),
    billDiscount: Number(row.bill_discount ?? 0),
    shipping: Number(row.shipping ?? 0),
    advance: Number(row.advance ?? 0),
    amount: Number(row.amount ?? 0),
    netAmount: Number(row.net_amount ?? 0),

      // ✅ ADD THIS
    total63Value: Number(row.total_63_value ?? 0),
      
    quotationNo: row.quotation_no ?? "",

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.items) ? row.items : [],
    paymentImages: Array.isArray(row.payment_images)
      ? row.payment_images
      : []
  };
}

/* ================= CREATE ================= */
export async function createQuotation(pdfData) {
  const payload = mapToDB(pdfData);

  const res = await fetch("/api/quotations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Failed to create quotation");

  const data = await res.json();
  return mapFromDB(data?.[0]);
}

/* ================= UPDATE ================= */
export async function updateQuotation(id, pdfData) {
  if (!id || id === "null" || id === "undefined") return null;

  const payload = {
    ...mapToDB(pdfData),
    updated_at: new Date().toISOString()
  };

  const res = await fetch(`/api/quotations?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) return null;

  const data = await res.json();
  return mapFromDB(data?.[0]);
}

/* ================= LOAD ONE ================= */
export async function fetchQuotationById(id) {
  const res = await fetch(`/api/quotations?id=eq.${id}`);

  if (!res.ok) throw new Error("Failed to load quotation");

  const data = await res.json();
  return mapFromDB(data?.[0]);
}

/* ================= LOAD LIST ================= */
export async function fetchQuotations() {
  const res = await fetch("/api/quotations");

  if (!res.ok) throw new Error("Failed to load quotations");

  const data = await res.json();
  return Array.isArray(data) ? data.map(mapFromDB).filter(Boolean) : [];
}

/* ================= DELETE ================= */
export async function deleteQuotation(id) {
  // get images first
  const res = await fetch(`/api/quotations?id=eq.${id}`);
  const data = await res.json();
  const images = data?.[0]?.payment_images || [];

  await fetch(`/api/quotations?id=eq.${id}`, {
    method: "DELETE"
  });

  return images;
}
