
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService } from '../services/gemini';
import { ChatMessage, AspectRatio, LogCategory } from '../types';
import { GenerateContentResponse } from '@google/genai';
import { LoggerService } from '../services/logger';

const STORAGE_KEY = 'cloudmine_chat_history';
const DRAFT_KEY = 'cloudmine_chat_draft';
const SESSION_META_KEY = 'cloudmine_chat_meta';
const VOICE_MODE_KEY = 'cloudmine_voice_mode';

const AICommandCenter: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load chat history:", e);
      return [];
    }
  });

  const [inputText, setInputText] = useState(() => {
    return localStorage.getItem(DRAFT_KEY) || '';
  });

  const [sessionMeta, setSessionMeta] = useState(() => {
    const saved = localStorage.getItem(SESSION_META_KEY);
    return saved ? JSON.parse(saved) : { startedAt: Date.now(), lastSync: Date.now() };
  });

  const [isAutoReadEnabled, setIsAutoReadEnabled] = useState(() => {
    return localStorage.getItem(VOICE_MODE_KEY) === 'enabled';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('1:1');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [speakingMsgTimestamp, setSpeakingMsgTimestamp] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [streamingThinking, setStreamingThinking] = useState<string>('');
  const [isStreamThinkingExpanded, setIsStreamThinkingExpanded] = useState(true);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<number>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatSessionRef = useRef<any>(null);

  // Auto-save Messages and Meta
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    const newMeta = { ...sessionMeta, lastSync: Date.now() };
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(newMeta));
    setSessionMeta(newMeta);
  }, [messages]);

  // Save Voice Mode Preference
  useEffect(() => {
    localStorage.setItem(VOICE_MODE_KEY, isAutoReadEnabled ? 'enabled' : 'disabled');
  }, [isAutoReadEnabled]);

  // Auto-save Draft Input
  useEffect(() => {
    if (inputText) {
      setIsSavingDraft(true);
      localStorage.setItem(DRAFT_KEY, inputText);
      const timer = setTimeout(() => setIsSavingDraft(false), 800);
      return () => clearTimeout(timer);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [inputText]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse, streamingThinking, isThinking, isGeneratingImage]);

  const toggleThinking = (timestamp: number) => {
    setExpandedThinkingIds(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) next.delete(timestamp);
      else next.add(timestamp);
      return next;
    });
  };

  const handleSpeak = async (text: string, timestamp: number) => {
    if (speakingMsgTimestamp === timestamp) {
      GeminiService.stopSpeech();
      setSpeakingMsgTimestamp(null);
      return;
    }
    GeminiService.stopSpeech();
    setSpeakingMsgTimestamp(timestamp);
    try {
      await GeminiService.speakText(text, () => {
        setSpeakingMsgTimestamp(null);
      });
    } catch (err) {
      console.error("Speech generation error:", err);
      setSpeakingMsgTimestamp(null);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;

    const currentInput = inputText;
    const currentImage = attachedImage;
    
    const userMsg: ChatMessage = {
      role: 'user',
      content: currentInput,
      timestamp: Date.now(),
      image: currentImage || undefined
    };

    LoggerService.log(LogCategory.AI, "User command submitted", { prompt: currentInput, hasImage: !!currentImage });

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsLoading(true);
    setIsThinking(true);
    setStreamingResponse('');
    setStreamingThinking('');
    setIsStreamThinkingExpanded(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = GeminiService.createChatSession(messages);
      }

      const messageInput: any = currentImage ? [
        { text: currentInput || "Analyze this hardware setup." },
        { inlineData: { 
            data: currentImage.split(',')[1], 
            mimeType: currentImage.split(';')[0].split(':')[1] || 'image/jpeg' 
          } 
        }
      ] : currentInput;

      const stream = await chatSessionRef.current.sendMessageStream({ message: messageInput });
      let fullText = '';
      let fullThinking = '';

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const candidate = c.candidates?.[0];
        
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if ((part as any).thought) {
              fullThinking += (part as any).thought;
              setStreamingThinking(fullThinking);
            }
            if (part.text) {
              fullText += part.text;
              setStreamingResponse(fullText);
            }
          }
        }
        if (isThinking && (fullText.length > 0)) setIsThinking(false);
      }

      const assistantTimestamp = Date.now();
      const assistantContent = fullText || "Neural Core reported empty packet.";
      
      const newAssistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
        thinking: fullThinking || undefined,
        timestamp: assistantTimestamp
      };

      setMessages(prev => [...prev, newAssistantMsg]);

      if (isAutoReadEnabled) {
        handleSpeak(assistantContent, assistantTimestamp);
      }

    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.message || "Deployment failed.";
      LoggerService.log(LogCategory.AI, "AI command failure", { error: errorMsg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ INTERRUPT: ${errorMsg}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setStreamingResponse('');
      setStreamingThinking('');
    }
  };

  const handleGenerateImage = async () => {
    const prompt = inputText.trim();
    if (!prompt) return;

    setIsGeneratingImage(true);
    LoggerService.log(LogCategory.AI, "Asset Forge request", { prompt, aspectRatio: selectedRatio });
    
    try {
      const imageUrl = await GeminiService.generateAssetImage(prompt, selectedRatio);
      if (imageUrl) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Asset Forged: "${prompt}"`,
          image: imageUrl,
          timestamp: Date.now()
        }]);
        setInputText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setAttachedImage(dataUrl);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearChat = () => {
    if (confirm("Purge Neural History? This will erase all local logs and saved drafts.")) {
      LoggerService.log(LogCategory.SYSTEM, "Chat history and drafts purged");
      GeminiService.stopSpeech();
      setMessages([]);
      setInputText('');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(SESSION_META_KEY);
      setSessionMeta({ startedAt: Date.now(), lastSync: Date.now() });
      chatSessionRef.current = null;
    }
  };

  const ThinkingBlock: React.FC<{ text: string; isExpanded: boolean; onToggle: () => void; isStreaming?: boolean }> = ({ text, isExpanded, onToggle, isStreaming }) => (
    <div className="mb-5 overflow-hidden">
      <button 
        onClick={onToggle}
        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-indigo-400/70 hover:text-indigo-400 transition-all mb-3 group/trace"
      >
        <div className={`p-1 rounded bg-indigo-500/10 border border-indigo-500/20 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
          <span className="group-hover/trace:underline decoration-indigo-500/30">Neural Trace Log</span>
          {isStreaming && <span className="text-[8px] font-mono text-indigo-500/40">[{text.length} tokens]</span>}
        </div>
      </button>
      {isExpanded && (
        <div className={`bg-gray-950/40 border-l-2 border-indigo-500/30 rounded-r-2xl p-4 animate-in slide-in-from-top-1 duration-300 backdrop-blur-md ${isStreaming ? 'border-dashed' : 'border-solid'}`}>
          <p className="text-[11px] font-mono text-indigo-300/60 leading-relaxed whitespace-pre-wrap">
            {text}
            {isStreaming && <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-1"></span>}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-100px)] animate-in fade-in duration-700">
      <div className="lg:col-span-3 flex flex-col glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-gray-800/50 relative">
        <div className="bg-gray-950/80 backdrop-blur-md border-b border-gray-800 p-5 flex justify-between items-center z-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-white leading-none">Neural Command Core</h2>
                <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black">V3.5_PRO</span>
              </div>
              <p className="text-[9px] text-gray-500 font-mono mt-1 uppercase tracking-tighter">
                Session_Active: {new Date(sessionMeta.startedAt).toLocaleDateString()} @ {new Date(sessionMeta.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isAutoReadEnabled) GeminiService.stopSpeech();
                setIsAutoReadEnabled(!isAutoReadEnabled);
              }} 
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${isAutoReadEnabled ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/40' : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white'}`}
            >
              <svg className={`w-5 h-5 ${isAutoReadEnabled ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">{isAutoReadEnabled ? 'Voice: On' : 'Voice: Off'}</span>
            </button>
            <button onClick={clearChat} className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20" title="Purge Memory">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-indigo-500/10 hover:scrollbar-thumb-indigo-500/20 bg-[#030712]/40">
          {messages.length === 0 && !streamingResponse && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-24 h-24 bg-indigo-600/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10 animate-pulse">
                <svg className="w-12 h-12 text-indigo-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-xl font-black text-white uppercase tracking-tighter italic">Interface Standby</p>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">Persisted session state detected. Upload or capture hardware photos for a deep neural audit, or resume your previous command thread.</p>
              <div className="mt-8 flex gap-3 flex-wrap justify-center">
                 <button onClick={() => setInputText("Run deep audit on node distribution.")} className="px-3 py-1.5 rounded-lg border border-gray-800 text-[9px] font-black uppercase text-gray-500 hover:text-indigo-400 hover:border-indigo-500 transition-all">Deep Audit</button>
                 <button onClick={() => setInputText("Predict yield for next 24h cycle.")} className="px-3 py-1.5 rounded-lg border border-gray-800 text-[9px] font-black uppercase text-gray-500 hover:text-indigo-400 hover:border-indigo-500 transition-all">Yield Forecast</button>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-400 relative group`}>
              <div className={`max-w-[85%] rounded-[2.5rem] p-6 shadow-2xl relative transition-all ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-400/30' : 'bg-gray-900/80 text-gray-200 rounded-tl-none border border-gray-800 backdrop-blur-3xl'}`}>
                {m.role === 'assistant' && (
                  <div className="absolute -right-12 top-2 flex flex-col items-center gap-2">
                    <button 
                      onClick={() => handleSpeak(m.content, m.timestamp)} 
                      className={`p-2.5 rounded-xl transition-all hover:bg-white/10 ${speakingMsgTimestamp === m.timestamp ? 'text-indigo-400' : 'text-gray-700 opacity-0 group-hover:opacity-100'}`} 
                    >
                      {speakingMsgTimestamp === m.timestamp ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      )}
                    </button>
                    {speakingMsgTimestamp === m.timestamp && (
                      <div className="flex gap-0.5 items-end h-4">
                        {[1, 2, 3, 4].map(j => (
                          <div key={j} className="w-1 bg-indigo-500 rounded-full animate-wave" style={{ animationDelay: `${j * 0.1}s` }}></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {m.image && (
                  <div className="relative group/img mb-5 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                    <img src={m.image} alt="Audit Context" className="w-full h-auto transition-transform duration-700 group-hover/img:scale-110" />
                    <div className="absolute top-4 left-4 px-3 py-1 bg-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-2xl backdrop-blur-md">Audit Context</div>
                  </div>
                )}
                
                {m.thinking && (
                  <ThinkingBlock 
                    text={m.thinking} 
                    isExpanded={expandedThinkingIds.has(m.timestamp)} 
                    onToggle={() => toggleThinking(m.timestamp)} 
                  />
                )}

                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed font-medium text-[13px] tracking-tight">{m.content}</p>
                </div>
                <div className="text-[8px] opacity-30 mt-4 font-mono tracking-widest text-right uppercase">SYNC_ID: {m.timestamp.toString().slice(-8)}</div>
              </div>
            </div>
          ))}

          {(streamingThinking || streamingResponse || isThinking) && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="max-w-[85%] rounded-[2.5rem] rounded-tl-none p-6 bg-gray-900/80 text-gray-200 border border-indigo-500/20 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
                {isThinking && !streamingThinking && !streamingResponse && (
                  <div className="flex items-center space-x-4 animate-in fade-in duration-300">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Initializing Thinking Protocol...</span>
                  </div>
                )}

                {streamingThinking && (
                  <ThinkingBlock 
                    text={streamingThinking} 
                    isExpanded={isStreamThinkingExpanded} 
                    onToggle={() => setIsStreamThinkingExpanded(!isStreamThinkingExpanded)}
                    isStreaming={!streamingResponse}
                  />
                )}

                {streamingResponse && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="whitespace-pre-wrap leading-relaxed font-medium text-[13px] tracking-tight">
                      {streamingResponse}
                      <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle"></span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {isCameraActive && (
          <div className="absolute inset-0 bg-black/98 z-50 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative w-full max-w-3xl aspect-video rounded-[3rem] overflow-hidden border-2 border-indigo-500 shadow-[0_0_60px_rgba(99,102,241,0.2)]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale contrast-125" />
              <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-8 left-8 border-l-4 border-t-4 border-indigo-500 w-12 h-12 rounded-tl-2xl"></div>
                 <div className="absolute top-8 right-8 border-r-4 border-t-4 border-indigo-500 w-12 h-12 rounded-tr-2xl"></div>
                 <div className="absolute bottom-8 left-8 border-l-4 border-b-4 border-indigo-500 w-12 h-12 rounded-bl-2xl"></div>
                 <div className="absolute bottom-8 right-8 border-r-4 border-b-4 border-indigo-500 w-12 h-12 rounded-br-2xl"></div>
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-black uppercase tracking-widest text-indigo-400 bg-black/80 px-6 py-2.5 rounded-2xl backdrop-blur-xl border border-indigo-500/20 shadow-2xl">Lattice_Vision_Input: Monitoring</div>
            </div>
            <div className="flex space-x-4">
              <button onClick={stopCamera} className="px-10 py-4 bg-gray-900 text-gray-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-800 transition-all border border-gray-800">Abort Scan</button>
              <button onClick={captureSnapshot} className="px-12 py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/40 flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Capture Trace</span>
              </button>
            </div>
            <canvas ref={canvasRef} hidden />
          </div>
        )}

        <div className="p-8 bg-gray-950/80 border-t border-gray-800 backdrop-blur-3xl relative z-10">
          <div className="absolute top-0 left-8 -translate-y-1/2 flex items-center gap-3">
            {attachedImage && (
              <div className="relative inline-block animate-in zoom-in-95 duration-300">
                <img src={attachedImage} className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500 shadow-2xl" alt="Preview" />
                <button onClick={() => setAttachedImage(null)} className="absolute -top-2.5 -right-2.5 bg-red-600 text-white rounded-xl p-1.5 shadow-2xl hover:bg-red-500 transition-all border-2 border-gray-950">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            {inputText && (
               <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                  <div className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-1 h-1 rounded-full ${isSavingDraft ? 'bg-amber-400 scale-125' : 'bg-indigo-500 animate-pulse'} transition-all`}></span>
                    {isSavingDraft ? 'Syncing Draft...' : 'Draft Protected'}
                  </div>
               </div>
            )}
          </div>
          
          <div className="flex items-end space-x-4">
            <div className="flex space-x-2 flex-shrink-0">
               <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-4 bg-gray-900 hover:bg-gray-800 transition-all text-gray-500 hover:text-white border border-gray-800 rounded-2xl flex-shrink-0 active:scale-95 shadow-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></button>
               <button onClick={startCamera} disabled={isLoading} className="p-4 bg-gray-900 hover:bg-gray-800 transition-all text-gray-500 hover:text-white border border-gray-800 rounded-2xl flex-shrink-0 active:scale-95 shadow-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
            </div>
            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
            <div className="flex-1 relative group">
              <textarea 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                placeholder={attachedImage ? "Provide audit parameters for this image..." : "Initialize Command Protocol..."} 
                className="w-full bg-gray-950 text-white rounded-[1.5rem] p-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[60px] border border-gray-800 text-[13px] font-medium placeholder-gray-700 shadow-inner" 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || (!inputText.trim() && !attachedImage)} 
                className={`absolute right-4 bottom-4 p-2.5 rounded-xl transition-all shadow-2xl active:scale-90 ${isLoading || (!inputText.trim() && !attachedImage) ? 'text-gray-800 bg-transparent' : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/40'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="glass-card rounded-[2rem] p-8 space-y-8 shadow-2xl border-gray-800/50 bg-gray-900/10 backdrop-blur-3xl">
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Visual Forge</h3>
              <p className="text-[9px] text-gray-500 uppercase font-black">Lattice_Render_Engine</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest px-1">Dimension Protocol</label>
              <select value={selectedRatio} onChange={(e) => setSelectedRatio(e.target.value as AspectRatio)} disabled={isGeneratingImage} className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-4 py-4 text-[11px] font-black uppercase text-indigo-400 appearance-none text-center shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500/30">
                {['1:1', '3:4', '4:3', '9:16', '16:9'].map(ratio => (<option key={ratio} value={ratio}>{ratio}</option>))}
              </select>
            </div>
            <button onClick={handleGenerateImage} disabled={isGeneratingImage || !inputText.trim()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center justify-center space-x-3 shadow-2xl shadow-indigo-600/30 active:scale-95 overflow-hidden relative group">
                {isGeneratingImage && <div className="absolute inset-0 bg-indigo-400/20 animate-pulse"></div>}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <span className="relative z-10">{isGeneratingImage ? 'Forging Assets...' : 'Initialize Forge'}</span>
            </button>
          </div>
        </div>
        
        <div className="glass-card p-8 rounded-[2rem] border border-indigo-500/20 bg-indigo-600/5 flex flex-col items-center text-center space-y-6 shadow-2xl">
           <div className="w-16 h-16 bg-indigo-600/10 rounded-[1.5rem] flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
           </div>
           <div>
              <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2">Hardware Vision</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-medium">
                Neural core supports persistent real-time hardware recognition. <br />
                <span className="text-indigo-400/80">Voice mode allows for hands-free analysis readouts.</span>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AICommandCenter;
