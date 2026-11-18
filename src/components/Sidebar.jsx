import { useEffect, useState } from "react";
import ItemForm from "./ItemForm";


  export default function Sidebar({
  onAddItem,
  /* EDIT FLOW */
  editIndex,
  editItem,
  onUpdateItem,
  onCancelEdit,
  /* 🔥 SINGLE SOURCE OF TRUTH */
  pdfData,
  setPdfData,

  handlePaymentImage,
  paymentImages,
  removePaymentImage,
  }) {

  const [previewMap,
    setPreviewMap] =
    useState({});

  const {
  party = "",
  phone = "",
  address = "",
  salesPerson = "",
  remark = "",
  rateDiscount = 0,
  spDiscount = 0,
  } = pdfData;

  useEffect(() => {

    if (!paymentImages?.length) {
  
      setPreviewMap({});
      return;
  
    }
  
    const previews = {};
  
    paymentImages.forEach(
      (img, idx) => {
  
        // OLD SAVED IMAGE URL
        if (typeof img === "string") {
  
          previews[idx] = img;
  
        }
  
        // NEW FILE IMAGE
        else if (img instanceof File) {
  
          previews[idx] =
            URL.createObjectURL(img);
  
        }
  
      }
    );
  
    setPreviewMap(previews);
  
    // CLEANUP
    return () => {
  
      Object.values(previews).forEach(url => {
  
        if (
          typeof url === "string" &&
          url.startsWith("blob:")
        ) {
  
          URL.revokeObjectURL(url);
  
        }
  
      });
  
    };
  
  }, [paymentImages]);
  
  useEffect(() => {

    const selectedSalesPerson =
      localStorage.getItem(
        "selectedSalesPerson"
      );
  
    const selectedQuotationId =
      localStorage.getItem(
        "selectedQuotationId"
      );
  
    // CURRENT URL
    const currentPath =
      window.location.pathname;
  
    // BLOCK ONLY NEW QUOTATION PAGE
    if (
  
      currentPath === "/quotation" &&
  
      !selectedSalesPerson &&
  
      !selectedQuotationId
  
    ) {
  
      window.location.href =
        "/dashboard";
  
      return;
  
    }
  
    // AUTO SET SALES PERSON
    if (
      selectedSalesPerson &&
      !pdfData.salesPerson
    ) {
  
      setPdfData(prev => ({
        ...prev,
        salesPerson:
          selectedSalesPerson
      }));
  
    }
  
  }, []);
  
  return (
  <div className="w-[360px] bg-blue-50/50 p-4 space-y-4 overflow-y-auto">

  {/* CUSTOMER CARD */}
  <div className="bg-white rounded-xl shadow-sm p-4">
  <h3 className="text-sm font-semibold text-blue-700 mb-3">
  Customer Details
  </h3>

  {/* PARTY */}
  <input
  className="w-full mb-2 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="Party Name"
  value={party}
  onChange={(e) =>
  setPdfData(prev => ({
  ...prev,
  party: e.target.value
  }))
  }
  />

  {/* PHONE */}
  <input
  className="w-full mb-2 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="Phone"
  value={phone}
  onChange={(e) =>
  setPdfData(prev => ({
  ...prev,
  phone: e.target.value
  }))
  }
  />

  {/* ADDRESS */}
  <input
  className="w-full mb-2 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="Address"
  value={address}
  onChange={(e) =>
  setPdfData(prev => ({
  ...prev,
  address: e.target.value
  }))
  }
  />

  {/* SALES PERSON */}
  <input
  className="w-full mb-2 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="Sales Person"
  value={salesPerson}
  onChange={(e) =>
  setPdfData(prev => ({
  ...prev,
  salesPerson: e.target.value
  }))
  }
  />

  {/* REMARK */}
  <div className="mt-1">
  <label className="text-sm font-semibold text-blue-700 mb-3">
  Remark / Note
  </label>

  <textarea
  rows={2}
  className="w-full mt-1 px-3 py-2 border rounded text-sm"
  placeholder="Any special instruction, payment note, delivery remark..."
  value={remark}
  onChange={(e) =>
  setPdfData(prev => ({
  ...prev,
  remark: e.target.value
  }))
  }
  />
  </div>
  </div>

  {/* DISCOUNT CARD */}
  <div className="bg-white rounded-xl shadow-sm p-4">
  <h3 className="text-sm font-semibold text-blue-700 mb-3">
  Discounts
  </h3>

  <div className="flex gap-4 text-sm mb-3">
  <label className="flex items-center gap-1">
  <input
  type="radio"
  checked={rateDiscount === 55}
  onChange={() =>
  setPdfData(prev => ({
  ...prev,
  rateDiscount: 55
  }))
  }
  />
  55%
  </label>

  <label className="flex items-center gap-1">
  <input
  type="radio"
  checked={rateDiscount === 57}
  onChange={() =>
  setPdfData(prev => ({
  ...prev,
  rateDiscount: 57
  }))
  }
  />
  57%
  </label>
  </div>

  <h3 className="text-sm font-semibold text-blue-700 mb-3">
  SP Discounts
  </h3>

  <input
  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
  placeholder="SP Discount (%)"
  type="number"
  min={0}
  max={14}
  value={spDiscount}
  onChange={(e) => {
  let val = Number(e.target.value);
  if (val > 14) val = 14;
  if (val < 0) val = 0;

  setPdfData(prev => ({
  ...prev,
  spDiscount: val
  }));
  }}
  />

  <p className="text-xs text-gray-500 mt-1">
  * SP Discount maximum{" "}
  <span className="font-semibold text-blue-600">10%</span> allowed
  </p>
  </div>

  {/* PAYMENT CARD */}
  <div className="bg-white rounded-xl shadow-sm p-4">
  <h3 className="text-sm font-semibold text-blue-700 mb-3">
  Payment Proof ( 2 Images Allow)
  </h3>

  {paymentImages.length < 2 && (
  <input
  type="file"
  accept="image/*"
  onChange={handlePaymentImage}
  className="text-sm mb-2"
  />
  )}

  <div className="grid grid-cols-2 gap-2">
  {paymentImages.map((_, idx) => (
  <div key={idx} className="border rounded p-1">
  {previewMap[idx] ? (
  <img
  src={previewMap[idx]}
  className="h-28 w-full object-contain mb-1"
  alt="Payment Proof"
  />
  ) : (
  <div className="h-28 flex items-center justify-center text-xs text-gray-400">
  Image not available
  </div>
  )}

  <button
  onClick={() => removePaymentImage(idx)}
  className="w-full text-xs py-1 rounded bg-red-500 text-white"
  >
  Remove
  </button>
  </div>
  ))}
  </div>

  <p className="text-xs text-gray-500 mt-2">
  * Only 2 images allowed. Both will appear in PDF.
  </p>
  </div>


  {/* PACKING OPTIONS */}
  <div className="bg-white rounded-xl shadow-sm p-4">
    <h3 className="text-sm font-semibold text-blue-700 mb-3">
      Packing Options
    </h3>
  
    {/* Gym Bag */}
    <div className="mb-3">
      <label className="flex items-center gap-2 mb-1 cursor-pointer">
        <input
          type="checkbox"
          checked={!!pdfData.gymBagSelected}
          onChange={(e) =>
            setPdfData(prev => ({
              ...prev,
              gymBagSelected: e.target.checked
            }))
          }
          className="h-4 w-4"
        />
        <span className="text-2xl">🎒</span>
        <span className="font-medium">Gym Bag</span>
      </label>

      {pdfData.gymBagSelected && (
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Gym Bag Remark"
          value={pdfData.gymBagRemark || ""}
          onChange={(e) =>
            setPdfData(prev => ({
              ...prev,
              gymBagRemark: e.target.value
            }))
          }
        />
      )}
    </div>
  
    {/* Carry Bag */}
    <div>
      <label className="flex items-center gap-2 mb-1 cursor-pointer">
        <input
          type="checkbox"
          checked={!!pdfData.carryBagSelected}
          onChange={(e) =>
            setPdfData(prev => ({
              ...prev,
              carryBagSelected: e.target.checked
            }))
          }
          className="h-4 w-4"
        />
        <span className="text-2xl">👜</span>
        <span className="font-medium">Carry Bag</span>
      </label>

      {pdfData.carryBagSelected && (
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Carry Bag Remark"
          value={pdfData.carryBagRemark || ""}
          onChange={(e) =>
            setPdfData(prev => ({
              ...prev,
              carryBagRemark: e.target.value
            }))
          }
        />
      )}
    </div>
  </div>


  {/* ITEM CARD */}
  <ItemForm
  onAddItem={onAddItem}
  editIndex={editIndex}
  editItem={editItem}
  onUpdateItem={onUpdateItem}
  onCancelEdit={onCancelEdit}
  />
  </div>
  );
  }
