
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LoggerService } from '../services/logger';
import { AuditLog, LogCategory } from '../types';

const CATEGORY_COLORS: Record<LogCategory, string> = {
  [LogCategory.SYSTEM]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [LogCategory.FINANCIAL]: 'bg-green-500/10 text-green-400 border-green-500/20',
  [LogCategory.SECURITY]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [LogCategory.OPERATION]: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  [LogCategory.AI]: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  [LogCategory.MARKETPLACE]: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const PAGE_SIZE = 20;

const MOCK_ACTIONS = [
  { category: LogCategory.OPERATION, action: "Neural node hashrate re-balanced", meta: { node: "Alpha-X-7", delta: "+4.2MH/s" } },
  { category: LogCategory.SYSTEM, action: "Lattice sync heartbeat pulse", meta: { latency: "14ms", status: "HEALTHY" } },
  { category: LogCategory.AI, action: "Yield curve re-calculation", meta: { asset: "BTC", confidence: 0.98 } },
  { category: LogCategory.OPERATION, action: "Thermal threshold check passed", meta: { avgTemp: "54C", cooling: "AUTO" } },
  { category: LogCategory.SECURITY, action: "Encrypted handshake verified", meta: { protocol: "TLS_1.3_AES_256", handshakeId: "SEC_SYNC_99" } },
  { category: LogCategory.FINANCIAL, action: "Bot performance payout calculated", meta: { botId: "HyperNode-Prime", amount: 14.50 } },
  { category: LogCategory.SYSTEM, action: "Shard migration initiated", meta: { region: "EU-West", target: "EU-Central" } }
];

type SortKey = 'timestamp' | 'category' | 'action';
type SortDirection = 'asc' | 'desc';

const MetadataNode: React.FC<{ data: any; label?: string; depth?: number }> = ({ data, label, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isTruncated, setIsTruncated] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data).length === 0;

  const handleCopy = (e: React.MouseEvent, val: any) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(val));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  };

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-gray-600 italic font-medium">null</span>;
    if (typeof val === 'string') {
      const isUrl = val.startsWith('http') || val.startsWith('bc1') || val.startsWith('0x');
      const displayStr = isTruncated && val.length > 80 ? `${val.substring(0, 80)}...` : val;
      return (
        <span className={`group/val inline-flex items-center gap-2 flex-wrap ${isUrl ? 'text-indigo-400 underline decoration-indigo-500/30' : 'text-emerald-400/90'}`}>
          <span className="break-all">"{displayStr}"</span>
          {val.length > 80 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsTruncated(!isTruncated); }}
              className="text-[8px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded hover:text-white transition-colors"
            >
              {isTruncated ? 'VIEW_FULL' : 'TRUNCATE'}
            </button>
          )}
          <button 
            onClick={(e) => handleCopy(e, val)}
            className="opacity-0 group-hover/val:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
            title="Copy value"
          >
            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </span>
      );
    }
    if (typeof val === 'number') return <span className="text-amber-500 font-bold font-mono">{val.toLocaleString()}</span>;
    if (typeof val === 'boolean') return <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${val ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>{val.toString()}</span>;
    return <span className="text-gray-300">{String(val)}</span>;
  };

  const getBadge = () => {
    if (data === null) return 'null';
    if (isArray) return 'arr';
    const type = typeof data;
    if (type === 'string') return 'str';
    if (type === 'number') return 'num';
    if (type === 'boolean') return 'bin';
    return 'obj';
  };

  if (!isObject) {
    return (
      <div className="flex items-start py-1 px-2 font-mono text-[11px] group hover:bg-white/5 rounded-lg transition-colors border-l-2 border-transparent hover:border-indigo-500/20">
        <span className="mr-3 opacity-20 text-[8px] font-black uppercase tracking-tighter self-center">{getBadge()}</span>
        {label && <span className="text-indigo-400/70 font-bold mr-2 select-none group-hover:text-indigo-400">{label}:</span>}
        {renderValue(data)}
        {copyFeedback && <span className="ml-3 text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-in fade-in zoom-in duration-300">Copied</span>}
      </div>
    );
  }

  return (
    <div className="font-mono text-[11px]">
      <div 
        className={`flex items-center py-1.5 cursor-pointer hover:bg-white/5 rounded-lg px-2 transition-all group ${depth > 0 ? 'ml-1' : ''}`}
        onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
      >
        <span className={`mr-2 transition-transform duration-300 ${isEmpty ? 'text-gray-700' : 'text-indigo-500 group-hover:text-indigo-400'} ${isExpanded ? 'rotate-90' : ''}`}>
          {isEmpty ? <div className="w-2.5" /> : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          )}
        </span>
        <span className="mr-3 opacity-20 text-[8px] font-black uppercase tracking-tighter">{getBadge()}</span>
        {label && <span className="text-indigo-400 font-black mr-2 uppercase tracking-tighter group-hover:text-indigo-300">{label}:</span>}
        <span className="text-gray-500 flex items-center gap-1.5">
          <span className="text-gray-600 font-bold">{isArray ? '[' : '{'}</span>
          {!isExpanded || isEmpty ? <span className="text-[10px] italic font-medium opacity-60">{isArray ? `${data.length} items` : `${Object.keys(data).length} keys`}</span> : null}
          {(!isExpanded || isEmpty) && <span className="text-gray-600 font-bold">{isArray ? ']' : '}'}</span>}
        </span>
        {isEmpty && <span className="ml-3 text-[9px] text-gray-700 font-black uppercase tracking-widest italic">empty</span>}
      </div>
      {isExpanded && !isEmpty && (
        <div className="ml-[1.1rem] pl-4 border-l border-indigo-500/10 hover:border-indigo-500/40 transition-colors mt-0.5 space-y-0.5 relative">
          <div className="absolute left-[-1px] top-0 bottom-4 w-[1px] bg-indigo-500/20 group-hover:bg-indigo-500/40 pointer-events-none"></div>
          {Object.entries(data).map(([key, value]) => (
            <MetadataNode key={key} label={isArray ? undefined : key} data={value} depth={depth + 1} />
          ))}
          <div className="py-1 px-2 text-gray-600 font-bold select-none opacity-40">{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  );
};

const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<LogCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingLogId, setInspectingLogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isLiveLedger, setIsLiveLedger] = useState(false);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [backgroundLogsCount, setBackgroundLogsCount] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'timestamp', direction: 'desc' });
  const liveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLogs(LoggerService.getLogs());

    const handleUpdate = (e: any) => {
      const newLog = e.detail as AuditLog;
      setLogs(LoggerService.getLogs());
      
      // Visual feedback logic
      setNewlyAddedIds(prev => new Set(prev).add(newLog.id));
      setTimeout(() => {
        setNewlyAddedIds(prev => {
          const next = new Set(prev);
          next.delete(newLog.id);
          return next;
        });
      }, 3000);

      // Background notification logic: if user isn't on page 1, notify them
      if (currentPage !== 1) {
        setBackgroundLogsCount(prev => prev + 1);
      }
    };

    window.addEventListener('audit-log-updated' as any, handleUpdate);
    return () => window.removeEventListener('audit-log-updated' as any, handleUpdate);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setInspectingLogId(null);
    setBackgroundLogsCount(0);
  }, [filter, searchQuery, sortConfig]);

  // Live Ledger Simulator: Increased frequency for "stream" effect
  useEffect(() => {
    if (isLiveLedger) {
      liveTimerRef.current = window.setInterval(() => {
        const mock = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
        LoggerService.log(mock.category, mock.action, mock.meta);
      }, 3000);
    } else if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
    }
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isLiveLedger]);

  const sortedAndFilteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      const matchesCategory = filter === 'ALL' || log.category === filter;
      const searchStr = searchQuery.toLowerCase();
      
      if (!searchQuery) return matchesCategory;

      const matchesText = 
        log.action.toLowerCase().includes(searchStr) ||
        log.category.toLowerCase().includes(searchStr) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchStr));

      return matchesCategory && matchesText;
    });

    return filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA = a[key] as any;
      let valB = b[key] as any;

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, filter, searchQuery, sortConfig]);

  const totalPages = Math.ceil(sortedAndFilteredLogs.length / PAGE_SIZE);
  
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredLogs.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredLogs, currentPage]);

  const handleClear = () => {
    if (confirm("Are you sure you want to purge the local audit ledger? This action will be logged.")) {
      LoggerService.clearLogs();
      setLogs(LoggerService.getLogs());
    }
  };

  const handleExportCSV = () => {
    if (sortedAndFilteredLogs.length === 0) return;
    setIsExporting(true);
    try {
      const headers = ['ID', 'Timestamp_Unix', 'UTC_Date', 'Category', 'Action', 'Metadata_JSON'];
      const rows = sortedAndFilteredLogs.map(log => [log.id, log.timestamp, new Date(log.timestamp).toISOString(), log.category, `"${log.action.replace(/"/g, '""')}"`, `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cloudmine_audit_export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const handleDownloadLogJSON = (log: AuditLog) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(log, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `trace_${log.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setInspectingLogId(null); 
    if (page === 1) setBackgroundLogsCount(0);
    document.getElementById('audit-table-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return <svg className="w-3 h-3 opacity-20 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortConfig.direction === 'asc' ? <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg> : <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>;
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button key={i} onClick={() => handlePageChange(i)} className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent hover:border-gray-800'}`}>{i}</button>
      );
    }
    return buttons;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-tight">Audit <span className="text-indigo-500">Ledger</span></h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Grounded session history and regulatory trace logs.</p>
          </div>
          {isLiveLedger && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-left-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-1">Live Feed</span>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_#6366f1]"></div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group w-full md:w-64">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Deep Scan Ledger..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-12 pr-4 py-2.5 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-700" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>

          <div className="flex bg-gray-950 p-1 rounded-2xl border border-gray-800 shadow-xl overflow-x-auto">
            <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'ALL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>All</button>
            {Object.values(LogCategory).map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === cat ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>{cat}</button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setIsLiveLedger(!isLiveLedger)} className={`p-2.5 rounded-2xl border transition-all shadow-lg flex items-center gap-2 group ${isLiveLedger ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-indigo-500/50 hover:text-indigo-400'}`}>
              <svg className={`w-5 h-5 ${isLiveLedger ? 'animate-spin [animation-duration:3s]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{isLiveLedger ? 'Live On' : 'Live Off'}</span>
            </button>
            <button onClick={handleExportCSV} disabled={sortedAndFilteredLogs.length === 0 || isExporting} className={`p-2.5 rounded-2xl border transition-all shadow-lg flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group ${isExporting ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse' : 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-600 hover:text-white'}`}>
              <svg className={`w-5 h-5 transition-transform ${isExporting ? 'animate-bounce' : 'group-hover:-translate-y-0.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg>
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">{isExporting ? 'Generating...' : 'CSV'}</span>
            </button>
            <button onClick={handleClear} className="p-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        </div>
      </div>

      {backgroundLogsCount > 0 && currentPage !== 1 && (
        <button 
          onClick={() => handlePageChange(1)}
          className="w-full py-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 hover:text-white transition-all animate-in slide-in-from-top-2 flex items-center justify-center gap-3 shadow-2xl backdrop-blur-xl"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          {backgroundLogsCount} New Traces Inbound - Return to Head
        </button>
      )}

      <div id="audit-table-root" className="glass-card rounded-[2.5rem] border border-gray-800/50 shadow-2xl overflow-hidden min-h-[600px] flex flex-col backdrop-blur-3xl">
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-gray-950/80 border-b border-gray-800/50 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">
              <tr>
                <th className="px-8 py-6 cursor-pointer group hover:text-indigo-400 transition-colors" onClick={() => handleSort('timestamp')}>
                  <div className="flex items-center gap-2">Trace ID / Time {renderSortIndicator('timestamp')}</div>
                </th>
                <th className="px-8 py-6 cursor-pointer group hover:text-indigo-400 transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-2">Category {renderSortIndicator('category')}</div>
                </th>
                <th className="px-8 py-6 cursor-pointer group hover:text-indigo-400 transition-colors" onClick={() => handleSort('action')}>
                  <div className="flex items-center gap-2">Action Payload {renderSortIndicator('action')}</div>
                </th>
                <th className="px-8 py-6 text-right">Registry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="font-black uppercase tracking-widest text-sm">No trace records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const isNew = newlyAddedIds.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-indigo-500/5 transition-all group animate-in fade-in slide-in-from-top-1 duration-500 ${inspectingLogId === log.id ? 'bg-indigo-500/[0.03]' : ''} ${isNew ? 'bg-indigo-600/10' : ''}`}>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                               {isNew && <div className="w-1 h-1 rounded-full bg-indigo-500 animate-ping"></div>}
                               <span className={`font-black text-[10px] mb-1 ${isNew ? 'text-indigo-400' : 'text-gray-500'}`}>#{log.id.split('-')[1]}</span>
                            </div>
                            <span className="text-gray-500 text-[9px] uppercase font-bold">{new Date(log.timestamp).toLocaleString([], { hour12: false, month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest shadow-sm ${CATEGORY_COLORS[log.category]}`}>{log.category}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-gray-200 font-bold text-[11px] leading-relaxed group-hover:text-white transition-colors">{log.action}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {log.metadata ? (
                            <button onClick={() => setInspectingLogId(inspectingLogId === log.id ? null : log.id)} className={`px-4 py-2 rounded-xl border transition-all font-black text-[9px] uppercase tracking-widest shadow-lg ${inspectingLogId === log.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-900 text-indigo-400 border-gray-800 hover:border-indigo-500'}`}>{inspectingLogId === log.id ? 'Close Audit' : 'Inspect Trace'}</button>
                          ) : (
                            <span className="text-gray-700 text-[10px] font-black uppercase italic select-none">No Metadata</span>
                          )}
                        </td>
                      </tr>
                      {inspectingLogId === log.id && log.metadata && (
                        <tr className="bg-black/40 animate-in slide-in-from-top-2 duration-300">
                          <td colSpan={4} className="px-10 py-8">
                            <div className="bg-[#030712]/60 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden group/audit">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-gray-800 pb-4 gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/20"><svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div>
                                  <div><h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Trace_Payload_Analysis</h4><span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Protocol: NEURAL_HIERARCHY_V4</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleDownloadLogJSON(log)} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-[9px] font-black text-gray-500 hover:text-white transition-all flex items-center gap-2">JSON</button>
                                  <button onClick={() => setInspectingLogId(null)} className="p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-600 hover:text-red-500 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                              </div>
                              <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 pr-4"><div className="p-2 border border-white/5 rounded-2xl bg-black/20"><MetadataNode data={log.metadata} /></div></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-gray-950/80 border-t border-gray-800/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
            <div className="flex items-center gap-4 order-2 md:order-1">
              <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-indigo-500 disabled:opacity-20 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-indigo-500 disabled:opacity-20 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <div className="flex items-center gap-1">{renderPaginationButtons()}</div>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-indigo-500 disabled:opacity-20 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
              <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-indigo-500 disabled:opacity-20 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
            </div>
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest order-1 md:order-2">Showing <span className="text-indigo-400 font-mono">{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, sortedAndFilteredLogs.length)}</span> of <span className="text-white font-mono">{sortedAndFilteredLogs.length}</span> records</div>
          </div>
        )}

        <div className="bg-gray-950/50 p-6 border-t border-gray-800/50 flex justify-between items-center">
           <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Traces Synchronized: {sortedAndFilteredLogs.length}</span>
           <span className="text-[9px] font-mono text-gray-700 uppercase">Grid_Session_Active: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogView;
