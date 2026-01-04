
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { MiningBot, LogCategory } from '../types';
import { LoggerService } from '../services/logger';

const MINING_ALGORITHMS = ['SHA-256', 'Ethash', 'KawPow', 'Scrypt', 'Etchash', 'Autolykos2'];

const ALGO_MULTIPLIERS: Record<string, number> = {
  'SHA-256': 1.2,
  'Ethash': 1.0,
  'KawPow': 0.6,
  'Scrypt': 0.8,
  'Etchash': 0.95,
  'Autolykos2': 1.1
};

interface BotTier {
  tierId: string;
  name: string;
  basePrice: number;
  hashrate: number;
  efficiency: number;
  description: string;
  icon: string;
  color: string;
  colorClass: string;
}

const BOT_TIERS: BotTier[] = [
  {
    tierId: 'starter',
    name: 'Cloud Node-S',
    basePrice: 249.99,
    hashrate: 45.0,
    efficiency: 0.85,
    description: 'Entry-level cloud node. Optimized for low-cap altcoins and low power footprint.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: 'emerald',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5'
  },
  {
    tierId: 'pro',
    name: 'Neural Cluster V4',
    basePrice: 899.50,
    hashrate: 185.0,
    efficiency: 0.93,
    description: 'Advanced compute cluster with neural block predictive branching.',
    icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    color: 'indigo',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5'
  },
  {
    tierId: 'enterprise',
    name: 'Enterprise Lattice',
    basePrice: 2450.00,
    hashrate: 720.5,
    efficiency: 0.97,
    description: 'High-density hash farm. Maximum yield for established SHA-256 networks.',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    color: 'purple',
    colorClass: 'border-purple-500/30 bg-purple-500/5'
  },
  {
    tierId: 'apex',
    name: 'Neural Apex (Autonomous)',
    basePrice: 7999.00,
    hashrate: 2800.0,
    efficiency: 0.995,
    description: 'Cutting-edge AI ASIC farm. Autonomous hashrate routing between 40+ chains.',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    color: 'red',
    colorClass: 'border-red-500/30 bg-red-500/5'
  }
];

interface MiningConsoleProps {
  bots: MiningBot[];
  setBots: React.Dispatch<React.SetStateAction<MiningBot[]>>;
  onPurchase: (bot: MiningBot, price: number) => boolean;
  balance: number;
  onOpenDeposit?: () => void;
}

