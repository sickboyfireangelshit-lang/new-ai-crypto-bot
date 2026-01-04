
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { GeminiService } from '../services/gemini';
import { LoggerService } from '../services/logger';
import { LogCategory } from '../types';

interface DataChain {
  id: string;
  name: string;
  yield: number; // APY / Profitability index
  difficulty: number;
  latency: number;
  security: number; // 0-100
  tags: string[];
}

const INITIAL_CHAINS: DataChain[] = [
  { id: 'eth-main', name: 'Ethereum Lattice', yield: 14.2, difficulty: 88, latency: 12, security: 98, tags: ['PoS', 'High-Yield'] },
  { id: 'btc-sec', name: 'Bitcoin Core Trace', yield: 8.5, difficulty: 95, latency: 60, security: 100, tags: ['PoW', 'Stable'] },
  { id: 'sol-grid', name: 'Solana Shard-X', yield: 22.8, difficulty: 45, latency: 2, security: 78, tags: ['High-Velocity', 'Unstable'] },
  { id: 'avax-node', name: 'Avalanche Snow-Link', yield: 12.1, difficulty: 62, latency: 5, security: 89, tags: ['Subnet', 'Optimized'] },
  { id: 'poly-sync', name: 'Polygon Zero-Proof', yield: 18.4, difficulty: 32, latency: 8, security: 82, tags: ['L2', 'Low-Fee'] },
];

const DataChainExplorer: React.FC = () => {
  const [chains, setChains] = useState<DataChain[]>(INITIAL_CHAINS);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisThinking, setAnalysisThinking] = useState<string | null>(null);

  const selectedChain = useMemo(() => chains.find(c => c.id === selectedChainId), [chains, selectedChainId]);

  const radarData = useMemo(() => {
    if (!selectedChain) return [];
    return [
      { subject: 'Yield', A: selectedChain.yield * 4, fullMark: 100 },
      { subject: 'Difficulty', A: selectedChain.difficulty, fullMark: 100 },
      { subject: 'Latency', A: 100 - (selectedChain.latency > 100 ? 100 : selectedChain.latency), fullMark: 100 },
      { subject: 'Security', A: selectedChain.security, fullMark: 100 },
      { subject: 'Stability', A: selectedChain.security * 0.9, fullMark: 100 },
    ];
  }, [selectedChain]);

  const handleDeepAudit = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisThinking(null);
    LoggerService.log(LogCategory.AI, "Chain deep-audit initiated", { chainCount: chains.length });

    try {
      const response = await GeminiService.analyzeChains(chains);
      
      // Extract thinking if available in the model's response parts
      const thinking = (response as any).candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.thought;
      setAnalysisThinking(thinking || null);
      setAnalysisResult(response.text || "Analysis complete.");
      
      LoggerService.log(LogCategory.AI, "Neural audit complete", { verdict: response.text?.substring(0, 50) });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Data Chain Explorer</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Discover and audit the most profitable chains across the global decentralized lattice.</p>
        </div>
        
        <button 
          onClick={handleDeepAudit}
          disabled={isAnalyzing}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          {isAnalyzing ? 'Analyzing Lattice...' : 'Neural Chain Recommender'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden bg-gray-950/40">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Live Yield Spread</h3>
                <span className="text-[10px] font-mono text-gray-600 uppercase">Synced: Just Now</span>
             </div>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chains}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#030712', border: '1px solid #1f2937', borderRadius: '1rem' }}
                        itemStyle={{ color: '#818cf8', fontWeight: 900, fontSize: '12px' }}
                      />
                      <Bar dataKey="yield" radius={[8, 8, 0, 0]} onClick={(data) => setSelectedChainId(data.id)} className="cursor-pointer">
                        {chains.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedChainId === entry.id ? '#6366f1' : '#1f2937'} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chains.map(chain => (
              <div 
                key={chain.id} 
                onClick={() => setSelectedChainId(chain.id)}
                className={`glass-card p-6 rounded-3xl border transition-all cursor-pointer group ${
                  selectedChainId === chain.id ? 'border-indigo-500 bg-indigo-600/5' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${selectedChainId === chain.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-600 group-hover:text-gray-400'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-indigo-400 font-mono">{chain.yield}% YIELD</span>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mt-1">Difficulty: {chain.difficulty}</p>
                  </div>
                </div>
                <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-4">{chain.name}</h4>
                <div className="flex flex-wrap gap-2">
                  {chain.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-900 text-gray-500 border border-gray-800">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl h-[450px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
            {selectedChain ? (
              <>
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-8">Chain Performance Radar</h3>
                <div className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#1f2937" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 900 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                      <Radar name={selectedChain.name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                   <h4 className="text-white font-black uppercase tracking-tighter">{selectedChain.name} Metrics</h4>
                   <p className="text-[10px] text-gray-600 uppercase font-black">Lattice_Security_Index: {selectedChain.security}/100</p>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                 <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto border border-gray-800 opacity-30">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Select a chain for deep telemetry</p>
              </div>
            )}
          </div>

          <div className="glass-card rounded-[2.5rem] p-8 border border-indigo-500/20 bg-indigo-950/20 shadow-2xl">
             <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                Neural Verdict
             </h3>
             <div className="space-y-4">
                {isAnalyzing ? (
                  <div className="space-y-3">
                     <div className="h-2 bg-indigo-500/20 rounded-full w-full animate-pulse"></div>
                     <div className="h-2 bg-indigo-500/20 rounded-full w-[90%] animate-pulse"></div>
                     <div className="h-2 bg-indigo-500/20 rounded-full w-[95%] animate-pulse"></div>
                  </div>
                ) : analysisResult ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                     {analysisThinking && (
                        <div className="mb-4 p-4 bg-black/40 border-l-2 border-indigo-500/30 rounded-r-xl">
                           <p className="text-[10px] font-mono text-indigo-300/60 leading-relaxed italic">{analysisThinking.substring(0, 150)}...</p>
                        </div>
                     )}
                     <p className="text-xs text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">{analysisResult}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No audit results cached. Trigger 'Neural Chain Recommender' to analyze the lattice.</p>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataChainExplorer;
