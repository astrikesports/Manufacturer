import { useState } from "react";

export default function ItemsTable({ items, onDelete, onEdit, onUpdateItem  }) {
  const [editIndex, setEditIndex] = useState(null);
  const [editSize, setEditSize] = useState("");
  const [editRate, setEditRate] = useState("");

  function startEdit(i) {
    setEditIndex(i);
    setEditSize(items[i].size || "");
    setEditRate(items[i].rate);
  }

  function cancelEdit() {
    setEditIndex(null);
    setEditSize("");
    setEditRate("");
  }

  function getTotalBoxes(sizeStr) {
    if (!sizeStr) return 0;
    return sizeStr
      .split(",")
      .map(s => Number(s.split("-")[1]) || 0)
      .reduce((a, b) => a + b, 0);
  }

  function updateItem(i) {
    const item = items[i];

    if (!editSize || !editRate) {
      alert("Size & Rate required");
      return;
    }

    const boxes = getTotalBoxes(editSize);
    if (boxes <= 0) {
      alert("Invalid size format");
      return;
    }

    // ✅ ONLY SOURCE OF TRUTH
    const pcsPerBox = item.pcsPerBox || 1;

    const pcs = boxes * pcsPerBox;
    
    const finalRate =
    Number(editRate || 0);
    
    const rate =
    Number(finalRate || 0);
    
    const amount =
    Number(pcs || 0) *
    Number(rate || 0);

    onUpdateItem(i, {
      ...item,
      size: editSize,
      pcs,
      rate,
      amount,
      isManual: true,
    });

    cancelEdit();
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-50 text-blue-700 sticky top-0 z-10">
            <tr>
              {["Description", "Size (Boxes)", "PCS", "Rate", "Amount", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-center font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="py-10 text-center text-gray-400">
                  No items added
                </td>
              </tr>
            )}

            {items.map((item, idx) => {
              const previewBoxes = getTotalBoxes(editSize);
              const pcsPerBox = item.pcsPerBox || 1;

              return (
                <tr
                  key={idx}
                  className={`border-t ${
                    item.isSample ? "bg-yellow-50" : "hover:bg-blue-50"
                  }`}
                >
                  <td className="px-4 py-2">{item.desc}</td>

                  <td className="px-4 py-2 text-center">
                    {editIndex === idx ? (
                      <input
                        className="w-full px-2 py-1 border rounded text-sm"
                        value={editSize}
                        onChange={e => setEditSize(e.target.value)}
                        placeholder="S-5, M-3 (boxes)"
                      />
                    ) : (
                      item.size || "-"
                    )}
                  </td>

                  <td className="px-4 py-2 text-center font-semibold">
                    {editIndex === idx
                      ? previewBoxes * pcsPerBox
                      : item.pcs}
                  </td>

                  <td className="px-4 py-2 text-center">
                    {editIndex === idx ? (
                      <input
                        className="w-20 px-2 py-1 border rounded text-sm text-center"
                        type="number"
                        value={editRate}
                        onChange={e => setEditRate(e.target.value)}
                      />
                    ) : (
                      `₹${item.rate}`
                    )}
                  </td>

                  <td className="px-4 py-2 text-center font-semibold">
                    ₹
                    {editIndex === idx
                      ? previewBoxes * pcsPerBox * editRate
                      : item.amount}
                  </td>

                  <td className="px-4 py-2 text-center space-x-2">
                    {editIndex === idx ? (
                      <>
                        <button
                          onClick={() => updateItem(idx)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                        >
                          Update
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs bg-gray-300 rounded"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onEdit(idx)}
                          className="px-2 py-1 text-xs bg-yellow-400 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(idx)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
