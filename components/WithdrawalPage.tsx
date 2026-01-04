
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../App';
import { LoggerService } from '../services/logger';
import { LogCategory } from '../types';

interface WithdrawalPageProps {
  balance: number;
  onWithdraw: (tx: Transaction) => void;
  history: Transaction[];
}

interface WhitelistedAddress {
  id: string;
  label: string;
  address: string;
  type: string;
  addedAt: number;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  type?: string;
  isWhitelisted: boolean;
  errorType?: 'format' | 'whitelist' | 'limit';
  severity: 'none' | 'success' | 'warning' | 'error';
}

const DAILY_LIMIT = 5000.00;
const TRANSACTION_LIMIT = 2000.00;

const WithdrawalPage: React.FC<WithdrawalPageProps> = ({ balance, onWithdraw, history }) => {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<WhitelistedAddress[]>(() => {
    const saved = localStorage.getItem('cloudmine_whitelist');
    return saved ? JSON.parse(saved) : [
      { id: '1', label: 'Primary Cold Storage', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', type: 'BTC', addedAt: Date.now() - 1000000 },
      { id: '2', label: 'MetaMask Vault', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', type: 'ETH', addedAt: Date.now() - 500000 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('cloudmine_whitelist', JSON.stringify(whitelistedAddresses));
  }, [whitelistedAddresses]);

  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeLoading, setIsCodeLoading] = useState(false);

  const dailyUsage = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return history
      .filter(tx => tx.timestamp > oneDayAgo && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [history]);

  const platformFeeRate = 0.05;
  const parsedAmount = parseFloat(amount) || 0;
  const fee = parsedAmount * platformFeeRate;
  const netAmount = parsedAmount - fee;
  const remainingDailyLimit = Math.max(0, DAILY_LIMIT - dailyUsage);

  const validation: ValidationResult = useMemo(() => {
    const addr = walletAddress.trim();
    if (!addr) return { isValid: false, message: 'Neural validation standby: Enter destination hash.', isWhitelisted: false, severity: 'none' };

    const isWhitelisted = whitelistedAddresses.some(w => w.address.toLowerCase() === addr.toLowerCase());
    
    // Amount limits check
    if (parsedAmount > 0) {
      if (parsedAmount > TRANSACTION_LIMIT) return { isValid: false, message: `Limit violation. Max payload: $${TRANSACTION_LIMIT}`, isWhitelisted, errorType: 'limit', severity: 'error' };
      if (dailyUsage + parsedAmount > DAILY_LIMIT) return { isValid: false, message: `Lattice limit reached. Remaining capacity: $${remainingDailyLimit.toFixed(2)}`, isWhitelisted, errorType: 'limit', severity: 'error' };
    }

    let type = '';
    let isValidFormat = false;

    // Ethereum Regex
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      isValidFormat = true;
      type = 'ETH';
    } 
    // Bitcoin Bech32 (SegWit) - bc1...
    else if (/^bc1[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr)) {
      isValidFormat = true;
      type = 'BTC (SegWit)';
    }
    // Bitcoin Legacy/P2SH - Starts with 1 or 3
    else if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addr)) {
      isValidFormat = true;
      type = 'BTC (Legacy)';
    }
    // Solana Base58
    else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
      isValidFormat = true;
      type = 'SOL';
    }

    if (!isValidFormat) {
      return { 
        isValid: false, 
        message: 'Invalid hash format. Protocol rejected.', 
        isWhitelisted: false, 
        errorType: 'format', 
        severity: 'error' 
      };
    }

    if (!isWhitelisted) {
      return { 
        isValid: true, 
        message: `${type} detected, but NOT in your whitelist.`, 
        type, 
        isWhitelisted: false, 
        errorType: 'whitelist', 
        severity: 'warning' 
      };
    }

    return { 
      isValid: true, 
      message: `Neural Link Verified: ${type} destination active.`, 
      type, 
      isWhitelisted: true, 
      severity: 'success' 
    };
  }, [walletAddress, whitelistedAddresses, parsedAmount, dailyUsage, remainingDailyLimit]);

  const isInvalid = parsedAmount <= 0 || parsedAmount > balance || !validation.isValid || !validation.isWhitelisted;

  const handleInitiateWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;
    LoggerService.log(LogCategory.FINANCIAL, "Withdrawal process initiated", { amount: parsedAmount, address: walletAddress });
    setShowConfirmModal(true);
  };

  const handleConfirmWithdraw = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    setStatusMessage("Verifying Security Handshake...");
    await new Promise(r => setTimeout(r, 1200));
    setStatusMessage(`Validating ${validation.type} Whitelist Integrity...`);
    await new Promise(r => setTimeout(r, 1000));
    setStatusMessage("Broadcasting Transaction to Neural Lattice...");
    await new Promise(r => setTimeout(r, 1500));
    
    const tx: Transaction = {
      id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: Date.now(),
      amount: parsedAmount,
      netAmount: netAmount,
      address: walletAddress,
      status: 'confirmed'
    };

    onWithdraw(tx);
    setIsProcessing(false);
    setIsSuccess(true);
    setAmount('');
    setWalletAddress('');
    setStatusMessage(null);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  const startWhitelistVerification = async () => {
    if (!newAddress || !newLabel) return;
    setIsVerifying(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsVerifying(false);
    setShowVerificationStep(true);
    LoggerService.log(LogCategory.SECURITY, "Whitelist authorization challenge issued", { address: newAddress, label: newLabel });
  };

  const handleFinalizeWhitelist = async () => {
    if (verificationCode.length !== 6) return;
    setIsCodeLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    
    const addr = newAddress.trim();
    let type = 'UNKNOWN';
    if (addr.startsWith('0x')) type = 'ETH';
    else if (addr.startsWith('bc1') || /^[13]/.test(addr)) type = 'BTC';
    else if (addr.length >= 32 && addr.length <= 44) type = 'SOL';

    const newEntry: WhitelistedAddress = {
      id: Math.random().toString(36).substr(2, 9),
      label: newLabel,
      address: addr,
      type: type,
      addedAt: Date.now()
    };

    setWhitelistedAddresses(prev => [...prev, newEntry]);
    LoggerService.log(LogCategory.SECURITY, "New destination hash whitelisted", { label: newLabel, address: addr, type });
    setIsCodeLoading(false);
    setShowWhitelistModal(false);
    setShowVerificationStep(false);
    setVerificationCode('');
    setNewLabel('');
    setNewAddress('');
  };

  const removeWhitelistedAddress = (id: string) => {
    const addr = whitelistedAddresses.find(w => w.id === id);
    setWhitelistedAddresses(prev => prev.filter(w => w.id !== id));
    LoggerService.log(LogCategory.SECURITY, "Destination hash removed from whitelist", { label: addr?.label, address: addr?.address });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent uppercase tracking-tighter">Profit Extraction Core</h1>
        <p className="text-gray-400 font-medium">Securely decommission funds from the cloud grid to your whitelisted private ledgers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
            {isProcessing && (
              <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md z-10 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                   <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full"></div>
                   <div className="w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
                <p className="text-white font-mono text-sm tracking-widest animate-pulse uppercase font-black">{statusMessage}</p>
              </div>
            )}
            
            <form onSubmit={handleInitiateWithdraw} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Extraction Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-bold">$</span>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      className={`w-full bg-gray-950 border rounded-2xl pl-10 pr-4 py-4 focus:outline-none focus:ring-2 text-xl font-bold text-white transition-all placeholder-gray-800 ${validation.errorType === 'limit' ? 'border-red-500/50 focus:ring-red-500' : 'border-gray-800 focus:ring-indigo-500'}`} 
                    />
                  </div>
                  <div className="mt-2 flex justify-between px-1">
                    <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Available: ${balance.toLocaleString()}</span>
                    <button type="button" onClick={() => setAmount(balance.toString())} className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-400">Max Out</button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Whitelisted Destination</label>
                  <div className="relative group/input">
                    <input 
                      type="text" 
                      list="whitelisted-options" 
                      value={walletAddress} 
                      onChange={(e) => setWalletAddress(e.target.value)} 
                      placeholder="Select or paste whitelisted hash..." 
                      className={`w-full bg-gray-950 border rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 font-mono text-xs text-white transition-all placeholder-gray-800 h-[60px] ${
                        !walletAddress 
                        ? 'border-gray-800 focus:ring-indigo-500' 
                        : validation.severity === 'error' 
                        ? 'border-red-500/50 focus:ring-red-500' 
                        : validation.severity === 'warning'
                        ? 'border-yellow-500/50 focus:ring-yellow-500'
                        : 'border-green-500/50 focus:ring-green-500'
                      }`} 
                    />
                    <datalist id="whitelisted-options">
                      {whitelistedAddresses.map(w => (<option key={w.id} value={w.address}>{w.label} ({w.type})</option>))}
                    </datalist>
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                      {walletAddress && (
                        <div className={`p-1 rounded-full ${
                          validation.severity === 'success' ? 'text-green-500' :
                          validation.severity === 'warning' ? 'text-yellow-500' :
                          validation.severity === 'error' ? 'text-red-500' : 'text-gray-700'
                        }`}>
                          {validation.severity === 'success' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          ) : validation.severity === 'warning' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 px-1">
                     <div className={`w-1 h-1 rounded-full ${
                       validation.severity === 'success' ? 'bg-green-500 animate-pulse' :
                       validation.severity === 'warning' ? 'bg-yellow-500 animate-pulse' :
                       validation.severity === 'error' ? 'bg-red-500 animate-pulse' : 'bg-gray-700'
                     }`}></div>
                     <p className={`text-[10px] font-black uppercase tracking-widest ${
                       validation.severity === 'success' ? 'text-green-500' :
                       validation.severity === 'warning' ? 'text-yellow-500' :
                       validation.severity === 'error' ? 'text-red-500' : 'text-gray-600'
                     }`}>
                       {validation.message}
                     </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800 space-y-6 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 transition-all duration-500 group-hover:w-2"></div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Gross Liquidation</span>
                    <span className="text-white font-mono font-black">${parsedAmount.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Neural Processing Fee (5%)</span>
                    <span className="text-gray-500 font-mono font-bold">-${fee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-2xl border-t border-gray-800/50 pt-6">
                    <span className="text-white font-black uppercase tracking-tighter italic text-base">Net Extraction Payload</span>
                    <span className="text-green-400 font-black font-mono tracking-tighter">${netAmount > 0 ? netAmount.toFixed(2) : '0.00'}</span>
                 </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing || isInvalid} 
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 ${isInvalid || isProcessing ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'}`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing Lattice Handshake...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    <span>Execute Global Extraction</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden border border-gray-800">
            <div className="p-6 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Extraction History</h3>
              <span className="text-[10px] font-mono text-gray-600 uppercase">Live_Neural_Ledger</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-gray-950/50">
                  <tr>
                    <th className="px-6 py-4">Trace Ref</th>
                    <th className="px-6 py-4">Destination Hash</th>
                    <th className="px-6 py-4">Net Payload</th>
                    <th className="px-6 py-4 text-right">Ledger Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {history.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-600 font-black uppercase tracking-widest text-[10px]">No transaction traces archived.</td></tr>
                  ) : (
                    history.map((tx) => (
                      <tr key={tx.id} className="hover:bg-indigo-600/5 transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-indigo-400 font-black">{tx.id}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors">
                            {tx.address.substring(0, 16)}...{tx.address.substring(tx.address.length - 8)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-white font-black">${tx.netAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[9px] font-black uppercase bg-green-500/10 text-green-400 px-2.5 py-1 rounded-lg border border-green-500/20 shadow-sm">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500 mb-6 flex items-center">Grid Safety Limits</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-2">
                  <span className="text-gray-500 font-black uppercase tracking-widest">24H Lattice Capacity</span>
                  <span className="text-white font-mono font-black">${dailyUsage.toFixed(0)} / $${DAILY_LIMIT.toFixed(0)}</span>
                </div>
                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden shadow-inner border border-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${dailyUsage > DAILY_LIMIT * 0.8 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]'}`} 
                    style={{ width: `${Math.min(100, (dailyUsage / DAILY_LIMIT) * 100)}%` }} 
                  />
                </div>
                <p className="mt-3 text-[9px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">System resets automatically every 24H cycle. Use whitelisted cold-storage for large payload extraction.</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-indigo-500/20 bg-indigo-600/5 relative group overflow-hidden shadow-2xl">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center justify-between">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-2.5 shadow-[0_0_10px_#6366f1] animate-pulse"></span>
                Whitelist Grid
              </span>
              <button onClick={() => setShowWhitelistModal(true)} className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all border border-indigo-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              </button>
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 pr-1">
              {whitelistedAddresses.map(addr => (
                <div key={addr.id} className="p-4 bg-gray-950 border border-gray-800 rounded-2xl flex flex-col space-y-3 group/item hover:border-indigo-500/40 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-tighter italic">{addr.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black bg-indigo-600/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">{addr.type}</span>
                        <span className="text-[8px] text-gray-600 font-mono">ID: {addr.id}</span>
                      </div>
                    </div>
                    <button onClick={() => removeWhitelistedAddress(addr.id)} className="text-gray-700 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 relative overflow-hidden group/hash">
                    <p className="text-[9px] font-mono text-gray-500 break-all leading-relaxed relative z-10 group-hover/hash:text-indigo-300 transition-colors">{addr.address}</p>
                    <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-black/80 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowWhitelistModal(true)} className="w-full py-5 border border-dashed border-gray-800 rounded-2xl text-[10px] font-black uppercase text-gray-600 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-600/5 transition-all flex items-center justify-center space-x-3 group">
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                <span>Provision New Vault Hash</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showWhitelistModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-xl animate-in fade-in" onClick={() => !isVerifying && !isCodeLoading && setShowWhitelistModal(false)}></div>
          <div className="relative w-full max-w-md glass-card rounded-[2.5rem] p-10 border border-indigo-500/50 shadow-[0_0_80px_rgba(99,102,241,0.2)] animate-in zoom-in-95">
            {!showVerificationStep ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/30 mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Lattice Whitelist</h2>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Authorized destination provisioning</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Lattice Label</label>
                    <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Primary Cold Storage" className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Hardware Hash (BTC/ETH/SOL)</label>
                    <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Paste address hash..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono text-white transition-all shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setShowWhitelistModal(false)} className="py-4 px-6 bg-gray-900 text-gray-500 font-black text-[10px] uppercase rounded-2xl border border-gray-800 hover:bg-gray-800 transition-all">Abort</button>
                    <button disabled={!newAddress || !newLabel} onClick={startWhitelistVerification} className="py-4 px-6 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 disabled:opacity-30">Verify Link</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/30 mx-auto mb-4">
                    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Auth Challenge</h2>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">2FA confirmation required</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <input 
                      type="text" 
                      maxLength={6} 
                      value={verificationCode} 
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                      placeholder="XXXXXX" 
                      className="w-full bg-gray-950 border border-indigo-500/50 rounded-2xl px-6 py-6 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-3xl font-black tracking-[0.5em] text-white transition-all shadow-inner" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button disabled={isCodeLoading} onClick={() => setShowVerificationStep(false)} className="py-4 px-6 bg-gray-900 text-gray-500 font-black text-[10px] uppercase rounded-2xl border border-gray-800">Back</button>
                    <button disabled={isCodeLoading || verificationCode.length !== 6} onClick={handleFinalizeWhitelist} className="py-4 px-6 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/30">Provision</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/95 backdrop-blur-3xl animate-in fade-in" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative w-full max-w-lg glass-card rounded-[2.5rem] p-10 border border-indigo-500/50 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-10">
               <div className="w-20 h-20 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center border border-indigo-500/30 mx-auto mb-6 shadow-2xl">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Execute Payload</h2>
               <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] mt-3">Final Grid Authorization Required</p>
            </div>
            
            <div className="space-y-4 bg-gray-950/80 p-8 rounded-[2rem] border border-white/5 shadow-inner">
              <div className="flex justify-between items-center text-sm border-b border-gray-800/50 pb-5">
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px]">Target Hash</span>
                <span className="text-white font-mono text-[10px] break-all w-48 text-right font-black">{walletAddress}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-5">
                <span className="text-gray-500 font-black uppercase tracking-widest text-[9px]">Extraction Chain</span>
                <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">{validation.type}</span>
              </div>
              <div className="flex justify-between items-center text-3xl pt-8 mt-4 border-t border-gray-800">
                <span className="text-white font-black uppercase tracking-tighter italic text-xs">Net Payload</span>
                <span className="text-green-400 font-black font-mono tracking-tighter animate-pulse">${netAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-10">
              <button onClick={() => setShowConfirmModal(false)} className="py-5 px-6 bg-gray-900 text-gray-500 font-black text-[11px] uppercase rounded-[1.5rem] border border-gray-800 hover:bg-gray-800 transition-all">Cancel Trace</button>
              <button onClick={handleConfirmWithdraw} className="py-5 px-6 bg-green-600 text-white font-black text-[11px] uppercase rounded-[1.5rem] hover:bg-green-500 shadow-2xl shadow-green-600/30 active:scale-95 flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                <span>Authorize Execution</span>
              </button>
            </div>
            <p className="text-[8px] text-gray-700 text-center mt-6 font-mono uppercase tracking-widest">Signed_via_Lattice_Auth: {new Date().toISOString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalPage;
