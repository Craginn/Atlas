import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Activity, Terminal, AlertTriangle } from 'lucide-react';
import { SimulationResult, SentinelReport } from '@/types';

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
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastResult?.narration, isProcessing]);

  const executionTrace = Array.isArray(report?.executionTrace) ? report.executionTrace : [];

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono">
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-zinc-800/50">
        <div className="flex items-center space-x-2">
          <TabButton label="Logs" icon={Terminal} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <TabButton label="Code Logs" icon={Activity} active={activeTab === 'trace'} onClick={() => setActiveTab('trace')} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'logs' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 text-xs space-y-4 break-words">
            {lastResult?.input && (
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span className="text-purple-300 flex-1">Input: {lastResult.input}</span>
              </div>
            )}
            {lastResult?.context && (
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span className="text-blue-300 flex-1">Context: {lastResult.context}</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-start gap-2">
                <div className="animate-spin rounded-full border-2 border-t-blue-500 border-zinc-700 h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-500 italic">Simulating...</span>
              </div>
            )}
            {lastResult?.narration && !isProcessing && (
              <div className="flex items-start gap-2 bg-zinc-800/30 p-2 rounded border border-zinc-700/50">
                <ChevronRight className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300 flex-1 whitespace-pre-wrap text-xs">Actual Output: {lastResult.narration}</span>
              </div>
            )}
            <div ref={endOfLogsRef} />
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs">
            {report?.executionTrace?.error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 break-words">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <h4 className="font-bold text-red-400">Validation Error</h4>
                </div>
                <p className="text-red-300 font-mono break-words whitespace-pre-wrap text-xs leading-relaxed">{report.executionTrace.error}</p>
              </div>
            )}
            {executionTrace.length > 0 ? (
              executionTrace.map((trace: any, index: number) => (
                <div key={index} className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <h3 className="flex-shrink-0 font-bold text-zinc-400 p-3 pb-2 uppercase tracking-wider text-xs border-b border-zinc-800">{trace.scriptName}</h3>
                  {trace.logs?.length > 0 ? (
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2 text-xs">
                      {trace.logs.map((log: any, logIndex: number) => (
                        <div key={logIndex} className="flex gap-2 text-zinc-400">
                          <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                          <pre className="flex-1 whitespace-pre-wrap break-words text-xs bg-zinc-900/50 p-2 rounded border border-zinc-800/50 overflow-x-auto">{typeof log === 'object' ? JSON.stringify(log, null, 2) : log}</pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-600 italic text-xs p-3">No output from this script.</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-600 py-10">No code execution.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeimdallPanel;
