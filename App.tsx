
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, MiningBot, LogCategory } from './types';
import Dashboard from './components/Dashboard';
import MiningConsole from './components/MiningConsole';
import AICommandCenter from './components/AICommandCenter';
import MarketResearch from './components/MarketResearch';
import AlgorithmLab from './components/AlgorithmLab';
import WithdrawalPage from './components/WithdrawalPage';
import Sidebar from './components/Sidebar';
import AuditLogView from './components/AuditLogView';
import StripeCheckout from './components/StripeCheckout';
import DiagnosticsView from './components/DiagnosticsView';
import DataChainExplorer from './components/DataChainExplorer';
import { LoggerService } from './services/logger';
import { AuthService } from './services/auth';

export interface Transaction {
  id: string;
  timestamp: number;
  amount: number;
  netAmount: number;
  address: string;
  status: 'confirmed' | 'pending' | 'failed';
}

const INITIAL_BOTS: MiningBot[] = [
  { id: '1', name: 'Alpha-X-7', status: 'active', hashrate: 125.5, efficiency: 0.99, temp: 54, profit24h: 32.8, balance: 412.50, algorithm: 'Ethash' },
  { id: '2', name: 'HyperNode-Prime', status: 'active', hashrate: 32.1, efficiency: 0.94, temp: 58, profit24h: 8.2, balance: 89.20, algorithm: 'SHA-256' },
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [globalBalance, setGlobalBalance] = useState<number>(5420.55);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBots, setActiveBots] = useState<MiningBot[]>(INITIAL_BOTS);

  // Stripe Checkout State
  const [checkoutData, setCheckoutData] = useState<{ amount: number; item: string } | null>(null);

  const performInitialAuthCheck = useCallback(async () => {
    const hasKey = await AuthService.checkApiKeyStatus();
    setApiKeySelected(hasKey);
    setIsCheckingKey(false);
  }, []);

  useEffect(() => {
    performInitialAuthCheck();
    
    const handleAuthReset = () => {
      setApiKeySelected(false);
      AuthService.handleAuthReset();
    };

    window.addEventListener('gemini-auth-reset', handleAuthReset);
    return () => window.removeEventListener('gemini-auth-reset', handleAuthReset);
  }, [performInitialAuthCheck]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectKey = async () => {
    const success = await AuthService.selectApiKey();
    if (success) {
      setApiKeySelected(true);
    }
  };

  const handleDepositSuccess = (amount: number) => {
    setGlobalBalance(prev => prev + amount);
    setCheckoutData(null);
    const tx: Transaction = {
      id: `DEP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      amount: amount,
      netAmount: amount,
      timestamp: Date.now(),
      address: 'EXTERNAL_STRIPE_INGRESS',
      status: 'confirmed'
    };
    setTransactions(prev => [tx, ...prev]);
    LoggerService.log(LogCategory.FINANCIAL, "Deposit synchronized via Stripe", { amount, txId: tx.id });
  };

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    setGlobalBalance(prev => prev - tx.amount);
    LoggerService.log(LogCategory.FINANCIAL, "Extraction transaction finalized", { txId: tx.id, amount: tx.amount, address: tx.address });
  };

  const handlePurchaseBot = (bot: MiningBot, price: number) => {
    if (globalBalance >= price) {
      setGlobalBalance(prev => prev - price);
      setActiveBots(prev => [...prev, bot]);
      const tx: Transaction = {
        id: `PURCHASE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        amount: price,
        netAmount: price,
        timestamp: Date.now(),
        address: 'INTERNAL_LATTICE_PROVISION',
        status: 'confirmed'
      };
      setTransactions(prev => [tx, ...prev]);
      LoggerService.log(LogCategory.FINANCIAL, "Cloud node provisioned", { botName: bot.name, price, botId: bot.id });
      return true;
    } else {
      setCheckoutData({ amount: price - globalBalance + 100, item: `Balance Top-up for ${bot.name}` });
      return false;
    }
  };

  const handleViewChange = (view: AppView) => {
    setActiveView(view);
    LoggerService.log(LogCategory.SYSTEM, "User changed view", { from: activeView, to: view });
  };

  if (isCheckingKey) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-medium tracking-widest uppercase">Initializing Neural Core...</p>
        </div>
      </div>
    );
  }

  if (!apiKeySelected) {
    return (
      <div className="h-screen w-full flex items-center justify-center gradient-bg p-6 text-white">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Gemini Pro Required</h1>
          <p className="text-gray-400 mb-8 text-sm">
            To access high-fidelity crypto analysis, thinking modes, and image generation, you must connect a paid Google Cloud project.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all neon-border transform hover:scale-105 active:scale-95"
          >
            Select API Key
          </button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block mt-4 text-xs text-indigo-400 hover:underline">How to set up billing?</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden text-white relative">
      <Sidebar activeView={activeView} setActiveView={handleViewChange} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto relative p-6 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="lg:hidden flex items-center justify-between mb-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-indigo-400 hover:bg-gray-800 transition-all active:scale-95 shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Neural Status</p>
              <p className="text-xs font-bold text-green-500">Node_Alpha_Online</p>
            </div>
          </div>

          {activeView === AppView.DASHBOARD && <Dashboard globalBalance={globalBalance} bots={activeBots} onOpenDeposit={() => setCheckoutData({ amount: 500, item: "Manual Balance Recharge" })} />}
          {activeView === AppView.MINING_BOTS && <MiningConsole bots={activeBots} setBots={setActiveBots} onPurchase={handlePurchaseBot} balance={globalBalance} onOpenDeposit={() => setCheckoutData({ amount: 1000, item: "Marketplace Deposit" })} />}
          {activeView === AppView.AI_COMMAND && <AICommandCenter />}
          {activeView === AppView.MARKET_RESEARCH && <MarketResearch />}
          {activeView === AppView.ALGORITHMS && <AlgorithmLab />}
          {activeView === AppView.DATA_CHAINS && <DataChainExplorer />}
          {activeView === AppView.WITHDRAW && <WithdrawalPage balance={globalBalance} onWithdraw={addTransaction} history={transactions} />}
          {activeView === AppView.AUDIT_LOG && <AuditLogView />}
          {activeView === AppView.DIAGNOSTICS && <DiagnosticsView bots={activeBots} setBots={setActiveBots} />}
          {activeView === AppView.SETTINGS && (
            <div className="glass-card p-8 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4">Neural Config</h2>
              <p className="text-gray-400">Manage your cloud infrastructure and AI parameters here.</p>
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-200">GCP Project Connection</span>
                    <span className="text-xs text-green-500 font-bold uppercase mt-1">Status: Linked</span>
                  </div>
                  <button onClick={handleSelectKey} className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-sm font-bold">Change Key</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {checkoutData && (
        <StripeCheckout 
          amount={checkoutData.amount} 
          itemName={checkoutData.item}
          onSuccess={handleDepositSuccess} 
          onCancel={() => setCheckoutData(null)} 
        />
      )}
    </div>
  );
};

export default App;