const MiningConsole: React.FC<MiningConsoleProps> = ({ bots, setBots, onPurchase, balance, onOpenDeposit }) => {
  const [tuningBot, setTuningBot] = useState<MiningBot | null>(null);
  const [algoSwitchTarget, setAlgoSwitchTarget] = useState<{ botId: string; nextAlgo: string } | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const calculateProjectedValue = (hashrate: number, efficiency: number, variance = 1) => {
    const baseFactor = 0.25; 
    return hashrate * efficiency * baseFactor * variance;
  };

  const projectionTrend = useMemo(() => {
    if (!tuningBot) return [];
    const data = [];
    const currentBase = calculateProjectedValue(tuningBot.hashrate, tuningBot.efficiency);
    for (let i = 0; i < 20; i++) {
      const seed = i * 0.5;
      const variance = 0.95 + (Math.sin(seed) * 0.05);
      data.push({ time: `${i}m`, profit: parseFloat((currentBase * variance).toFixed(2)) });
    }
    return data;
  }, [tuningBot?.hashrate, tuningBot?.efficiency]);

  const handleConfirmAlgoSwitch = () => {
    if (!algoSwitchTarget) return;
    const { botId, nextAlgo } = algoSwitchTarget;
    
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        LoggerService.log(LogCategory.OPERATION, "Bot algorithm reconfigured", { botId: bot.id, botName: bot.name, oldAlgo: bot.algorithm, newAlgo: nextAlgo });
        const currentMult = ALGO_MULTIPLIERS[bot.algorithm] || 1;
        const nextMult = ALGO_MULTIPLIERS[nextAlgo] || 1;
        return { 
          ...bot, 
          algorithm: nextAlgo,
          hashrate: bot.hashrate * (nextMult / currentMult)
        };
      }
      return bot;
    }));
    setAlgoSwitchTarget(null);
  };

  const toggleAutoPilot = (botId: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === botId) {
        const nextState = !bot.isAutoPilot;
        LoggerService.log(LogCategory.OPERATION, `Neural Autopilot ${nextState ? 'engaged' : 'disengaged'}`, { botId, botName: bot.name });
        return { ...bot, isAutoPilot: nextState };
      }
      return bot;
    }));
  };

  const updateBotPerformance = (id: string, updates: Partial<MiningBot>) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === id) {
        LoggerService.log(LogCategory.OPERATION, "Bot manual performance tuning", { botId: id, updates });
        return { ...bot, ...updates };
      }
      return bot;
    }));
    if (tuningBot?.id === id) {
      setTuningBot(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const toggleStatus = (id: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === id) {
        const isCurrentlyActive = bot.status === 'active';
        LoggerService.log(LogCategory.OPERATION, `Bot status toggled: ${isCurrentlyActive ? 'PAUSED' : 'ACTIVE'}`, { botId: id, botName: bot.name });
        return { 
          ...bot, 
          status: isCurrentlyActive ? 'paused' : 'active',
          hashrate: isCurrentlyActive ? 0 : Math.random() * 40 + 20
        };
      }
      return bot;
    }));
  };

  const handleBuyBot = (tier: BotTier) => {
    const newBot: MiningBot = {
      id: `BOT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name: tier.name,
      status: 'active',
      hashrate: tier.hashrate,
      efficiency: tier.efficiency,
      temp: 42,
      profit24h: calculateProjectedValue(tier.hashrate, tier.efficiency),
      balance: 0,
      algorithm: 'Ethash',
      isAutoPilot: false
    };

    if (onPurchase(newBot, tier.basePrice)) {
      setPurchaseSuccess(tier.name);
      setTimeout(() => setPurchaseSuccess(null), 3000);
    } else {
      LoggerService.log(LogCategory.SECURITY, "Insufficient balance for provision attempt", { tierId: tier.tierId, balance });
      // Redirect to deposit is handled by parent if it returns false
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Active Cloud Nodes</h1>
          <p className="text-gray-400 font-medium">Monitoring distributed cloud compute in real-time.</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Balance</span>
            <span className="text-lg font-black text-white font-mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <button 
            onClick={onOpenDeposit}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Deposit
          </button>
        </div>
      </div>
      {purchaseSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-green-400 font-bold text-xs uppercase tracking-widest animate-in slide-in-from-top-4 duration-300">
          Cloud Handshake Confirmed: {purchaseSuccess} deployed.
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {bots.length === 0 ? (
          <div className="glass-card p-20 rounded-3xl text-center border-dashed border-2 border-gray-800">
            <p className="text-gray-600 font-bold italic">No cloud nodes detected. Provision hardware below.</p>
          </div>
        ) : (
          bots.map((bot) => {
            const isAlpha = bot.id === '1';
            return (
              <div key={bot.id} className={`glass-card p-6 rounded-2xl flex flex-wrap items-center justify-between gap-6 transition-all group overflow-hidden relative ${isAlpha ? 'border-indigo-500/40 bg-indigo-950/10' : ''}`}>
                <div className="flex items-center space-x-4 min-w-[220px]">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${bot.status === 'active' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-gray-800 text-gray-600'}`}>
                    <svg className={`w-8 h-8 ${bot.isAutoPilot ? 'animate-spin [animation-duration:10s]' : (isAlpha ? 'animate-pulse' : '')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                  </div>
                  <div>
                    <h4 className={`font-black text-xl tracking-tighter text-white ${isAlpha ? 'text-indigo-400' : ''}`}>{bot.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <button onClick={() => {
                        const currentIndex = MINING_ALGORITHMS.indexOf(bot.algorithm);
                        const nextAlgo = MINING_ALGORITHMS[(currentIndex + 1) % MINING_ALGORITHMS.length];
                        setAlgoSwitchTarget({ botId: bot.id, nextAlgo });
                      }} className="text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-all">{bot.algorithm}</button>
                      <span className="text-[9px] uppercase tracking-widest font-black text-gray-500">{bot.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-grow items-center justify-around px-4 gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Compute</p>
                    <p className="font-mono text-2xl font-black text-white">{bot.hashrate.toFixed(1)} <span className="text-xs">MH/s</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-600 font-black uppercase mb-1">Status</p>
                    <div className="flex items-center gap-2 justify-center">
                       {bot.isAutoPilot && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>}
                       <p className={`font-mono text-xs font-black ${bot.isAutoPilot ? 'text-indigo-400' : 'text-gray-500 uppercase'}`}>{bot.isAutoPilot ? 'Auto-Pilot On' : 'Manual Control'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => toggleAutoPilot(bot.id)} className={`p-3 rounded-xl border transition-all active:scale-95 ${bot.isAutoPilot ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-900 border-gray-800 text-indigo-400 hover:border-indigo-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
                  <button onClick={() => setTuningBot(bot)} className="p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-500 text-indigo-400 transition-all active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></button>
                  <button onClick={() => toggleStatus(bot.id)} className={`p-3 rounded-xl border transition-all active:scale-95 ${bot.status === 'active' ? 'bg-yellow-600/10 border-yellow-600/40 text-yellow-500 hover:bg-yellow-600 hover:text-white' : 'bg-green-600/10 border-green-600/40 text-green-500 hover:bg-green-600 hover:text-white'}`}>{bot.status === 'active' ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>)}</button>
                </div>
              </div>
            );
          })}
        </div>
        <section className="pt-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30"><svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Cloud Marketplace</h2>
              <p className="text-gray-500 text-sm font-medium">Provision institutional-grade cloud hashing hardware instantly.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BOT_TIERS.map((tier) => (
              <div key={tier.tierId} className={`flex flex-col glass-card rounded-3xl border ${tier.colorClass} overflow-hidden group hover:scale-[1.02] transition-all relative p-8 shadow-2xl`}>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-${tier.color}-500/50 transition-colors`}><svg className={`w-8 h-8 text-${tier.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tier.icon} /></svg></div>
                    <div className="text-right">
                       <span className="text-[9px] font-black uppercase text-gray-500 block tracking-widest mb-1">Provision Cost</span>
                       <span className="text-xl font-black text-white font-mono">${tier.basePrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{tier.name}</h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8 flex-1">{tier.description}</p>
                  <div className="space-y-4 mb-8 bg-black/30 p-4 rounded-2xl border border-white/5">
                     <div className="flex justify-between items-end">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Hashrate Cap</span>
                        <span className="font-mono text-sm text-white font-bold">{tier.hashrate} MH/s</span>
                     </div>
                     <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                        <div className={`h-full bg-${tier.color}-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ width: `${Math.min(100, (tier.hashrate / 2800) * 100)}%` }}></div>
                     </div>
                  </div>
                  <button onClick={() => handleBuyBot(tier)} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center space-x-2 ${balance >= tier.basePrice ? `bg-${tier.color}-600 hover:bg-${tier.color}-500 text-white shadow-xl shadow-${tier.color}-600/20` : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                    <span>{balance >= tier.basePrice ? 'Authorize Provision' : 'Insufficient Bal: Pay with Stripe'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      {tuningBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTuningBot(null)}></div>
          <div className="relative w-full max-w-2xl glass-card rounded-3xl p-8 border border-indigo-500/30 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Bot Tuning: {tuningBot.name}</h3>
              <button onClick={() => setTuningBot(null)} className="text-gray-500 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><label className="text-xs font-black uppercase tracking-widest text-gray-400">Target Hashrate</label><span className="font-mono text-indigo-400 font-bold">{tuningBot.hashrate.toFixed(1)} MH/s</span></div>
                  <input type="range" min="10" max="5000" step="0.5" value={tuningBot.hashrate} onChange={(e) => updateBotPerformance(tuningBot.id, { hashrate: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><label className="text-xs font-black uppercase tracking-widest text-gray-400">Core Efficiency</label><span className="font-mono text-green-400 font-bold">{(tuningBot.efficiency * 100).toFixed(0)}%</span></div>
                  <input type="range" min="0.5" max="1.0" step="0.01" value={tuningBot.efficiency} onChange={(e) => updateBotPerformance(tuningBot.id, { efficiency: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                </div>
                <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Daily Yield Projection</span><p className="text-4xl font-black text-white font-mono tracking-tighter">${calculateProjectedValue(tuningBot.hashrate, tuningBot.efficiency).toFixed(2)}</p></div>
              </div>
              <div className="bg-gray-950/50 rounded-2xl border border-gray-800 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4"><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>Live Projection (1h)</h4></div>
                <div className="flex-1 min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionTrend}>
                      <defs><linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="time" hide /><YAxis hide domain={['auto', 'auto']} /><Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} itemStyle={{ color: '#818cf8', fontSize: '12px' }} labelStyle={{ display: 'none' }} /><Area type="monotone" dataKey="profit" stroke="#6366f1" fill="url(#projGrad)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div></div>
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-800"><button onClick={() => setTuningBot(null)} className="py-3 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 col-span-2">Sync Tuning Data</button></div></div></div>
      )}
      {algoSwitchTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setAlgoSwitchTarget(null)}></div>
          <div className="relative w-full max-md glass-card rounded-3xl p-8 border border-indigo-500/50 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Protocol Shift Initiation</h3>
            <p className="text-xs text-gray-400 mb-6">Reconfiguring {bots.find(b => b.id === algoSwitchTarget.botId)?.name} core logic.</p>
            <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800 mb-6 space-y-4">
              <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-gray-500">Current Chain</span><span className="text-sm font-bold text-gray-300">{bots.find(b => b.id === algoSwitchTarget.botId)?.algorithm}</span></div>
              <div className="flex justify-center"><svg className="w-5 h-5 text-indigo-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>
              <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-indigo-400">Target Chain</span><span className="text-sm font-bold text-indigo-400">{algoSwitchTarget.nextAlgo}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAlgoSwitchTarget(null)} className="py-3 px-4 bg-gray-800 text-gray-400 font-black text-[10px] uppercase rounded-xl hover:bg-gray-700 transition-all">Abort</button>
              <button onClick={handleConfirmAlgoSwitch} className="py-3 px-4 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">Confirm Shift</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiningConsole;
