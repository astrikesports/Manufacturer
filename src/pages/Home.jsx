import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white w-[420px] rounded shadow p-8">

        {/* TITLE */}
        <h1 className="text-2xl font-bold text-center mb-6">
          Quotation Management
        </h1>

        {/* BUTTONS */}
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 transition"
        >
          ➕ New Quotation
        </button>

        <button
          disabled
          className="w-full bg-blue-600 text-white py-3 rounded font-bold mt-4 opacity-60 cursor-not-allowed"
        >
          📂 Load Old Quotation
        </button>

        {/* FOOTER */}
        <p className="text-center text-sm text-gray-500 mt-6">
          ASTRIKE SPORTSWEAR PVT LTD
        </p>

      </div>
    </div>
  );
}
