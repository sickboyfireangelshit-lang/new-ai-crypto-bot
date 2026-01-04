
import { AuditLog, LogCategory } from "../types";

const STORAGE_KEY = 'cloudmine_audit_ledger';

export class LoggerService {
  static getLogs(): AuditLog[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load audit ledger:", e);
      return [];
    }
  }

  static log(category: LogCategory, action: string, metadata?: Record<string, any>) {
    const newLog: AuditLog = {
      id: `LOG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: Date.now(),
      category,
      action,
      metadata
    };

    try {
      const logs = this.getLogs();
      const updatedLogs = [newLog, ...logs].slice(0, 500); // Keep last 500 entries
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
      
      // Dispatch event for UI updates if needed
      window.dispatchEvent(new CustomEvent('audit-log-updated', { detail: newLog }));
    } catch (e) {
      console.error("Failed to save audit log:", e);
    }
  }

  static clearLogs() {
    this.log(LogCategory.SECURITY, "Manual ledger purge initiated");
    localStorage.removeItem(STORAGE_KEY);
  }
}
