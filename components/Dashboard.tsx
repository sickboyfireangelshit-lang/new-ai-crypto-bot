
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, BarChart, Bar, Cell, ComposedChart, Line } from 'recharts';
import { GeminiService } from '../services/gemini';
import { MiningBot } from '../types';

interface HashrateData {
  time: string;
  rate: number;
}

interface MarketTick {
  time: string;
  price: number;
}

interface AutomationLog {
  id: string;
  timestamp: string;
  bot: string;
  action: string;
  type: 'optimization' | 'security' | 'market';
}

const INTERVAL_LABELS = ['1m', '5m', '10m', '30m', '1h'] as const;
type IntervalType = typeof INTERVAL_LABELS[number];

interface DashboardProps {
  globalBalance: number;
  bots: MiningBot[];
  onOpenDeposit?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ globalBalance, bots, onOpenDeposit }) => {
  const [selectedInterval, setSelectedInterval] = useState<IntervalType>('10m');
  const [hashrateHistory, setHashrateHistory] = useState<HashrateData[]>([]);
  const [marketHistory, setMarketHistory] = useState<MarketTick[]>([]);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [telemetryJitter, setTelemetryJitter] = useState<number>(0);
  
  // Real-time hardware fetch simulation
  const [hwAudit, setHwAudit] = useState({ utilization: 0, temp: 0, status: 'STABLE' });
  const [isHwFetching, setIsHwFetching] = useState(false);

  // Simulation of automation logs
  useEffect(() => {
    const actions = [
      "Optimizing hashrate distribution for Alpha-X-7",
      "Switching HyperNode-Prime to higher yield pool",
      "Thermal sync recalibration initiated",
      "Market volatility detected: hedging mining yields",
      "New node shard provisioned in US-East-1",
      "Lattice security handshake successful",
      "Redundant hashing path established",
    ];
    const botNames = bots.length > 0 ? bots.map(b => b.name) : ["Global_Grid"];

    const addLog = () => {
      const newLog: AutomationLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        bot: botNames[Math.floor(Math.random() * botNames.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        type: ['optimization', 'security', 'market'][Math.floor(Math.random() * 3)] as any,
      };
      setAutomationLogs(prev => [newLog, ...prev].slice(0, 15));
    };

    const logTimer = setInterval(addLog, 4000);
    return () => clearInterval(logTimer);
  }, [bots]);

  // Telemetry Jitter for charts
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryJitter(prev => (prev + 1) % 100);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Hardware Fetch Loop (Polls the simulated bot environment)
  useEffect(() => {
    const fetchHwData = () => {
      setIsHwFetching(true);
      setTimeout(() => {
        const totalUtil = bots.reduce((acc, b) => acc + (b.efficiency * 100), 0);
        const totalTemp = bots.reduce((acc, b) => acc + b.temp, 0);
        const avgUtil = bots.length > 0 ? totalUtil / bots.length : 0;
        const avgTemp = bots.length > 0 ? totalTemp / bots.length : 0;
        
        setHwAudit({
          utilization: avgUtil + (Math.random() * 4 - 2),
          temp: avgTemp + (Math.random() * 2 - 1),
          status: avgTemp > 75 ? 'THROTTLING' : (avgTemp > 65 ? 'WARNING' : 'STABLE')
        });
        setIsHwFetching(false);
      }, 600);
    };

    const hwTimer = setInterval(fetchHwData, 3000);
    fetchHwData(); // Initial call
    return () => clearInterval(hwTimer);
  }, [bots]);

  // Simulation of real-time market ticks
  useEffect(() => {
    const points = 60;
    const initialMarket: MarketTick[] = [];
    let price = 94500.50;
    const now = Date.now();
    for (let i = points; i >= 0; i--) {
      price += (Math.random() - 0.5) * 50;
      initialMarket.push({
        time: new Date(now - i * 1000).toLocaleTimeString([], { second: '2-digit' }),
        price: parseFloat(price.toFixed(2))
      });
    }
    setMarketHistory(initialMarket);

    const marketTimer = setInterval(() => {
      setMarketHistory(prev => {
        const lastPrice = prev[prev.length - 1].price;
        const nextPrice = lastPrice + (Math.random() - 0.5) * 25;
        const newPoint = {
          time: new Date().toLocaleTimeString([], { second: '2-digit' }),
          price: parseFloat(nextPrice.toFixed(2))
        };
        return [...prev, newPoint].slice(-60);
      });
    }, 1000);

    return () => clearInterval(marketTimer);
  }, []);

  // Simulation of real-time hashrate data
  useEffect(() => {
    const points = 100;
    const initialData: HashrateData[] = [];
    let base = bots.reduce((acc, b) => acc + b.hashrate, 0);
    if (base === 0) base = 180;
    const now = Date.now();
    
    for (let i = points; i >= 0; i--) {
      base += (Math.random() - 0.5) * 5;
      initialData.push({
        time: new Date(now - i * 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rate: parseFloat(base.toFixed(2))
      });
    }
    setHashrateHistory(initialData);

    const timer = setInterval(() => {
      setHashrateHistory(prev => {
        if (prev.length === 0) return prev;
        const lastRate = prev[prev.length - 1].rate;
        const nextRate = parseFloat((lastRate + (Math.random() - 0.5) * 8).toFixed(2));
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          rate: Math.max(base * 0.7, nextRate)
        };
        return [...prev, newPoint].slice(-120); 
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [bots]);

  const handleQuickInsight = async () => {
    setIsInsightLoading(true);
    try {
      const avg = (hashrateHistory.reduce((acc, curr) => acc + curr.rate, 0) / hashrateHistory.length).toFixed(2);
      const text = await GeminiService.fastChat(`Explain current cloud mining performance. Average hashrate is ${avg} MH/s. Portfolios are distributed across 4 global regions. Give a quick summary of the "Cloud Bot" optimization status.`);
      console.log(text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInsightLoading(false);
    }
  };

  const avgTemp = useMemo(() => {
    if (bots.length === 0) return 0;
    return Math.round(bots.reduce((acc, b) => acc + b.temp, 0) / bots.length);
  }, [bots]);

  const clusterLoad = useMemo(() => {
    if (bots.length === 0) return 0;
    const activeCount = bots.filter(b => b.status === 'active').length;
    return Math.round((activeCount / bots.length) * 100);
  }, [bots]);

  const telemetryData = useMemo(() => {
    return bots.map(bot => {
      const jitter = (Math.sin(telemetryJitter * 0.5 + bot.id.length) * 2);
      return {
        name: bot.name,
        utilization: Math.min(100, Math.max(0, (bot.efficiency * 100) + jitter)),
        temp: Math.min(100, Math.max(0, bot.temp + jitter)),
        status: bot.status
      };
    });
  }, [bots, telemetryJitter]);

  return (
    <div className="space-y-6">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden glass-card rounded-[2.5rem] border border-indigo-500/20 shadow-2xl group min-h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/40 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2832&auto=format&fit=crop" 
          alt="Neural Mining Core" 
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 grayscale group-hover:grayscale-0"
        />
        <div className="relative z-20 p-10 flex flex-col justify-center h-full max-w-2xl">
          <div className="flex items-center space-x-3 mb-4">
            <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              Cloud Grid Live
            </span>
            <span className="flex items-center text-[10px] text-green-400 font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Neural Bot Operating
            </span>
          </div>
          <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-tight mb-4">
            Cloud Mining <br />
            <span className="text-indigo-500">Autonomous Core.</span>
          </h2>
          <p className="text-gray-400 font-medium text-lg mb-8 max-w-md">
            The CloudMine AI bot is currently managing {bots.length} nodes across global clusters.
          </p>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleQuickInsight}
              disabled={isInsightLoading}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3"
            >
              {isInsightLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              {isInsightLoading ? 'Analyzing...' : 'Fetch Bot Insights'}
            </button>
            <button 
              onClick={onOpenDeposit}
              className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-indigo-400 border border-indigo-500/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add Funds
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Assets" value={`$${globalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} trend="Autonomous" isPositive={true} />
        <StatCard title="Bot Hashrate" value={`${hashrateHistory[hashrateHistory.length - 1]?.rate.toFixed(1) || '0.0'} MH/s`} trend="+4.2%" isPositive={true} />
        <StatCard title="Market Index" value={`$${marketHistory[marketHistory.length - 1]?.price.toLocaleString() || '94,500'}`} trend="Stable" isPositive={true} />
        <StatCard title="Nodes Online" value={`${bots.filter(b => b.status === 'active').length} / ${bots.length}`} trend="Synced" isPositive={true} />
      </div>

      {/* NEW: Neural Cluster Hardware Audit Card */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col bg-gray-950/40 col-span-1 min-h-[380px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
          
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600/20 rounded-xl flex items-center justify-center border border-rose-500/20">
                   <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-white italic">Hardware Audit</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isHwFetching ? 'bg-indigo-500 animate-ping' : 'bg-gray-700'}`}></span>
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter">Sensor_Grid_Fetch</span>
                   </div>
                </div>
             </div>
             <div className="text-right">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${hwAudit.status === 'STABLE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                  {hwAudit.status}
                </span>
             </div>
          </div>

          <div className="space-y-8 flex-1 flex flex-col justify-center">
             <div>
                <div className="flex justify-between items-end mb-3 px-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cluster Utilization</span>
                   <span className="text-xl font-black text-white font-mono">{hwAudit.utilization.toFixed(1)}%</span>
                </div>
                <div className="h-4 w-full bg-gray-900 rounded-full border border-white/5 overflow-hidden shadow-inner p-1">
                   <div 
                    className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                    style={{ width: `${hwAudit.utilization}%` }}
                   ></div>
                </div>
             </div>

             <div>
                <div className="flex justify-between items-end mb-3 px-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Average Core Thermal</span>
                   <span className={`text-xl font-black font-mono ${hwAudit.temp > 75 ? 'text-rose-500' : 'text-amber-400'}`}>
                     {hwAudit.temp.toFixed(1)}°C
                   </span>
                </div>
                <div className="h-4 w-full bg-gray-900 rounded-full border border-white/5 overflow-hidden shadow-inner p-1">
                   <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${hwAudit.temp > 75 ? 'bg-gradient-to-r from-amber-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-amber-500'}`}
                    style={{ width: `${Math.min(100, (hwAudit.temp / 100) * 100)}%` }}
                   ></div>
                </div>
                <div className="flex justify-between mt-2 px-1 text-[8px] font-bold text-gray-600 uppercase tracking-tighter">
                   <span>Liquid_Cooling: Active</span>
                   <span>Threshold: 85°C</span>
                </div>
             </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center text-[9px] font-mono text-gray-700">
             <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
                <span>TX_LATENCY: 4ms</span>
             </div>
             <span>SYS_CLK: 4.2GHz</span>
          </div>
        </div>

        {/* Global Hash Performance Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl h-[400px] flex flex-col overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
              Global Hash Performance
            </h3>
            <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-800">
              {INTERVAL_LABELS.map(interval => (
                <button
                  key={interval}
                  onClick={() => setSelectedInterval(interval)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    selectedInterval === interval 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-grow relative min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <AreaChart data={hashrateHistory} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorHash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="rate" stroke="#818cf8" fillOpacity={1} fill="url(#colorHash)" strokeWidth={3} isAnimationActive={false} />
                <Brush dataKey="time" height={30} stroke="#4b5563" fill="#111827" className="recharts-brush-bar" startIndex={Math.max(0, hashrateHistory.length - 40)} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Hardware Telemetry Chart */}
        <div className="glass-card rounded-[2rem] p-6 border border-gray-800 shadow-2xl xl:col-span-2 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
               </div>
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Hardware Telemetry</h3>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Simulated_Active_Clusters</p>
               </div>
            </div>
            <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[9px] font-black uppercase text-gray-400">Utilization</span>
               </div>
               <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-[9px] font-black uppercase text-gray-400">Thermal (°C)</span>
               </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={telemetryData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#4b5563" fontSize={9} tick={{ fill: '#4b5563', fontWeight: 900 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} stroke="#4b5563" fontSize={9} unit="%" />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} stroke="#4b5563" fontSize={9} unit="°" />
                  <Tooltip content={<TelemetryTooltip />} cursor={{ fill: '#ffffff05' }} />
                  <Bar yAxisId="left" dataKey="utilization" barSize={35} radius={[6, 6, 0, 0]}>
                    {telemetryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === 'active' ? 'url(#utilGrad)' : '#1f2937'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#fff' }} />
                  <defs>
                    <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
               </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Neural Bot Log */}
        <div className="glass-card rounded-2xl flex flex-col h-[400px] overflow-hidden border border-gray-800 xl:col-span-1">
          <div className="p-6 bg-gray-900/40 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              Neural Bot Log
            </h3>
            <span className="text-[9px] font-mono text-gray-500 uppercase">Live_Telemetry</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
            {automationLogs.map((log) => (
              <div key={log.id} className="text-[10px] leading-tight flex space-x-2 group">
                <span className="text-gray-600">[{log.timestamp}]</span>
                <span className={`font-black uppercase tracking-tighter ${
                  log.type === 'optimization' ? 'text-indigo-400' :
                  log.type === 'security' ? 'text-red-400' :
                  'text-green-400'
                }`}>
                  {log.bot}:
                </span>
                <span className="text-gray-300 group-hover:text-white transition-colors">{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] border border-gray-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          <p className="text-indigo-400 font-mono font-bold text-sm">
            {payload[0].value.toFixed(1)} <span className="text-[10px]">MH/s</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const TelemetryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-950/90 border border-indigo-500/20 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white border-b border-white/5 pb-2 mb-3">{label}</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Utilization</span>
            <span className="text-xs font-black text-indigo-400 font-mono">{payload[0].value.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Core Temp</span>
            <span className="text-xs font-black text-rose-500 font-mono">{payload[1].value.toFixed(1)}°C</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const StatCard: React.FC<{ title: string; value: string; trend: string; isPositive: boolean }> = ({ title, value, trend, isPositive }) => (
  <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 shadow-lg transition-transform hover:scale-[1.02]">
    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white tracking-tight mono">{value}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-indigo-500/10 text-indigo-400'} font-bold`}>
        {trend}
      </span>
    </div>
  </div>
);

export default Dashboard;
