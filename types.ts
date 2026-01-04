
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  MINING_BOTS = 'MINING_BOTS',
  AI_COMMAND = 'AI_COMMAND',
  MARKET_RESEARCH = 'MARKET_RESEARCH',
  ALGORITHMS = 'ALGORITHMS',
  DATA_CHAINS = 'DATA_CHAINS',
  SETTINGS = 'SETTINGS',
  WITHDRAW = 'WITHDRAW',
  AUDIT_LOG = 'AUDIT_LOG',
  DIAGNOSTICS = 'DIAGNOSTICS'
}

export enum LogCategory {
  SYSTEM = 'SYSTEM',
  FINANCIAL = 'FINANCIAL',
  SECURITY = 'SECURITY',
  OPERATION = 'OPERATION',
  AI = 'AI',
  MARKETPLACE = 'MARKETPLACE'
}

export interface AuditLog {
  id: string;
  timestamp: number;
  category: LogCategory;
  action: string;
  metadata?: Record<string, any>;
}

export interface MiningBot {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  hashrate: number; // in MH/s
  efficiency: number; // 0-1
  temp: number; // in Celsius
  profit24h: number;
  balance?: number; // Total accumulated balance
  algorithm: string;
  isAutoPilot?: boolean;
  lastAction?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  image?: string;
  sources?: { title: string; uri: string }[];
}

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
  complexity: string;
  category: 'Optimization' | 'Counting' | 'Heuristic' | 'Simulation';
  pros: string[];
  cons: string[];
  isPublished?: boolean;
  gumroadUrl?: string;
  price?: number;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
