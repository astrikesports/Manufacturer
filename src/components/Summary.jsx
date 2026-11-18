import { useEffect } from "react";
export default function Summary({
  pcs,
  amount,
  billDiscount,
  setBillDiscount,
  shipping,
  setShipping,
  advance,
  setAdvance,
  net,
}) {

  return (

    <div className="mt-4">

      <div className="bg-gradient-to-r from-[#050816] via-[#0b1020] to-[#050816]  border border-white/10 shadow-[0_10px_60px_rgba(0,0,0,0.45)] overflow-hidden relative">

        {/* GLOW */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/10 blur-3xl rounded-full" />

        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 blur-3xl rounded-full" />

        {/* CONTENT */}
        <div className="relative z-10 p-3">

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">

            {/* TOTAL PCS */}
            <div className="rounded-[24px] bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl h-[104px] flex flex-col justify-between">

              <div>

                <p className="text-gray-400 text-[10px] tracking-[2px] font-bold">
                  TOTAL PCS
                </p>

                <h2 className="text-white text-4xl font-black mt-2">
                  {pcs}
                </h2>

              </div>

              <p className="text-gray-500 text-xs">
                Total pieces
              </p>

            </div>

            {/* GROSS */}
            <div className="rounded-[24px] bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl h-[104px] flex flex-col justify-between">

              <div>

                <p className="text-gray-400 text-[10px] tracking-[2px] font-bold">
                  GROSS
                </p>

                <h2 className="text-white text-4xl font-black mt-2">
                  ₹{amount}
                </h2>

              </div>

              <p className="text-gray-500 text-xs">
                After discount
              </p>

            </div>

            {/* BILL DISCOUNT */}
            <div className="rounded-[24px] bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl h-[104px] flex flex-col justify-between">

              <div>

                <p className="text-gray-400 text-[10px] tracking-[2px] font-bold">
                  DISCOUNT
                </p>

                <input
                  type="number"
                  min={0}
                  value={billDiscount}
                  onChange={(e) =>
                    setBillDiscount(
                      Number(e.target.value)
                    )
                  }
                  className="w-full h-10 rounded-xl mt-2 bg-white/10 border border-white/10 px-3 text-white text-2xl font-black outline-none focus:border-green-400"
                />

              </div>

            </div>

            {/* SHIPPING */}
            <div className="rounded-[24px] bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl h-[104px] flex flex-col justify-between">

              <div>

                <p className="text-gray-400 text-[10px] tracking-[2px] font-bold">
                  SHIPPING
                </p>

                <input
                  type="number"
                  min={0}
                  value={shipping}
                  onChange={(e) =>
                    setShipping(
                      Number(e.target.value)
                    )
                  }
                  className="w-full h-10 rounded-xl mt-2 bg-white/10 border border-white/10 px-3 text-white text-2xl font-black outline-none focus:border-blue-400"
                />

              </div>

            </div>

            {/* ADVANCE */}
            <div className="rounded-[24px] bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl h-[104px] flex flex-col justify-between">

              <div>

                <p className="text-gray-400 text-[10px] tracking-[2px] font-bold">
                  ADVANCE
                </p>

                <input
                  type="number"
                  min={0}
                  value={advance}
                  onChange={(e) =>
                    setAdvance(
                      Number(e.target.value)
                    )
                  }
                  className="w-full h-10 rounded-xl mt-2 bg-white/10 border border-white/10 px-3 text-white text-2xl font-black outline-none focus:border-yellow-400"
                />

              </div>

            </div>

            {/* NET */}
            <div className="rounded-[24px] bg-gradient-to-br from-green-400 to-green-500 px-4 py-3 h-[104px] flex flex-col justify-between shadow-[0_10px_40px_rgba(34,197,94,0.45)]">

              <div>

                <p className="text-black/70 text-[10px] tracking-[2px] font-black">
                  NET PAYABLE
                </p>

                <h2 className="text-black text-5xl font-black mt-2">
                  ₹{net}
                </h2>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
