import { useState } from 'react';
import { FileBarChart, FileText, Package, Truck, Layers, Scissors, IndianRupee, TrendingUp, Workflow } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import {
  getLotColorSizeCut, getLotColorSizeStitch, getLotColorSizeFinish, getLotColorSizePress,
  getPackedColorSize, getDispatchedBoxes, getTotalBoxes,
  getFabricBalance,
} from '../store/calculations';
import { getArticleCostSummary, getAllLotCostSummaries } from '../store/costing';
import { formatNum, formatDate } from '../utils/helpers';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

type ReportType = 'lotReport' | 'pipeline' | 'packing' | 'dispatch' | 'fabric' | 'production' | 'costing' | 'materialConsumption' | 'lotCost' | 'profit' | 'materialRequirement';

const reportTabs: { key: ReportType; label: string; icon: React.ReactNode }[] = [
  { key: 'lotReport', label: 'Lot Report', icon: <Workflow size={18} /> },
  { key: 'pipeline', label: 'Production Pipeline', icon: <Layers size={18} /> },
  { key: 'packing', label: 'Packing Summary', icon: <Package size={18} /> },
  { key: 'dispatch', label: 'Dispatch Report', icon: <Truck size={18} /> },
  { key: 'fabric', label: 'Fabric Report', icon: <FileText size={18} /> },
  { key: 'production', label: 'Production Report', icon: <Scissors size={18} /> },
  { key: 'costing', label: 'Costing Sheet', icon: <IndianRupee size={18} /> },
  { key: 'materialConsumption', label: 'Material Consumption', icon: <Package size={18} /> },
  { key: 'lotCost', label: 'Lot Cost Report', icon: <IndianRupee size={18} /> },
  { key: 'profit', label: 'Profit Report', icon: <TrendingUp size={18} /> },
  { key: 'materialRequirement', label: 'Material Requirement', icon: <Layers size={18} /> },
];

