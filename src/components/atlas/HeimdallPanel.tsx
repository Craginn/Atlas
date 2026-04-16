import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Activity, Terminal, AlertTriangle } from 'lucide-react';
import { SimulationResult, SentinelReport, LogType, LogEntry } from '@/types';
import { RobustLogViewer } from './RobustLogViewer';

interface HeimdallPanelProps {
  lastResult: (SimulationResult & { input?: string; context?: string }) | null;
  isProcessing: boolean;
  report: SentinelReport | null;
}

const TabButton = ({ label, icon: Icon, active, onClick }: { label: string; icon: any; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
      active ? 'bg-zinc-700/50 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
    }`}
  >
    <Icon size={14} />
    <span>{label}</span>
  </button>
);

const HeimdallPanel: React.FC<HeimdallPanelProps> = ({ lastResult, isProcessing, report }) => {
  const [activeTab, setActiveTab] = useState('logs');

  // Transform simulation logs into LogEntry format
  const mainLogs: LogEntry[] = useMemo(() => {
    const entries: LogEntry[] = [];
    let idCounter = 0;
    const now = new Date().toISOString();

    if (lastResult?.input) {
      entries.push({
        id: idCounter++,
        type: LogType.USER,
        message: `Input: ${lastResult.input}`,
        timestamp: now,
      });
    }

    if (lastResult?.context) {
      entries.push({
        id: idCounter++,
        type: LogType.INFO,
        message: `Context: ${lastResult.context}`,
        timestamp: now,
      });
    }

    if (isProcessing) {
      entries.push({
        id: idCounter++,
        type: LogType.SYSTEM,
        message: 'Simulating...',
        timestamp: now,
      });
    }

    if (lastResult?.narration && !isProcessing) {
      entries.push({
        id: idCounter++,
        type: LogType.INFO,
        message: `Actual Output: ${lastResult.narration}`,
        timestamp: now,
      });
    }

    return entries;
  }, [lastResult, isProcessing]);

  // Transform execution trace logs
  const traceLogs: LogEntry[] = useMemo(() => {
    const entries: LogEntry[] = [];
    let idCounter = 0;

    if (report?.executionTrace?.error) {
      entries.push({
        id: idCounter++,
        type: LogType.ERROR,
        message: report.executionTrace.error,
        timestamp: new Date().toISOString(),
      });
    }

    const executionTrace = Array.isArray(report?.executionTrace) ? report.executionTrace : [];

    executionTrace.forEach((trace: any) => {
      (trace.logs || []).forEach((log: any, logIndex: number) => {
        entries.push({
          id: idCounter++,
          type: LogType.SYSTEM,
          message: typeof log === 'object' ? JSON.stringify(log, null, 2) : String(log),
          timestamp: new Date().toISOString(),
        });
      });
    });

    return entries;
  }, [report]);

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono">
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-zinc-800/50">
        <div className="flex items-center space-x-2">
          <TabButton label="Logs" icon={Terminal} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <TabButton label="Code Logs" icon={Activity} active={activeTab === 'trace'} onClick={() => setActiveTab('trace')} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'logs' && (
          <RobustLogViewer
            logs={mainLogs}
            className="flex-1"
            initiallyCollapsed={[]}
          />
        )}

        {activeTab === 'trace' && (
          <RobustLogViewer
            logs={traceLogs}
            className="flex-1"
            initiallyCollapsed={[LogType.ERROR]}
          />
        )}
      </div>
    </div>
  );
};

export default HeimdallPanel;
