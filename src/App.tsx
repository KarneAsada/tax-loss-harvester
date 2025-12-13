import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { HoldingsTable } from './components/HoldingsTable';
import { HarvestingTable } from './components/HarvestingTable';
import { BalancingTable } from './components/BalancingTable';
import { formatCurrency } from './utils/format';
import { Calculator, DollarSign, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { usePortfolio } from './hooks/usePortfolio';
import { DEBUG_TRANSACTIONS } from './utils/debugData';
import { Transaction } from './utils/finance';
import { seoConfig } from './config/seo';

const PortfolioDashboard = ({ initialData = [] }: { initialData?: Transaction[] }) => {
  // Apply SEO Config
  useEffect(() => {
    document.title = seoConfig.title;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', seoConfig.description);
    if (seoConfig.keywords) {
      updateMeta('keywords', seoConfig.keywords.join(', '));
    }
    if (seoConfig.themeColor) {
      updateMeta('theme-color', seoConfig.themeColor);
    }
  }, []);

  const {
    transactions,
    positions,
    summary,
    opportunities,
    balancingOpportunities,
    selectedHarvestTickers,
    selectedBalancingTickers,
    loading,
    fetchingPrices,
    fetchProgress,
    error,
    handleFileUpload,
    handleFetchPrices,
    toggleHarvest,
    toggleAllHarvest,
    toggleBalancing,
    toggleAllBalancing,
    reset
  } = usePortfolio(initialData);

  const [isDragging, setIsDragging] = useState(false);

  // Global drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only set to false if we're leaving the window (relatedTarget is null)
      if (!e.relatedTarget) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleFileUpload]);

  const location = useLocation();
  const isDebug = location.pathname === '/debug';

  return (
    <div className="min-h-screen bg-secondary-50 font-sans text-gray-900 relative">
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary-500 bg-opacity-50 z-50 flex items-center justify-center border-4 border-primary-600 border-dashed m-4 rounded-xl backdrop-blur-sm pointer-events-none">
          <div className="text-white text-center">
            <div className="bg-white p-4 rounded-full inline-block mb-4">
              <TrendingDown className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold">Drop your CSV file here</h2>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-primary-50 p-2 rounded-lg mr-3 flex items-center justify-center">
              <span className="text-2xl">🌾</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Tax Loss Harvester {isDebug && <span className="text-sm font-normal text-gray-500 ml-2">(Debug Mode)</span>}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {transactions.length === 0 ? (
          <div className="max-w-xl mx-auto mt-10">
            <FileUpload onUpload={handleFileUpload} />
            {loading && <p className="text-center mt-4 text-gray-500">Processing...</p>}
            {error && <p className="text-center mt-4 text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Portfolio Summary
                </h2>
                <button
                  onClick={handleFetchPrices}
                  disabled={fetchingPrices}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all duration-200 shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${fetchingPrices ? 'animate-spin' : ''}`} />
                  {fetchingPrices ? `Fetching... ${fetchProgress}%` : 'Refresh Current Prices'}
                </button>
              </div>
              <Dashboard summary={summary} />
            </section>

            {/* Harvesting Opportunities */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center text-primary-800">
                <DollarSign className="w-5 h-5 mr-2" />
                Tax Loss Harvesting Opportunities
              </h2>
              <div className="bg-primary-50 p-4 rounded-lg mb-4 border border-primary-100">
                <p className="text-sm text-primary-800">
                  Select positions below to simulate harvesting losses. The "Net Gain If Harvested" in the summary will update.
                  <br />
                  <strong>Current Selection Impact: </strong>
                  <span className={summary.netGainIfHarvested.minus(summary.totalRealizedGain).isNegative() ? 'text-primary-700 font-bold' : 'text-gray-700'}>
                    {formatCurrency(summary.netGainIfHarvested.minus(summary.totalRealizedGain))}
                  </span>
                </p>
              </div>
              <HarvestingTable
                opportunities={opportunities}
                onToggleSale={toggleHarvest}
                onToggleAll={toggleAllHarvest}
                selectedTickers={selectedHarvestTickers}
              />
            </section>

            {/* Balancing Opportunities */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center text-green-800">
                <TrendingUp className="w-5 h-5 mr-2" />
                Stock Balancing Opportunities
              </h2>
              <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-100">
                <p className="text-sm text-green-800">
                  Select positions with gains to offset losses or rebalance your portfolio. The "Net Gain If Harvested" summary includes these gains.
                </p>
              </div>
              <BalancingTable
                opportunities={balancingOpportunities}
                onToggleSale={toggleBalancing}
                onToggleAll={toggleAllBalancing}
                selectedTickers={selectedBalancingTickers}
              />
            </section>

            {/* Current Holdings */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Current Holdings
              </h2>
              <HoldingsTable positions={Object.values(positions)} />
            </section>

            <div className="flex justify-end">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reset / Upload New File
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PortfolioDashboard />} />
        <Route path="/debug" element={<PortfolioDashboard initialData={DEBUG_TRANSACTIONS} />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
