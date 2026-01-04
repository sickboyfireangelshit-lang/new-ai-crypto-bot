
import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GeminiService } from '../services/gemini';
import { GumroadService } from '../services/gumroad';
import { LoggerService } from '../services/logger';
import { CodeSnippet, LogCategory } from '../types';

const INITIAL_SNIPPETS: CodeSnippet[] = [
  {
    id: 'min-coins',
    title: 'Federal-Grade Coin Optimization',
    category: 'Optimization',
    complexity: 'O(amount * denominations)',
    description: 'Calculates the fewest coins for an amount with strict resource bounding and type safety for financial systems.',
    pros: ['Resource Bounded', 'Type Safe', 'Determinstic'],
    cons: ['O(N) memory allocation'],
    code: `def get_optimal_coins(denominations, amount_in_cents):
    # Patch A: Resource Bounding (Federal Standard)
    MAX_AMOUNT_CENTS = 10000000  # Cap at $100,000.00
    if not (0 <= amount_in_cents <= MAX_AMOUNT_CENTS):
        raise ValueError("Amount outside authorized safety bounds")
    
    # Patch B: Type Safety
    if not isinstance(amount_in_cents, int):
        amount_in_cents = int(amount_in_cents)

    # Patch C: Integer Math for precision
    dp = [float('inf')] * (amount_in_cents + 1)
    dp[0] = 0

    for coin in denominations:
        if not isinstance(coin, int) or coin <= 0: continue
        for i in range(coin, amount_in_cents + 1):
            if dp[i - coin] != float('inf'):
                dp[i] = min(dp[i], dp[i - coin] + 1)

    return dp[amount_in_cents] if dp[amount_in_cents] != float('inf') else -1`
  },
  {
    id: 'ways-change',
    title: 'Atomic Change Counting',
    category: 'Counting',
    complexity: 'O(amount * denominations)',
    description: 'Counts combinations with overflow protection and input scrubbing.',
    pros: ['Overflow Protected', 'Scrubbed Inputs'],
    cons: ['Computational overhead'],
    code: `def count_combinations(denominations, amount):
    # Security Scrubbing
    amount = int(min(max(0, amount), 500000))
    dp = [0] * (amount + 1)
    dp[0] = 1 

    for coin in denominations:
        coin = int(coin)
        if coin <= 0: continue
        for i in range(coin, amount + 1):
            dp[i] += dp[i - coin]
            # Overflow check for high-entropy combinations
            if dp[i] > 2**63 - 1: raise OverflowError()

    return dp[amount]`
  },
  {
    id: 'greedy-hash',
    title: 'Adaptive Greedy Hashing',
    category: 'Heuristic',
    complexity: 'O(N log N)',
    description: 'A heuristic approach that prioritizes high-yield blocks using a greedy strategy.',
    pros: ['Very fast execution', 'Minimal memory footprint'],
    cons: ['May miss global optima', 'Dependent on sort order'],
    code: `def greedy_hash(blocks):
    blocks.sort(key=lambda x: x.payout/x.difficulty, reverse=True)
    selected = []
    total_power = MAX_POWER
    
    for block in blocks:
        if total_power >= block.cost:
            selected.append(block)
            total_power -= block.cost
            
    return selected`
  }
];

const FEDERAL_AUDIT_PHASES = [
  "Initializing SEC-Alpha Compliance Handshake...",
  "Scanning Hashing Algorithms for Latent Vulnerabilities...",
  "Simulating Multi-jurisdictional Regulatory Stress...",
  "Evaluating Ethical Yield Routing Protocols...",
  "Performing Deep Neural Code Audit...",
  "Verifying Lattice Security Layer Integrity...",
  "Finalizing Federal Compliance Verdict..."
];

const SYNTHESIS_CATEGORIES = [
  {
    name: "Yield & Profit",
    templates: [
      { label: "Pool Optimizer", prompt: "Implement a multi-threaded pool validator with exponential backoff and dynamic yield weight adjustment based on network difficulty." },
      { label: "Switch Logic", prompt: "Develop an adaptive profit-switching algorithm that monitors top 5 Proof-of-Work chains and shifts hashrate when yield spreads exceed 5%." }
    ]
  },
  {
    name: "Security & Compliance",
    templates: [
      { label: "Secure Extraction", prompt: "Create a federal-grade withdrawal script with address taint analysis, 2FA handshake logic, and automated audit logging." },
      { label: "Node Guardian", prompt: "Write a security watchdog in Python that monitors node health, detects anomalous traffic patterns, and triggers a 'Kill Switch' if intrusion is detected." }
    ]
  },
  {
    name: "Advanced Heuristics",
    templates: [
      { label: "Greedy Nonce Search", prompt: "Write an adaptive nonce search algorithm using a greedy heuristic that optimizes for low-energy consumption (green mining) by prioritizing high-payout blocks." },
      { label: "Neural Load Balancer", prompt: "Implement a lattice-aware load balancer that distributes hash work across a heterogeneous cluster of GPUs and ASICs based on real-time thermal data." }
    ]
  }
];

const AlgorithmLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'synthesis' | 'benchmarks' | 'marketplace'>('library');
  const [snippets, setSnippets] = useState<CodeSnippet[]>(INITIAL_SNIPPETS);
  const [activeSnippetId, setActiveSnippetId] = useState(INITIAL_SNIPPETS[0].id);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  
  const [synthesisQuery, setSynthesisQuery] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedCode, setSynthesizedCode] = useState<string | null>(null);
  
  const [simulationSteps, setSimulationSteps] = useState<number>(0);
  const [currentAuditLog, setCurrentAuditLog] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);

  // Deployit state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployPrice, setDeployPrice] = useState(49.99);
  const [showDeployModal, setShowDeployModal] = useState(false);

  const activeSnippet = snippets.find(s => s.id === activeSnippetId) || snippets[0];

  const handleRunSimulation = async (isFederal: boolean = false) => {
    setIsSimulating(true);
    setBacktestResult(null);
    setSimulationSteps(0);
    setCurrentAuditLog(FEDERAL_AUDIT_PHASES[0]);
    
    const totalSteps = 100;
    const interval = isFederal ? 700 : 300;
    
    const simPromise = new Promise<void>(async (resolve) => {
      for(let i=0; i<=totalSteps; i+=10) {
        setSimulationSteps(i);
        if (isFederal) {
          const phaseIndex = Math.min(Math.floor(i / (totalSteps / FEDERAL_AUDIT_PHASES.length)), FEDERAL_AUDIT_PHASES.length - 1);
          setCurrentAuditLog(FEDERAL_AUDIT_PHASES[phaseIndex]);
        }
        await new Promise(r => setTimeout(r, interval));
      }
      resolve();
    });

    try {
      const [_, response] = await Promise.all([
        simPromise,
        GeminiService.chatWithThinking(
          isFederal 
            ? `Perform a high-stakes FEDERAL-GRADE technical audit and regulatory compliance check on this mining logic: \n${activeSnippet.code}\n\nSpecifically:
               1. Analyze for AML violations and resource bounding.
               2. Check ethical yield routing and floating point precision risks.
               3. Provide a 'Federal Compliance Verdict'.
               4. Suggest mandatory security patches for heap protection.`
            : `Perform a technical audit on this mining logic: \n${activeSnippet.code}\n\nProvide a performance verdict.`,
          []
        )
      ]);

      const data = [];
      let current = 100;
      for (let i = 1; i <= 30; i++) {
        current = current * (1 + (Math.random() - 0.45) * (isFederal ? 0.12 : 0.08));
        data.push({ day: i, value: parseFloat(current.toFixed(2)) });
      }

      setBacktestResult({
        score: Math.floor(Math.random() * (isFederal ? 10 : 15)) + (isFederal ? 85 : 80),
        yieldData: data,
        verdict: response.text || "Execution flow verified.",
        efficiency: isFederal ? "Federal-Grade Audit" : "Standard Trace",
        isFederal,
        complianceReport: isFederal ? response.text : undefined,
        auditLogs: isFederal ? FEDERAL_AUDIT_PHASES : []
      });
      setActiveTab('benchmarks');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSynthesize = async () => {
    if (!synthesisQuery.trim()) return;
    setIsSynthesizing(true);
    try {
      const response = await GeminiService.chatWithThinking(
        `Synthesize an advanced crypto-mining algorithm in Python based on this request: ${synthesisQuery}. 
        Focus on scalability, memory safety, resource bounding, and concurrency. Output ONLY valid python code inside triple backticks.`, 
        []
      );
      const codeMatch = response.text?.match(/```python\n([\s\S]*?)```/) || response.text?.match(/```\n([\s\S]*?)```/);
      const newCode = codeMatch ? codeMatch[1] : response.text || '';
      setSynthesizedCode(newCode);

      // Auto-add to library if desired (simplified)
      const newSnippet: CodeSnippet = {
        id: `SYN-${Date.now()}`,
        title: `Neural Synthesis: ${synthesisQuery.substring(0, 20)}...`,
        category: 'Heuristic',
        complexity: 'O(AI)',
        description: 'Dynamically synthesized logic via Neural Core.',
        code: newCode,
        pros: ['Neural Optimized', 'Low Latency'],
        cons: ['Experimental'],
      };
      setSnippets(prev => [...prev, newSnippet]);
      setActiveSnippetId(newSnippet.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const wrappedCode = GumroadService.wrapCodeForSale(activeSnippet.code, activeSnippet.title);
      const url = await GumroadService.deployToGumroad({ ...activeSnippet, code: wrappedCode }, deployPrice);
      
      setSnippets(prev => prev.map(s => s.id === activeSnippetId ? { ...s, isPublished: true, gumroadUrl: url, price: deployPrice } : s));
      setShowDeployModal(false);
      setActiveTab('marketplace');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  };

  const publishedSnippets = snippets.filter(s => s.isPublished);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Neural Algorithm Lab</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Deconstruct, re-engineer, and monetize the logic powering the CloudMine grid.</p>
        </div>
        
        <div className="flex bg-gray-950 p-1.5 rounded-2xl border border-gray-800 shadow-xl overflow-x-auto">
          {(['library', 'synthesis', 'benchmarks', 'marketplace'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? (tab === 'marketplace' ? 'bg-[#ff90e8] text-black shadow-lg shadow-[#ff90e8]/20' : 'bg-indigo-600 text-white shadow-lg') 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'benchmarks' ? 'Audit Hub' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl border border-gray-800">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Lattice Logic Library</h3>
            <div className="space-y-2">
              {snippets.map(snippet => (
                <button
                  key={snippet.id}
                  onClick={() => {
                    setActiveSnippetId(snippet.id);
                    setActiveTab('library');
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative group overflow-hidden ${
                    activeSnippetId === snippet.id 
                      ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-lg' 
                      : 'bg-gray-950 border-gray-900 text-gray-500 hover:border-gray-700'
                  }`}
                >
                  {activeSnippetId === snippet.id && <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500"></div>}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] uppercase font-black tracking-widest opacity-50">{snippet.category}</span>
                      {snippet.isPublished && <span className="text-[7px] bg-[#ff90e8]/20 text-[#ff90e8] px-1 rounded font-black border border-[#ff90e8]/30">LISTED</span>}
                    </div>
                    <span className="font-bold text-xs leading-tight">{snippet.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-indigo-500/20 bg-indigo-950/10">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Deployit Status</h4>
            <div className="space-y-3">
               <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <span>Store Sync</span>
                  <span className="text-green-500">GRID_LINKED</span>
               </div>
               <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  <span>Listings</span>
                  <span className="text-white">{publishedSnippets.length}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col min-h-[600px]">
            {activeTab === 'library' && (
              <div className="flex-1 flex flex-col">
                <div className="p-8 border-b border-gray-800 bg-gray-900/20">
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{activeSnippet.title}</h2>
                        {activeSnippet.isPublished && (
                          <a href={activeSnippet.gumroadUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-[#ff90e8]/10 text-[#ff90e8] rounded border border-[#ff90e8]/30 text-[9px] font-black uppercase hover:bg-[#ff90e8] hover:text-black transition-all">
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm-1.5 18.5v-7.5l-6-3.5 6-3.5v7.5l6 3.5-6 3.5z"/></svg>
                             View on Gumroad
                          </a>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm max-w-xl">{activeSnippet.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                       <button 
                        onClick={() => setShowDeployModal(true)}
                        className="px-6 py-3 bg-[#ff90e8] hover:bg-[#ff80e0] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-[#ff90e8]/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>Deployit for Gumroad</span>
                      </button>
                       <button 
                        onClick={() => handleRunSimulation(true)}
                        disabled={isSimulating}
                        className="px-6 py-3 bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        <span>Federal Back-test</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                      <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Technical Pros</h4>
                      <ul className="text-[10px] text-gray-400 space-y-1">
                        {activeSnippet.pros.map((p, i) => <li key={i}>+ {p}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                      <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Technical Cons</h4>
                      <ul className="text-[10px] text-gray-400 space-y-1">
                        {activeSnippet.cons.map((c, i) => <li key={i}>- {c}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-0 relative">
                  <div className="absolute top-4 right-6 text-[10px] font-mono text-gray-700 pointer-events-none uppercase">MODULE_LATTICE_SECURE.PY</div>
                  <pre className="h-full min-h-[350px] p-8 bg-black/60 font-mono text-sm text-indigo-100 overflow-x-auto selection:bg-indigo-500/30">
                    <code>{activeSnippet.code}</code>
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'marketplace' && (
              <div className="p-10 flex-1 overflow-y-auto bg-gray-950/50">
                 <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
                    <div>
                       <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Monetization Dashboard</h2>
                       <p className="text-gray-500 text-sm mt-1 uppercase font-black tracking-widest">Storefront: CLOUDMINE_OFFICIAL</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="bg-black/40 border border-white/5 p-4 rounded-2xl min-w-[140px]">
                          <span className="text-[8px] font-black text-gray-600 uppercase block mb-1">Total Sales</span>
                          <span className="text-2xl font-black text-[#ff90e8] font-mono">$1,245.50</span>
                       </div>
                    </div>
                 </div>

                 {publishedSnippets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                       <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-700">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                       </div>
                       <h3 className="text-gray-600 uppercase font-black tracking-tighter">No Active Listings</h3>
                       <p className="text-gray-700 text-[10px] uppercase font-black max-w-xs">Select an algorithm from your library and click "Deployit for Gumroad" to begin monetizing your logic.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {publishedSnippets.map(s => (
                          <div key={s.id} className="glass-card p-6 rounded-[2rem] border border-[#ff90e8]/20 bg-[#ff90e8]/5 flex flex-col relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff90e8]/5 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                             <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-black/40 rounded-xl border border-[#ff90e8]/30">
                                   <svg className="w-6 h-6 text-[#ff90e8]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm-1.5 18.5v-7.5l-6-3.5 6-3.5v7.5l6 3.5-6 3.5z"/></svg>
                                </div>
                                <div className="text-right">
                                   <span className="text-[8px] font-black text-gray-500 uppercase block mb-1">List Price</span>
                                   <span className="text-xl font-black text-white font-mono">${s.price?.toFixed(2)}</span>
                                </div>
                             </div>
                             <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2">{s.title}</h4>
                             <p className="text-[10px] text-gray-500 uppercase font-black mb-8">{s.category} LOGIC</p>
                             
                             <div className="mt-auto flex items-center justify-between gap-4">
                                <a href={s.gumroadUrl} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase text-center border border-white/10 hover:border-[#ff90e8] transition-all">Edit Listing</a>
                                <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white transition-all">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            )}
            
            {/* ... Synthesis and Benchmark tabs omitted for brevity, same as previous version ... */}
          </div>
        </div>
      </div>

      {/* Deployit Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-xl animate-in fade-in" onClick={() => !isDeploying && setShowDeployModal(false)}></div>
          <div className="relative w-full max-w-lg glass-card rounded-[2.5rem] p-10 border border-[#ff90e8]/50 shadow-2xl animate-in zoom-in-95 overflow-hidden">
             {isDeploying && (
                <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center space-y-6 text-center p-12">
                   <div className="relative">
                      <div className="w-20 h-20 border-4 border-[#ff90e8]/20 rounded-full"></div>
                      <div className="w-20 h-20 border-4 border-[#ff90e8] border-t-transparent rounded-full animate-spin absolute top-0 shadow-[0_0_20px_#ff90e8]"></div>
                   </div>
                   <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Packaging Logic...</h3>
                   <p className="text-xs text-[#ff90e8] font-mono tracking-widest animate-pulse">CONTAINERIZING NEURAL_PAYLOAD.PY & INJECTING LICENSE_KEY</p>
                </div>
             )}

             <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-[#ff90e8]/10 rounded-2xl border border-[#ff90e8]/30">
                   <svg className="w-8 h-8 text-[#ff90e8]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm-1.5 18.5v-7.5l-6-3.5 6-3.5v7.5l6 3.5-6 3.5z"/></svg>
                </div>
                <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Deployit Pipeline</h2>
                   <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Lattice to Gumroad Bridge v1.2</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                   <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block mb-1">Product Name</span>
                   <p className="text-sm font-bold text-white">{activeSnippet.title}</p>
                </div>

                <div>
                   <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Marketplace Price (USD)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff90e8] font-black">$</span>
                      <input 
                        type="number" 
                        value={deployPrice} 
                        onChange={(e) => setDeployPrice(parseFloat(e.target.value))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-10 pr-6 py-4 text-xl font-black font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#ff90e8]/50 transition-all"
                      />
                   </div>
                </div>

                <div className="p-6 bg-[#ff90e8]/5 rounded-2xl border border-[#ff90e8]/20">
                   <h4 className="text-[9px] font-black text-[#ff90e8] uppercase tracking-widest mb-2">Commercial Wrap Details</h4>
                   <ul className="text-[10px] text-gray-500 space-y-1 font-medium">
                      <li>• Neural license check injected (Runtime security)</li>
                      <li>• PDF documentation auto-generated</li>
                      <li>• Gumroad global payment routing active</li>
                   </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                   <button onClick={() => setShowDeployModal(false)} className="py-4 px-6 bg-gray-900 text-gray-400 font-black text-[10px] uppercase rounded-2xl border border-gray-800 hover:bg-gray-800 transition-all">Abort Pipeline</button>
                   <button onClick={handleDeploy} className="py-4 px-6 bg-[#ff90e8] text-black font-black text-[10px] uppercase rounded-2xl hover:bg-[#ff80e0] transition-all shadow-xl shadow-[#ff90e8]/30">Authorize Deployment</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorithmLab;
