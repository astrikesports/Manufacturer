import {
  LayoutDashboard, Package, Scissors, Box, Truck, AlertTriangle, TrendingUp, Activity, Layers, IndianRupee, PiggyBank, Workflow, Sparkles, Wind,
} from 'lucide-react';
import { useStore } from '../store/StoreContext';
import {
  getLotColorSizeCut, getLotColorSizeStitch, getLotColorSizeFinish, getLotColorSizePress,
  getPackedColorSize, getTotalBoxes, getDispatchedBoxes, getAvailableBoxes, getFabricBalance,
} from '../store/calculations';
import { getDashboardCostingStats } from '../store/costing';
import { formatNum, formatDate } from '../utils/helpers';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { data } = useStore();

  let totalCut = 0, totalStitch = 0, totalFinish = 0, totalPress = 0, totalPacked = 0;
  for (const lot of data.lots) {
    const cutMap = getLotColorSizeCut(data, lot.id);
    const stitchMap = getLotColorSizeStitch(data, lot.id);
    const finishMap = getLotColorSizeFinish(data, lot.id);
    const pressMap = getLotColorSizePress(data, lot.id);
    const packedMap = getPackedColorSize(data, lot.id);
    for (const [, sm] of cutMap) for (const [, q] of sm) totalCut += q;
    for (const [, sm] of stitchMap) for (const [, q] of sm) totalStitch += q;
    for (const [, sm] of finishMap) for (const [, q] of sm) totalFinish += q;
    for (const [, sm] of pressMap) for (const [, q] of sm) totalPress += q;
    for (const [, sm] of packedMap) for (const [, q] of sm) totalPacked += q;
  }

  const totalPlannedPcs = data.lots.reduce((a, l) => a + l.plannedProduction, 0);
  const totalBoxes = data.lots.reduce((a, l) => a + getTotalBoxes(data, l.id), 0);
  const totalDispatchedBoxes = data.lots.reduce((a, l) => a + getDispatchedBoxes(data, l.id), 0);
  const totalAvailableBoxes = data.lots.reduce((a, l) => a + getAvailableBoxes(data, l.id), 0);

  let totalFabricStock = 0, totalFabricUsed = 0, totalFabricBalance = 0;
  for (const f of data.fabrics) {
    for (const c of f.colors) {
      totalFabricStock += c.stock;
      totalFabricUsed += c.used;
      totalFabricBalance += getFabricBalance(c);
    }
  }

  const rawMaterialInventoryValue = data.rawMaterials.reduce((a, m) => a + m.currentStock * m.purchasePrice, 0);

  const efficiency = totalCut > 0 ? Math.round((totalPacked / totalCut) * 100) : 0;
  const costingStats = getDashboardCostingStats(data);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCut = data.cuttings.filter((c) => c.date === todayStr).reduce((a, c) => a + c.colorSizes.reduce((x, cs) => x + cs.sizes.reduce((y, s) => y + s.qty, 0), 0), 0);
  const todayPacked = data.packings.filter((p) => p.date === todayStr).reduce((a, p) => a + p.boxes.reduce((x, b) => x + b.boxes * b.contents.reduce((y, c) => y + c.pcs, 0), 0), 0);

  const monthlyData: { month: string; cut: number; packed: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
    const cut = data.cuttings.filter((c) => c.date.startsWith(monthStr)).reduce((a, c) => a + c.colorSizes.reduce((x, cs) => x + cs.sizes.reduce((y, s) => y + s.qty, 0), 0), 0);
    const packed = data.packings.filter((p) => p.date.startsWith(monthStr)).reduce((a, p) => a + p.boxes.reduce((x, b) => x + b.boxes * b.contents.reduce((y, c) => y + c.pcs, 0), 0), 0);
    monthlyData.push({ month: monthLabel, cut, packed });
  }
  const maxMonthly = Math.max(...monthlyData.map((m) => Math.max(m.cut, m.packed)), 1);

  const recentActivity = data.history.slice(0, 8);

  const lotStatusColors = ['bg-brand-500', 'bg-accent-500', 'bg-warn-500', 'bg-err-500', 'bg-slate-400'];
  const lotStatusData = data.lots.map((lot, i) => {
    const cutMap = getLotColorSizeCut(data, lot.id);
    let cutTotal = 0;
    for (const [, sm] of cutMap) for (const [, q] of sm) cutTotal += q;
    const packedMap = getPackedColorSize(data, lot.id);
    let packedTotal = 0;
    for (const [, sm] of packedMap) for (const [, q] of sm) packedTotal += q;
    return { lot: lot.lotNo, cut: cutTotal, packed: packedTotal, color: lotStatusColors[i % lotStatusColors.length] };
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600"><LayoutDashboard size={22} /></div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Live overview of production pipeline, inventory, and P&L</p>
        </div>
      </div>

      {/* Production pipeline row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Planned</p>
          <p className="text-2xl font-bold text-slate-700">{formatNum(totalPlannedPcs)}</p>
          <p className="text-xs text-slate-400 mt-0.5">PCS</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-brand-400">
          <p className="text-xs font-semibold text-brand-600 uppercase mb-1 flex items-center justify-center gap-1"><Scissors size={12} /> Cut</p>
          <p className="text-2xl font-bold text-brand-700">{formatNum(totalCut)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Actual PCS</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-slate-400">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-center gap-1"><Workflow size={12} /> Stitch</p>
          <p className="text-2xl font-bold text-slate-700">{formatNum(totalStitch)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Actual PCS</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-accent-400">
          <p className="text-xs font-semibold text-accent-600 uppercase mb-1 flex items-center justify-center gap-1"><Sparkles size={12} /> Finish</p>
          <p className="text-2xl font-bold text-accent-700">{formatNum(totalFinish)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Actual PCS</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-warn-400">
          <p className="text-xs font-semibold text-warn-600 uppercase mb-1 flex items-center justify-center gap-1"><Wind size={12} /> Press</p>
          <p className="text-2xl font-bold text-warn-700">{formatNum(totalPress)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Actual PCS</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-accent-500">
          <p className="text-xs font-semibold text-accent-600 uppercase mb-1 flex items-center justify-center gap-1"><Box size={12} /> Packed</p>
          <p className="text-2xl font-bold text-accent-700">{formatNum(totalPacked)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatNum(totalBoxes)} boxes</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-slate-500">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-1 flex items-center justify-center gap-1"><Truck size={12} /> Dispatch</p>
          <p className="text-2xl font-bold text-slate-700">{formatNum(totalDispatchedBoxes)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatNum(totalAvailableBoxes)} avail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Fabric Balance" value={formatNum(totalFabricBalance, 2)} icon={<Package size={22} />} color="warn" sublabel={`Used: ${formatNum(totalFabricUsed, 2)}`} />
        <StatCard label="RM Inventory" value={`₹${formatNum(rawMaterialInventoryValue, 0)}`} icon={<Package size={22} />} color="brand" sublabel={`${data.rawMaterials.filter((m) => m.status === 'Active').length} active materials`} />
        <StatCard label="Efficiency" value={`${efficiency}%`} icon={<TrendingUp size={22} />} color="accent" sublabel="Cut to pack ratio" />
        <StatCard label="Revenue" value={`₹${formatNum(costingStats.totalRevenue, 0)}`} icon={<TrendingUp size={22} />} color="accent" sublabel="Total selling amount" />
        <StatCard label="Gross Profit" value={`₹${formatNum(costingStats.totalProfit, 0)}`} icon={<PiggyBank size={22} />} color={costingStats.totalProfit >= 0 ? 'accent' : 'err'} sublabel={`${formatNum(costingStats.avgProfitPercent, 1)}% avg profit`} />
        <StatCard label="Net Profit" value={`₹${formatNum(costingStats.totalNetProfit, 0)}`} icon={<PiggyBank size={22} />} color={costingStats.totalNetProfit >= 0 ? 'accent' : 'err'} sublabel="After production losses" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Cost Per Piece" value={`₹${formatNum(costingStats.avgCostPerPiece, 2)}`} icon={<IndianRupee size={22} />} color="brand" sublabel="Average across lots" />
        <StatCard label="Net Cost/Piece" value={`₹${formatNum(costingStats.avgNetCostPerPiece, 2)}`} icon={<IndianRupee size={22} />} color="slate" sublabel="Incl. GST" />
        <StatCard label="Total Lot Cost" value={`₹${formatNum(costingStats.totalLotCost, 0)}`} icon={<IndianRupee size={22} />} color="slate" sublabel="All lots combined" />
        <StatCard label="Production Loss" value={`₹${formatNum(costingStats.totalProductionLoss, 0)}`} icon={<AlertTriangle size={22} />} color="err" sublabel="Shortage + Left PCS" />
        <StatCard label="Active Lots" value={String(data.lots.filter((l) => l.status === 'Active').length)} icon={<Layers size={22} />} color="brand" sublabel={`${data.lots.length} total lots`} />
        <StatCard label="Low Stock Alert" value={String(data.rawMaterials.filter((m) => m.minStock > 0 && m.currentStock < m.minStock).length)} icon={<AlertTriangle size={22} />} color="err" sublabel="Raw materials below min" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-brand-600" /> Monthly Production (6 months)</h3>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex justify-center items-end gap-1 h-40">
                  <div className="w-1/2 bg-brand-500 rounded-t transition-all hover:bg-brand-600" style={{ height: `${(m.cut / maxMonthly) * 100}%`, minHeight: m.cut > 0 ? '4px' : '0' }} title={`Cut: ${m.cut}`} />
                  <div className="w-1/2 bg-accent-500 rounded-t transition-all hover:bg-accent-600" style={{ height: `${(m.packed / maxMonthly) * 100}%`, minHeight: m.packed > 0 ? '4px' : '0' }} title={`Packed: ${m.packed}`} />
                </div>
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500" /> Cut</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent-500" /> Packed</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-accent-600" /> Today's Production</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-brand-50">
              <p className="text-xs text-slate-500 uppercase font-semibold">Cut Today</p>
              <p className="text-2xl font-bold text-brand-700">{formatNum(todayCut)} <span className="text-sm font-normal">pcs</span></p>
            </div>
            <div className="p-4 rounded-lg bg-accent-50">
              <p className="text-xs text-slate-500 uppercase font-semibold">Packed Today</p>
              <p className="text-2xl font-bold text-accent-700">{formatNum(todayPacked)} <span className="text-sm font-normal">pcs</span></p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500 uppercase font-semibold">Active Lots</p>
              <p className="text-2xl font-bold text-slate-700">{data.lots.filter((l) => l.status === 'Active').length} <span className="text-sm font-normal">lots</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Layers size={18} className="text-brand-600" /> Lot Production Status</h3>
          {lotStatusData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No lots yet.</p>
          ) : (
            <div className="space-y-3">
              {lotStatusData.map((l) => (
                <div key={l.lot}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{l.lot}</span>
                    <span className="text-slate-500">Cut: {formatNum(l.cut)} · Packed: {formatNum(l.packed)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-brand-500" style={{ width: `${l.cut > 0 ? (l.packed / l.cut) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-brand-600" /> Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No activity yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {recentActivity.map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <span className={`badge ${h.action === 'Create' ? 'bg-accent-100 text-accent-700' : h.action === 'Edit' ? 'bg-brand-100 text-brand-700' : 'bg-err-100 text-err-700'}`}>{h.action}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{h.description}</p>
                    <p className="text-xs text-slate-400">{h.module} · {formatDate(h.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
