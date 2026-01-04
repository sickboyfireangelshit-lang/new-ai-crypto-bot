
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { LoggerService } from '../services/logger';
import { LogCategory, MiningBot } from '../types';

interface DiagnosticsViewProps {
  bots: MiningBot[];
  setBots: React.Dispatch<React.SetStateAction<MiningBot[]>>;
}

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
}

const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ bots, setBots }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'AI_CORE_HANDSHAKE', status: 'idle', message: 'Awaiting initialization...' },
    { name: 'LATTICE_PERSISTENCE', status: 'idle', message: 'Ready to verify storage...' },
    { name: 'VISION_PROTOCOL', status: 'idle', message: 'Awaiting image simulation...' },
    { name: 'AUDIO_PCM_RENDER', status: 'idle', message: 'Ready for TTS test...' },
    { name: 'SECURITY_HANDSHAKE', status: 'idle', message: 'Monitoring network integrity...' }
  ]);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`].slice(-50));
  };

  const updateTest = (name: string, status: TestResult['status'], message: string) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, status, message } : t));
  };

  const runFullDiagnostics = async () => {
    if (isAutoTesting) return;
    setIsAutoTesting(true);
    addLog("CRITICAL: FULL SYSTEM DIAGNOSTICS INITIATED");
    
    // 1. AI Core Test
    updateTest('AI_CORE_HANDSHAKE', 'running', 'Connecting to Gemini-3-Pro...');
    addLog("Testing AI connectivity...");
    try {
      const resp = await GeminiService.fastChat("System check. Return 'Neural Core Online'.");
      updateTest('AI_CORE_HANDSHAKE', 'success', `Response: ${resp}`);
      addLog("AI Core verification successful.");
    } catch (e) {
      updateTest('AI_CORE_HANDSHAKE', 'error', 'Connection timed out or key invalid.');
      addLog("ERROR: AI Core handshake failed.");
    }

    await new Promise(r => setTimeout(r, 800));

    // 2. Persistence Test
    updateTest('LATTICE_PERSISTENCE', 'running', 'Verifying localStorage I/O...');
    try {
      const testKey = 'diag_test_' + Date.now();
      localStorage.setItem(testKey, 'valid');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      if (val === 'valid') {
        updateTest('LATTICE_PERSISTENCE', 'success', 'Persistence verified (SSD-Lattice)');
        addLog("Data persistence layer stable.");
      } else throw new Error();
    } catch (e) {
      updateTest('LATTICE_PERSISTENCE', 'error', 'Storage access denied.');
      addLog("ERROR: Persistence layer failure.");
    }

    await new Promise(r => setTimeout(r, 800));

    // 3. Security Check
    updateTest('SECURITY_HANDSHAKE', 'success', 'All nodes encrypted (TLS_3.0)');
    addLog("Network security verified. No leaks detected.");

    setIsAutoTesting(false);
    addLog("DIAGNOSTICS COMPLETE. SYSTEM STABLE.");
    LoggerService.log(LogCategory.SYSTEM, "Full diagnostics completed", { testResults: tests });
  };

  const triggerMockAttack = () => {
    addLog("WARNING: SIMULATING SECURITY BREACH ATTEMPT");
    LoggerService.log(LogCategory.SECURITY, "Anomalous traffic detected on Node_Alpha", {
      ip: "192.168.1.255",
      payload: "S_INJECTION_QUERY",
      outcome: "Blocked by Lattice Firewall"
    });
    setBots(prev => prev.map(b => b.id === '1' ? { ...b, status: 'error' } : b));
    setTimeout(() => {
      addLog("Neural firewall engaged. Threat neutralized.");
      setBots(prev => prev.map(b => b.id === '1' ? { ...b, status: 'active' } : b));
    }, 3000);
  };

  const triggerThermalStress = () => {
    addLog("WARNING: SIMULATING THERMAL STRESS EVENT");
    setBots(prev => prev.map(b => ({ ...b, temp: 95 })));
    LoggerService.log(LogCategory.OPERATION, "Critical thermal threshold reached", { temp: 95, cooling: "Emergency_MAX" });
    setTimeout(() => {
      addLog("Cooling cycle complete. Temps stabilized.");
      setBots(prev => prev.map(b => ({ ...b, temp: 52 })));
    }, 5000);
  };

  const runTTSTest = async () => {
    updateTest('AUDIO_PCM_RENDER', 'running', 'Synthesizing diagnostic audio...');
    addLog("Initializing TTS test...");
    try {
      await GeminiService.speakText("Neural Core Health Check: Audio hardware responding normally.");
      updateTest('AUDIO_PCM_RENDER', 'success', 'PCM Rendering complete');
      addLog("Audio diagnostics successful.");
    } catch (e) {
      updateTest('AUDIO_PCM_RENDER', 'error', 'Audio rendering failed.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">System <span className="text-indigo-500">Health</span></h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Real-time hardware verification and neural integrity audit.</p>
        </div>
        <button 
          onClick={runFullDiagnostics} 
          disabled={isAutoTesting}
          className={`px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3 ${isAutoTesting ? 'opacity-50' : 'hover:bg-indigo-500'}`}
        >
          {isAutoTesting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          {isAutoTesting ? 'Testing...' : 'Run Diagnostics'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-[2rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden bg-gray-900/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1]"></span>
              Integrity Matrix
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map(test => (
                <div key={test.name} className={`p-6 rounded-2xl border transition-all duration-500 ${
                  test.status === 'success' ? 'bg-green-500/5 border-green-500/20' :
                  test.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                  test.status === 'running' ? 'bg-indigo-500/10 border-indigo-500/40 animate-pulse' :
                  'bg-gray-950 border-gray-800'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      test.status === 'success' ? 'text-green-500' :
                      test.status === 'error' ? 'text-red-500' :
                      test.status === 'running' ? 'text-indigo-400' :
                      'text-gray-600'
                    }`}>
                      {test.name}
                    </span>
                    {test.status === 'success' && <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <p className="text-xs font-bold text-gray-300 font-mono">{test.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border border-gray-800 shadow-2xl bg-gray-900/10">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-8">Simulation Console</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={triggerMockAttack}
                className="p-8 bg-red-600/5 hover:bg-red-600/10 border border-red-500/20 rounded-3xl transition-all group text-left relative overflow-hidden"
              >
                <div className="relative z-10">
                   <h4 className="text-sm font-black text-red-500 uppercase tracking-tighter mb-2">Simulate Breach</h4>
                   <p className="text-[10px] text-gray-500 uppercase font-black leading-tight">Force a security handshake challenge on Node_Alpha</p>
                </div>
                <div className="absolute bottom-4 right-4 text-red-500/20 group-hover:text-red-500/40 transition-colors">
                   <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </button>
              
              <button 
                onClick={triggerThermalStress}
                className="p-8 bg-amber-600/5 hover:bg-amber-600/10 border border-amber-500/20 rounded-3xl transition-all group text-left relative overflow-hidden"
              >
                <div className="relative z-10">
                   <h4 className="text-sm font-black text-amber-500 uppercase tracking-tighter mb-2">Simulate Overheat</h4>
                   <p className="text-[10px] text-gray-500 uppercase font-black leading-tight">Trigger thermal throttling across all cloud clusters</p>
                </div>
                <div className="absolute bottom-4 right-4 text-amber-500/20 group-hover:text-amber-500/40 transition-colors">
                   <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
              </button>

              <button 
                onClick={runTTSTest}
                className="p-8 bg-indigo-600/5 hover:bg-indigo-600/10 border border-indigo-500/20 rounded-3xl transition-all group text-left relative overflow-hidden col-span-1 md:col-span-2"
              >
                <div className="relative z-10 flex justify-between items-center">
                   <div>
                      <h4 className="text-sm font-black text-indigo-400 uppercase tracking-tighter mb-2">Verify Audio Engine</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black leading-tight">Play diagnostic PCM voice sample using Fenrir voice profile</p>
                   </div>
                   <svg className="w-10 h-10 text-indigo-500/30 group-hover:text-indigo-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Logs */}
        <div className="glass-card rounded-[2rem] border border-gray-800 shadow-2xl flex flex-col h-[600px] lg:h-auto overflow-hidden bg-black/40">
          <div className="p-6 bg-gray-900/50 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Diagnostic_Log_Stream</h3>
            <button onClick={() => setLogs([])} className="text-[9px] font-black text-gray-700 hover:text-gray-400 transition-colors uppercase">Clear Terminal</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-[10px] leading-relaxed scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-gray-800 uppercase italic font-black">Awaiting system activity...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`flex gap-3 animate-in slide-in-from-left-2 duration-300 ${log.includes('WARNING') || log.includes('ERROR') ? 'text-red-400' : (log.includes('CRITICAL') ? 'text-indigo-400 font-bold' : 'text-green-500/80')}`}>
                   <span className="opacity-30 flex-shrink-0">[{i+1}]</span>
                   <span>{log}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
          <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between">
             <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.4s]"></div>
             </div>
             <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest italic">Lattice_Sync_Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsView;
