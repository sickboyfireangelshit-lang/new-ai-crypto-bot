
import React, { useState, useCallback } from 'react';
import { GeminiService } from '../services/gemini';

type ResearchMode = 'intel' | 'predict';

const MarketResearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ResearchMode>('intel');
  const [results, setResults] = useState<{ text: string; sources: { title: string; uri: string }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleResearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResults(null);
    try {
      const data = mode === 'intel' 
        ? await GeminiService.searchLatestCrypto(query)
        : await GeminiService.predictYield(query);
      if (data) {
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!results || isSpeaking) return;
    setIsSpeaking(true);
    try {
      await GeminiService.speakText(results.text);
    } catch (err) {
      console.error("TTS Error:", err);
    } finally {
      setIsSpeaking(false);
    }
  };

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Neural Voice Protocol: Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      // Auto-trigger research after voice input for better UX
      setTimeout(() => {
        handleResearch();
      }, 500);
    };

    recognition.start();
  }, [handleResearch]);

  // Extract confidence score from text if available (mock/heuristic for UI display)
  const confidenceMatch = results?.text.match(/(\d+)%/);
  const confidenceScore = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-tighter italic">Market Intelligence</h1>
        <p className="text-gray-400 font-medium">Deep-dive into current market conditions and projected yield curves via Neural Scan.</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-gray-900/50 p-1 rounded-2xl border border-gray-800 flex space-x-1">
          <button 
            onClick={() => setMode('intel')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
              mode === 'intel' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span>Market Intel</span>
          </button>
          <button 
            onClick={() => setMode('predict')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
              mode === 'predict' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span>Yield Predictor</span>
          </button>
        </div>
      </div>

      <div className="relative group">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
          placeholder={isRecording ? "Listening to query..." : (mode === 'intel' ? "What is the current BTC network difficulty?" : "Project earnings for 4x RTX 4090 on NiceHash")}
          className={`w-full h-16 bg-gray-950/80 border rounded-2xl px-6 pr-32 focus:outline-none focus:ring-2 text-lg shadow-xl transition-all group-hover:border-gray-700 font-medium placeholder-gray-700 ${
            mode === 'intel' ? 'border-gray-800 focus:ring-indigo-500' : 'border-purple-500/30 focus:ring-purple-500'
          } ${isRecording ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
        />
        
        <div className="absolute right-3 top-3 bottom-3 flex items-center space-x-2">
          <button
            onClick={startVoiceInput}
            title="Voice Input"
            className={`p-3 rounded-xl transition-all flex items-center justify-center border ${
              isRecording 
                ? 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white hover:border-indigo-500'
            }`}
          >
            {isRecording ? (
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-4 bg-red-500 animate-[bounce_0.6s_infinite]"></div>
                <div className="w-1.5 h-6 bg-red-500 animate-[bounce_0.6s_infinite_0.1s]"></div>
                <div className="w-1.5 h-3 bg-red-500 animate-[bounce_0.6s_infinite_0.2s]"></div>
              </div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            )}
          </button>
          
          <button 
            onClick={handleResearch}
            disabled={isLoading || isRecording}
            className={`px-6 h-full text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-30 ${
              mode === 'intel' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Analyze</span>
            )}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6 animate-pulse mt-12">
          <div className="glass-card p-8 rounded-2xl border-indigo-500/20">
            <div className="h-4 w-48 bg-indigo-500/20 rounded-full mb-8"></div>
            <div className="space-y-4">
              <div className="h-3 bg-gray-800 rounded-full w-full"></div>
              <div className="h-3 bg-gray-800 rounded-full w-[92%]"></div>
              <div className="h-3 bg-gray-800 rounded-full w-[96%]"></div>
            </div>
          </div>
        </div>
      )}

      {results && !isLoading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {mode === 'predict' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-4 rounded-xl border border-purple-500/30 flex flex-col justify-center">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Neural Confidence</span>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${confidenceScore}%` }}></div>
                  </div>
                  <span className="text-sm font-mono text-purple-400 font-bold">{confidenceScore}%</span>
                </div>
              </div>
              <div className="glass-card p-4 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Forecast Range</span>
                <span className="text-white font-bold">7-Day Projection</span>
              </div>
              <div className="glass-card p-4 rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Data Freshness</span>
                <span className="text-green-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Real-time Grounded
                </span>
              </div>
            </div>
          )}

          <div className={`glass-card p-8 rounded-2xl leading-relaxed relative overflow-hidden border-indigo-500/30`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${mode === 'intel' ? 'bg-indigo-600' : 'bg-purple-600'}`}></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${mode === 'intel' ? 'text-indigo-400' : 'text-purple-400'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)] ${mode === 'intel' ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
                {mode === 'intel' ? 'Neural Analysis Summary' : 'Yield Projection Forecast'}
              </h3>
              <button 
                onClick={handleSpeak}
                disabled={isSpeaking}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
              >
                {isSpeaking ? (
                   <span className="flex items-center space-x-1">
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                   </span>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    <span>Read Analysis</span>
                  </>
                )}
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-gray-300">
              {results.text.split('\n').map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
            </div>
          </div>

          {results.sources.length > 0 && (
            <div className="glass-card p-6 rounded-2xl">
              <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                <span>Grounding Sources</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.sources.map((source, i) => (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm truncate flex justify-between items-center group"
                  >
                    <span className="truncate">{source.title}</span>
                    <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketResearch;
