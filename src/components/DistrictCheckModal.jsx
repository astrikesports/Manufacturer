import { useEffect, useState } from "react";
import { loadDistricts } from "../services/districtService";

export default function DistrictCheckModal({ onClose, setPdfData }) {
  const [query, setQuery] = useState("");
  const [db, setDb] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadDistricts().then(setDb);
  }, []);

  function handleSearch(value) {
  setQuery(value);

  if (!value) {
    setFiltered([]);
    setResult(null);
    return;
  }

  const lower = value.toLowerCase().trim();

  // 🔥 PARTIAL MATCH (IMPORTANT FIX)
  const matches = db.filter(d =>
    d.district?.toLowerCase().includes(lower)
  );

  setFiltered(matches);

  if (matches.length > 0) {
    // ❌ Agar koi bhi match mila → NOT AVAILABLE
    setResult({
      found: true,
      party: matches[0].party,
      pincode: matches[0].pincode
    });
  } else {
    // ✅ koi match nahi
    setResult({
      found: false
    });
  }
}

  function handleSelect(item) {
    setQuery(item.district);
    setFiltered([]);

    // 🔥 AUTO FILL IN QUOTATION
    if (setPdfData) {
      setPdfData(prev => ({
        ...prev,
        party: item.party,
        address: item.district,
        phone: item.pincode
      }));
    }

    setResult({
      found: true,
      party: item.party,
      pincode: item.pincode
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[420px] rounded p-4">

        <h2 className="text-lg font-bold mb-3">
          📍 Check District (PRO MAX)
        </h2>

        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type district..."
          className="w-full border p-2 rounded mb-2"
        />

        {/* 🔥 DROPDOWN */}
        {filtered.length > 0 && (
          <div className="border rounded max-h-40 overflow-y-auto mb-2">
            {filtered.map((item, i) => (
              <div
                key={i}
                onClick={() => handleSelect(item)}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                <b>{item.district}</b>
                <div className="text-xs text-gray-500">
                  {item.party} | {item.pincode}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🔥 RESULT */}
        {result && (
          <div className="mt-2 p-3 rounded border">
            {result.found ? (
              <div className="text-red-600 font-semibold">
                ❌ This district is not available <br />
                🏢 {result.party} <br />
                📍 {result.pincode}
              </div>
            ) : (
              <div className="text-green-600 font-semibold">
                ✅ District Available
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-blue-600 text-white p-2 rounded"
        >
          Close
        </button>

      </div>
    </div>
  );
}
