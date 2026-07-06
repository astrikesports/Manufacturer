import { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import Sidebar, { PageKey } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FabricStock from './pages/FabricStock';
import RawMaterialMaster from './pages/RawMaterialMaster';
import ArticleMaster from './pages/ArticleMaster';
import LotCreation from './pages/LotCreation';
import CuttingEntryPage from './pages/CuttingEntry';
import CutPCS from './pages/CutPCS';
import ProductionStage from './pages/ProductionStage';
import PackingEntryPage from './pages/PackingEntry';
import DispatchEntryPage from './pages/DispatchEntry';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function AppContent() {
  const { data, loading } = useStore();
  const [page, setPage] = useState<PageKey>('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'fabric': return <FabricStock />;
      case 'rawmaterial': return <RawMaterialMaster />;
      case 'article': return <ArticleMaster />;
      case 'lot': return <LotCreation />;
      case 'cutting': return <CuttingEntryPage />;
      case 'cutpcs': return <CutPCS />;
      case 'stitching': return <ProductionStage stage="stitching" />;
      case 'finishing': return <ProductionStage stage="finishing" />;
      case 'pressing': return <ProductionStage stage="pressing" />;
      case 'packing': return <PackingEntryPage />;
      case 'dispatch': return <DispatchEntryPage />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar current={page} onNavigate={setPage} companyName={data.settings.companyName} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Loading data from database...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">{renderPage()}</div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