export default function Reports() {
  const { data } = useStore();
  const [activeReport, setActiveReport] = useState<ReportType>('lotReport');

  const companyName = data.settings.companyName;
  const colorName = (fabricId: string, colorId: string) => data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId)?.name ?? '—';

  const print = () => window.print();

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Reports" subtitle="Print-friendly production, packing, dispatch and fabric reports" icon={<FileBarChart size={22} />}
          action={{ label: 'Print', onClick: print }} />
      </div>

      <div className="no-print flex flex-wrap gap-2 mb-6">
        {reportTabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveReport(tab.key)}
            className={`btn ${activeReport === tab.key ? 'bg-brand-600 text-white' : 'btn-secondary'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="print-area card p-6">
        <div className="text-center mb-6 pb-4 border-b-2 border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">{companyName}</h1>
          <p className="text-sm text-slate-500">
            {reportTabs.find((t) => t.key === activeReport)?.label} — Generated on {formatDate(new Date().toISOString())}
          </p>
        </div>

        {activeReport === 'lotReport' && <LotReport data={data} colorName={colorName} />}
        {activeReport === 'pipeline' && <PipelineReport data={data} colorName={colorName} />}
        {activeReport === 'packing' && <PackingReport data={data} colorName={colorName} />}
        {activeReport === 'dispatch' && <DispatchReport data={data} />}
        {activeReport === 'fabric' && <FabricReport data={data} />}
        {activeReport === 'production' && <ProductionReport data={data} />}
        {activeReport === 'costing' && <CostingSheetReport data={data} />}
        {activeReport === 'materialConsumption' && <MaterialConsumptionReport data={data} />}
        {activeReport === 'lotCost' && <LotCostReport data={data} />}
        {activeReport === 'profit' && <ProfitReport data={data} />}
        {activeReport === 'materialRequirement' && <MaterialRequirementReport data={data} />}
      </div>

      {data.lots.length === 0 && (
        <div className="no-print">
          <EmptyState icon={<FileBarChart size={40} />} title="No data for reports" message="Create lots and production entries to generate reports." />
        </div>
      )}
    </div>
  );
}

function PipelineReport({ data, colorName }: { data: any; colorName: (f: string, c: string) => string }) {
  if (data.lots.length === 0) return <p className="text-center text-slate-500 py-8">No lots available.</p>;
  return (
    <div className="space-y-6">
      {data.lots.map((lot: any) => {
        const cutMap = getLotColorSizeCut(data, lot.id);
        const stitchMap = getLotColorSizeStitch(data, lot.id);
        const finMap = getLotColorSizeFinish(data, lot.id);
        const pressMap = getLotColorSizePress(data, lot.id);
        const packedMap = getPackedColorSize(data, lot.id);
        const article = data.articles.find((a: any) => a.id === lot.articleId);

        const totals = { cut: 0, stitch: 0, fin: 0, press: 0, packed: 0 };
        for (const [, sm] of cutMap) for (const [, q] of sm) totals.cut += q;
        for (const [, sm] of stitchMap) for (const [, q] of sm) totals.stitch += q;
        for (const [, sm] of finMap) for (const [, q] of sm) totals.fin += q;
        for (const [, sm] of pressMap) for (const [, q] of sm) totals.press += q;
        for (const [, sm] of packedMap) for (const [, q] of sm) totals.packed += q;

        return (
          <div key={lot.id}>
            <h3 className="font-bold text-slate-800 mb-2">{lot.lotNo} — {article?.name ?? '—'}</h3>
            <table className="w-full text-sm border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="th border border-slate-300">Color</th>
                  <th className="th border border-slate-300">Stage</th>
                  {lot.sizes.map((s: any) => <th key={s} className="th text-center border border-slate-300">{s}</th>)}
                  <th className="th text-right border border-slate-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {lot.colorIds.map((colorId: string) => {
                  const stages = [
                    { label: 'Cutting', map: cutMap },
                    { label: 'Stitching', map: stitchMap },
                    { label: 'Finishing', map: finMap },
                    { label: 'Pressing', map: pressMap },
                    { label: 'Packing', map: packedMap },
                  ];
                  return stages.map((stage, sIdx) => {
                    const sizeMap = stage.map.get(colorId) ?? new Map();
                    const rowTotal = lot.sizes.reduce((a: number, s: any) => a + (sizeMap.get(s) ?? 0), 0);
                    return (
                      <tr key={`${colorId}-${sIdx}`} className={sIdx === 0 ? 'border-t-2 border-slate-300' : ''}>
                        {sIdx === 0 && <td className="td border border-slate-300 font-medium" rowSpan={5}>{colorName(lot.fabricId, colorId)}</td>}
                        <td className="td border border-slate-300 text-xs text-slate-500">{stage.label}</td>
                        {lot.sizes.map((s: any) => <td key={s} className="td text-center border border-slate-300">{formatNum(sizeMap.get(s) ?? 0)}</td>)}
                        <td className="td text-right border border-slate-300 font-medium">{formatNum(rowTotal)}</td>
                      </tr>
                    );
                  });
                })}
                <tr className="bg-slate-100 font-bold">
                  <td className="td border border-slate-300" colSpan={2}>Stage Totals</td>
                  <td className="td text-center border border-slate-300" colSpan={lot.sizes.length}>
                    Cut: {formatNum(totals.cut)} · Stitch: {formatNum(totals.stitch)} · Fin: {formatNum(totals.fin)} · Press: {formatNum(totals.press)} · Packed: {formatNum(totals.packed)}
                  </td>
                  <td className="td text-right border border-slate-300"></td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function PackingReport({ data, colorName }: { data: any; colorName: (f: string, c: string) => string }) {
  const packings = data.packings;
  if (packings.length === 0) return <p className="text-center text-slate-500 py-8">No packing entries.</p>;
  return (
    <div className="space-y-6">
      {data.lots.map((lot: any) => {
        const lotPackings = packings.filter((p: any) => p.lotId === lot.id);
        if (lotPackings.length === 0) return null;
        return (
          <div key={lot.id}>
            <h3 className="font-bold text-slate-800 mb-2">{lot.lotNo}</h3>
            <table className="w-full text-sm border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="th border border-slate-300">Date</th>
                  <th className="th border border-slate-300">Size</th>
                  <th className="th border border-slate-300">Color Breakdown</th>
                  <th className="th text-center border border-slate-300">PCS/Box</th>
                  <th className="th text-center border border-slate-300">Boxes</th>
                  <th className="th text-right border border-slate-300">Total PCS</th>
                </tr>
              </thead>
              <tbody>
                {lotPackings.map((p: any) => p.boxes.filter((b: any) => b.boxes > 0).map((box: any, bi: number) => (
                  <tr key={`${p.id}-${bi}`}>
                    {bi === 0 && <td className="td border border-slate-300" rowSpan={p.boxes.filter((b: any) => b.boxes > 0).length}>{formatDate(p.date)}</td>}
                    <td className="td border border-slate-300 font-medium">{box.size}</td>
                    <td className="td border border-slate-300">
                      {box.contents.filter((c: any) => c.pcs > 0).map((c: any) => `${colorName(lot.fabricId, c.colorId)}: ${c.pcs}`).join(' · ')}
                    </td>
                    <td className="td text-center border border-slate-300">{box.contents.reduce((a: number, c: any) => a + c.pcs, 0)}</td>
                    <td className="td text-center border border-slate-300 font-medium">{box.boxes}</td>
                    <td className="td text-right border border-slate-300 font-medium">{formatNum(box.boxes * box.contents.reduce((a: number, c: any) => a + c.pcs, 0))}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function DispatchReport({ data }: { data: any }) {
  if (data.dispatches.length === 0) return <p className="text-center text-slate-500 py-8">No dispatch entries.</p>;
  return (
    <div>
      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="th border border-slate-300">Date</th>
            <th className="th border border-slate-300">Lot</th>
            <th className="th border border-slate-300">Party</th>
            <th className="th border border-slate-300">Invoice</th>
            <th className="th border border-slate-300">Type</th>
            <th className="th border border-slate-300">Boxes</th>
          </tr>
        </thead>
        <tbody>
          {data.dispatches.map((d: any) => {
            const lot = data.lots.find((l: any) => l.id === d.lotId);
            const boxCount = d.dispatchBoxes.reduce((a: number, b: any) => a + b.boxes, 0);
            return (
              <tr key={d.id}>
                <td className="td border border-slate-300">{formatDate(d.date)}</td>
                <td className="td border border-slate-300 font-medium">{lot?.lotNo ?? '—'}</td>
                <td className="td border border-slate-300">{d.party || '—'}</td>
                <td className="td border border-slate-300">{d.invoiceNo || '—'}</td>
                <td className="td border border-slate-300">
                  <span className={`badge ${d.type === 'Full' ? 'bg-accent-100 text-accent-700' : 'bg-warn-100 text-warn-700'}`}>{d.type}</span>
                </td>
                <td className="td border border-slate-300 font-medium">{formatNum(boxCount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FabricReport({ data }: { data: any }) {
  if (data.fabrics.length === 0) return <p className="text-center text-slate-500 py-8">No fabrics.</p>;
  return (
    <div className="space-y-6">
      {data.fabrics.map((fabric: any) => (
        <div key={fabric.id}>
          <h3 className="font-bold text-slate-800 mb-2">{fabric.name} ({fabric.unit})</h3>
          <table className="w-full text-sm border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="th border border-slate-300">Color</th>
                <th className="th text-right border border-slate-300">Rolls</th>
                <th className="th text-right border border-slate-300">Stock</th>
                <th className="th text-right border border-slate-300">Used</th>
                <th className="th text-right border border-slate-300">Balance</th>
              </tr>
            </thead>
            <tbody>
              {fabric.colors.map((c: any) => {
                const balance = getFabricBalance(c);
                return (
                  <tr key={c.id}>
                    <td className="td border border-slate-300 font-medium">{c.name}</td>
                    <td className="td text-right border border-slate-300">{formatNum(c.rolls)}</td>
                    <td className="td text-right border border-slate-300">{formatNum(c.stock, 2)}</td>
                    <td className="td text-right border border-slate-300">{formatNum(c.used, 2)}</td>
                    <td className="td text-right border border-slate-300 font-medium">{formatNum(balance, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ProductionReport({ data }: { data: any }) {
  if (data.lots.length === 0) return <p className="text-center text-slate-500 py-8">No production data.</p>;
  return (
    <div>
      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="th border border-slate-300">Lot</th>
            <th className="th border border-slate-300">Article</th>
            <th className="th text-right border border-slate-300">Planned</th>
            <th className="th text-right border border-slate-300">Cut</th>
            <th className="th text-right border border-slate-300">Packed</th>
            <th className="th text-right border border-slate-300">Dispatched Boxes</th>
            <th className="th text-right border border-slate-300">Efficiency</th>
          </tr>
        </thead>
        <tbody>
          {data.lots.map((lot: any) => {
            const cutMap = getLotColorSizeCut(data, lot.id);
            const packedMap = getPackedColorSize(data, lot.id);
            let cutTotal = 0, packedTotal = 0;
            for (const [, sm] of cutMap) for (const [, q] of sm) cutTotal += q;
            for (const [, sm] of packedMap) for (const [, q] of sm) packedTotal += q;
            const dispatched = getDispatchedBoxes(data, lot.id);
            const article = data.articles.find((a: any) => a.id === lot.articleId);
            const efficiency = lot.plannedProduction > 0 ? Math.round((packedTotal / lot.plannedProduction) * 100) : 0;
            return (
              <tr key={lot.id}>
                <td className="td border border-slate-300 font-medium">{lot.lotNo}</td>
                <td className="td border border-slate-300">{article?.code ?? '—'}</td>
                <td className="td text-right border border-slate-300">{formatNum(lot.plannedProduction)}</td>
                <td className="td text-right border border-slate-300">{formatNum(cutTotal)}</td>
                <td className="td text-right border border-slate-300">{formatNum(packedTotal)}</td>
                <td className="td text-right border border-slate-300">{formatNum(dispatched)}</td>
                <td className="td text-right border border-slate-300">
                  <span className={`badge ${efficiency >= 80 ? 'bg-accent-100 text-accent-700' : efficiency >= 50 ? 'bg-warn-100 text-warn-700' : 'bg-err-100 text-err-700'}`}>{efficiency}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CostingSheetReport({ data }: { data: any }) {
  if (data.articles.length === 0) return <p className="text-center text-slate-500 py-8">No articles available.</p>;
  return (
    <div className="space-y-6">
      {data.articles.map((article: any) => {
        const summary = getArticleCostSummary(data, article);
        return (
          <div key={article.id}>
            <h3 className="font-bold text-slate-800 mb-2">{article.code} — {article.name}</h3>
            <table className="w-full text-sm border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="th border border-slate-300">Material</th>
                  <th className="th border border-slate-300">Category</th>
                  <th className="th text-right border border-slate-300">Consumption</th>
                  <th className="th text-right border border-slate-300">Rate</th>
                  <th className="th text-right border border-slate-300">GST %</th>
                  <th className="th text-right border border-slate-300">Cost</th>
                  <th className="th text-right border border-slate-300">GST Amt</th>
                  <th className="th text-right border border-slate-300">Net Cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r: any) => (
                  <tr key={r.row.id}>
                    <td className="td border border-slate-300 font-medium">{r.material?.name ?? '—'}</td>
                    <td className="td border border-slate-300">{r.material?.category ?? '—'}</td>
                    <td className="td text-right border border-slate-300">{formatNum(r.row.consumption, 3)} {r.material?.unit ?? ''}</td>
                    <td className="td text-right border border-slate-300">₹{formatNum(r.rate, r.rate < 1 ? 4 : 2)}</td>
                    <td className="td text-right border border-slate-300">{r.gst}%</td>
                    <td className="td text-right border border-slate-300 font-medium">₹{formatNum(r.lineCost, 2)}</td>
                    <td className="td text-right border border-slate-300 text-warn-700">₹{formatNum(r.lineGst, 2)}</td>
                    <td className="td text-right border border-slate-300 font-bold text-brand-700">₹{formatNum(r.lineNetCost, 2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td className="td border border-slate-300" colSpan={5}>Totals</td>
                  <td className="td text-right border border-slate-300">₹{formatNum(summary.costPerPiece, 2)}</td>
                  <td className="td text-right border border-slate-300 text-warn-700">₹{formatNum(summary.totalGstAmount, 2)}</td>
                  <td className="td text-right border border-slate-300 text-brand-700">₹{formatNum(summary.netCostPerPiece, 2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600">
              <span>Material: ₹{formatNum(summary.costPerPiece, 2)}</span>
              <span>GST: ₹{formatNum(summary.totalGstAmount, 2)}</span>
              <span className="font-semibold text-brand-700">Net Cost/Piece: ₹{formatNum(summary.netCostPerPiece, 2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MaterialConsumptionReport({ data }: { data: any }) {
  if (data.articles.length === 0) return <p className="text-center text-slate-500 py-8">No articles available.</p>;
  return (
    <div className="space-y-6">
      {data.articles.map((article: any) => (
        <div key={article.id}>
          <h3 className="font-bold text-slate-800 mb-2">{article.code} — {article.name}</h3>
          <table className="w-full text-sm border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="th border border-slate-300">Material</th>
                <th className="th border border-slate-300">Unit</th>
                <th className="th text-right border border-slate-300">Consumption / Piece</th>
                <th className="th text-right border border-slate-300">Rate</th>
              </tr>
            </thead>
            <tbody>
              {article.consumptionSheet.map((row: any) => {
                const mat = data.rawMaterials.find((m: any) => m.id === row.materialId);
                return (
                  <tr key={row.id}>
                    <td className="td border border-slate-300 font-medium">{mat?.name ?? '—'}</td>
                    <td className="td border border-slate-300">{mat?.unit ?? ''}</td>
                    <td className="td text-right border border-slate-300">{formatNum(row.consumption, 3)}</td>
                    <td className="td text-right border border-slate-300">₹{formatNum(mat?.purchasePrice ?? 0, (mat?.purchasePrice ?? 0) < 1 ? 4 : 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function LotCostReport({ data }: { data: any }) {
  const summaries = getAllLotCostSummaries(data);
  if (summaries.length === 0) return <p className="text-center text-slate-500 py-8">No lots with costing data.</p>;
  return (
    <div>
      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="th border border-slate-300">Lot</th>
            <th className="th border border-slate-300">Article</th>
            <th className="th text-right border border-slate-300">Qty</th>
            <th className="th text-right border border-slate-300">Fabric Cost</th>
            <th className="th text-right border border-slate-300">Accessories</th>
            <th className="th text-right border border-slate-300">Packing</th>
            <th className="th text-right border border-slate-300">Other</th>
            <th className="th text-right border border-slate-300">Total Cost</th>
            <th className="th text-right border border-slate-300">Cost/Piece</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.lot.id}>
              <td className="td border border-slate-300 font-medium">{s.lot.lotNo}</td>
              <td className="td border border-slate-300">{s.article?.code ?? '—'}</td>
              <td className="td text-right border border-slate-300">{formatNum(s.lot.plannedProduction)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.fabricCost, 0)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.threadCost + s.elasticCost + s.zipCost + s.buttonCost + s.labelCost + s.ribCost, 0)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.packingCost, 0)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.printingCost + s.otherCost, 0)}</td>
              <td className="td text-right border border-slate-300 font-bold">₹{formatNum(s.totalLotCost, 0)}</td>
              <td className="td text-right border border-slate-300 font-bold text-brand-700">₹{formatNum(s.costPerPiece, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfitReport({ data }: { data: any }) {
  const summaries = getAllLotCostSummaries(data);
  if (summaries.length === 0) return <p className="text-center text-slate-500 py-8">No lots with costing data.</p>;
  const totalRevenue = summaries.reduce((a, s) => a + s.totalRevenue, 0);
  const totalCost = summaries.reduce((a, s) => a + s.totalLotCost, 0);
  const totalGross = summaries.reduce((a, s) => a + s.grossProfit, 0);
  const totalLoss = summaries.reduce((a, s) => a + s.totalProductionLoss, 0);
  const totalNet = summaries.reduce((a, s) => a + s.netProfit, 0);
  return (
    <div className="space-y-4">
      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="th border border-slate-300" rowSpan={2}>Lot</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Qty</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Net Cost/Pc</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Sell Price</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Total Cost</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Revenue</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Gross Profit</th>
            <th className="th text-center border border-slate-300" colSpan={3}>Production Loss</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Net Profit</th>
            <th className="th text-right border border-slate-300" rowSpan={2}>Net Margin %</th>
          </tr>
          <tr>
            <th className="th text-right border border-slate-300">Shortage PCS</th>
            <th className="th text-right border border-slate-300">Left PCS</th>
            <th className="th text-right border border-slate-300">Loss Amt</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.lot.id}>
              <td className="td border border-slate-300 font-medium">{s.lot.lotNo}</td>
              <td className="td text-right border border-slate-300">{formatNum(s.lot.plannedProduction)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.netCostPerPiece, 2)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.sellingPricePerPcs, 2)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.totalLotCost, 0)}</td>
              <td className="td text-right border border-slate-300">₹{formatNum(s.totalRevenue, 0)}</td>
              <td className={`td text-right border border-slate-300 font-bold ${s.grossProfit >= 0 ? 'text-accent-700' : 'text-err-700'}`}>₹{formatNum(s.grossProfit, 0)}</td>
              <td className="td text-right border border-slate-300 text-warn-700">{formatNum(s.shortagePcs)}</td>
              <td className="td text-right border border-slate-300 text-warn-700">{formatNum(s.leftPcsByLot)}</td>
              <td className="td text-right border border-slate-300 text-err-700">₹{formatNum(s.totalProductionLoss, 0)}</td>
              <td className={`td text-right border border-slate-300 font-bold ${s.netProfit >= 0 ? 'text-accent-700' : 'text-err-700'}`}>₹{formatNum(s.netProfit, 0)}</td>
              <td className="td text-right border border-slate-300">{formatNum(s.netMarginPercent, 1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-100 font-bold">
          <tr>
            <td className="td border border-slate-300" colSpan={4}>Grand Total</td>
            <td className="td text-right border border-slate-300">₹{formatNum(totalCost, 0)}</td>
            <td className="td text-right border border-slate-300">₹{formatNum(totalRevenue, 0)}</td>
            <td className={`td text-right border border-slate-300 ${totalGross >= 0 ? 'text-accent-700' : 'text-err-700'}`}>₹{formatNum(totalGross, 0)}</td>
            <td className="td border border-slate-300" colSpan={2}></td>
            <td className="td text-right border border-slate-300 text-err-700">₹{formatNum(totalLoss, 0)}</td>
            <td className={`td text-right border border-slate-300 ${totalNet >= 0 ? 'text-accent-700' : 'text-err-700'}`}>₹{formatNum(totalNet, 0)}</td>
            <td className="td border border-slate-300"></td>
          </tr>
        </tfoot>
      </table>
      <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-500">
        <strong>Production Loss</strong> = Shortage PCS (planned − cut) + Left PCS (pressing − packed) × Net Cost Per Piece.
        Net Profit = Gross Profit − Production Loss.
      </div>
    </div>
  );
}

function MaterialRequirementReport({ data }: { data: any }) {
  const summaries = getAllLotCostSummaries(data);
  if (summaries.length === 0) return <p className="text-center text-slate-500 py-8">No lots with costing data.</p>;
  const materialMap = new Map<string, { name: string; unit: string; qty: number; cost: number }>();
  for (const s of summaries) {
    for (const r of s.requirements) {
      const key = r.row.materialId;
      const existing = materialMap.get(key);
      if (existing) {
        existing.qty += r.requiredQty;
        existing.cost += r.totalCost;
      } else {
        materialMap.set(key, { name: r.material?.name ?? '—', unit: r.material?.unit ?? '', qty: r.requiredQty, cost: r.totalCost });
      }
    }
  }
  return (
    <div>
      <table className="w-full text-sm border border-slate-300">
        <thead className="bg-slate-100">
          <tr>
            <th className="th border border-slate-300">Material</th>
            <th className="th border border-slate-300">Unit</th>
            <th className="th text-right border border-slate-300">Total Required Qty</th>
            <th className="th text-right border border-slate-300">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(materialMap.entries()).map(([key, val]) => (
            <tr key={key}>
              <td className="td border border-slate-300 font-medium">{val.name}</td>
              <td className="td border border-slate-300">{val.unit}</td>
              <td className="td text-right border border-slate-300">{formatNum(val.qty, 2)}</td>
              <td className="td text-right border border-slate-300 font-medium">₹{formatNum(val.cost, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LotReport({ data, colorName }: { data: any; colorName: (f: string, c: string) => string }) {
  if (data.lots.length === 0) return <p className="text-center text-slate-500 py-8">No lots available.</p>;
  const summaries = getAllLotCostSummaries(data);
  const summaryMap = new Map(summaries.map((s) => [s.lot.id, s]));

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 mb-4">Complete lot overview — planned, actual pipeline quantities, and P&L per lot. Actual cut PCS is the master quantity for costing.</p>
      {data.lots.map((lot: any) => {
        const cutMap = getLotColorSizeCut(data, lot.id);
        const stitchMap = getLotColorSizeStitch(data, lot.id);
        const finMap = getLotColorSizeFinish(data, lot.id);
        const pressMap = getLotColorSizePress(data, lot.id);
        const packedMap = getPackedColorSize(data, lot.id);
        const dispatched = getDispatchedBoxes(data, lot.id);
        const totalBoxes = getTotalBoxes(data, lot.id);
        const article = data.articles.find((a: any) => a.id === lot.articleId);
        const cs = summaryMap.get(lot.id);

        let cutTotal = 0, stitchTotal = 0, finTotal = 0, pressTotal = 0, packedTotal = 0;
        for (const [, sm] of cutMap) for (const [, q] of sm) cutTotal += q;
        for (const [, sm] of stitchMap) for (const [, q] of sm) stitchTotal += q;
        for (const [, sm] of finMap) for (const [, q] of sm) finTotal += q;
        for (const [, sm] of pressMap) for (const [, q] of sm) pressTotal += q;
        for (const [, sm] of packedMap) for (const [, q] of sm) packedTotal += q;

        return (
          <div key={lot.id} className="border border-slate-300 rounded-lg overflow-hidden">
            {/* Lot Header */}
            <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-lg">{lot.lotNo}</span>
                <span className="ml-3 text-slate-300 text-sm">{article?.code} — {article?.name}</span>
              </div>
              <span className={`badge ${lot.status === 'Active' ? 'bg-accent-600 text-white' : lot.status === 'Completed' ? 'bg-brand-600 text-white' : 'bg-slate-600 text-white'}`}>{lot.status}</span>
            </div>

            {/* Pipeline quantities */}
            <div className="grid grid-cols-3 sm:grid-cols-7 border-b border-slate-300">
              {[
                { label: 'Planned', value: lot.plannedProduction, bg: 'bg-slate-50' },
                { label: 'Cut', value: cutTotal, bg: 'bg-brand-50' },
                { label: 'Stitch', value: stitchTotal, bg: 'bg-slate-50' },
                { label: 'Finish', value: finTotal, bg: 'bg-accent-50' },
                { label: 'Press', value: pressTotal, bg: 'bg-warn-50' },
                { label: 'Packed PCS', value: packedTotal, bg: 'bg-accent-50' },
                { label: 'Disp Boxes', value: dispatched, bg: 'bg-slate-50' },
              ].map((cell) => (
                <div key={cell.label} className={`${cell.bg} px-3 py-2 text-center border-r border-slate-200 last:border-r-0`}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">{cell.label}</p>
                  <p className="text-lg font-bold text-slate-800">{formatNum(cell.value)}</p>
                </div>
              ))}
            </div>

            {/* Color/Size breakdown — cutting + packing */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-b border-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th border-r border-slate-200">Color</th>
                    <th className="th border-r border-slate-200 text-xs">Stage</th>
                    {lot.sizes.map((s: any) => <th key={s} className="th text-center border-r border-slate-200">{s}</th>)}
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lot.colorIds.map((colorId: string, ci: number) => {
                    const stages = [
                      { label: 'Cut', map: cutMap },
                      { label: 'Stitch', map: stitchMap },
                      { label: 'Finish', map: finMap },
                      { label: 'Press', map: pressMap },
                      { label: 'Packed', map: packedMap },
                    ];
                    return stages.map((stage, sIdx) => {
                      const sizeMap = stage.map.get(colorId) ?? new Map();
                      const rowTotal = lot.sizes.reduce((a: number, s: any) => a + (sizeMap.get(s) ?? 0), 0);
                      return (
                        <tr key={`${colorId}-${sIdx}`} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${sIdx === 0 ? 'border-t border-slate-300' : ''}`}>
                          {sIdx === 0 && (
                            <td className="td border-r border-slate-200 font-medium" rowSpan={5}>{colorName(lot.fabricId, colorId)}</td>
                          )}
                          <td className="td border-r border-slate-200 text-xs text-slate-500">{stage.label}</td>
                          {lot.sizes.map((s: any) => (
                            <td key={s} className={`td text-center border-r border-slate-200 ${rowTotal === 0 ? 'text-slate-300' : ''}`}>
                              {sizeMap.get(s) ?? 0}
                            </td>
                          ))}
                          <td className={`td text-right font-medium ${rowTotal === 0 ? 'text-slate-300' : 'text-brand-700'}`}>{formatNum(rowTotal)}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>

            {/* P&L summary */}
            {cs && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-0 border-t border-slate-300 bg-slate-50 text-xs">
                {[
                  { label: 'Cost/Piece', value: `₹${formatNum(cs.costPerPiece, 2)}` },
                  { label: 'Net Cost/Piece', value: `₹${formatNum(cs.netCostPerPiece, 2)}` },
                  { label: 'Sell Price', value: `₹${formatNum(cs.sellingPricePerPcs, 2)}` },
                  { label: 'Total Revenue', value: `₹${formatNum(cs.totalRevenue, 0)}` },
                  { label: 'Gross Profit', value: `₹${formatNum(cs.grossProfit, 0)}`, color: cs.grossProfit >= 0 ? 'text-accent-700' : 'text-err-700' },
                  { label: 'Net Profit', value: `₹${formatNum(cs.netProfit, 0)}`, color: cs.netProfit >= 0 ? 'text-accent-700' : 'text-err-700' },
                ].map((cell) => (
                  <div key={cell.label} className="px-3 py-2 border-r border-slate-200 last:border-r-0">
                    <p className="text-slate-500 uppercase font-semibold">{cell.label}</p>
                    <p className={`font-bold mt-0.5 ${cell.color ?? 'text-slate-800'}`}>{cell.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}