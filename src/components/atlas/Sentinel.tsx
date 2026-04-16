import React from 'react';
import {
  Loader2, Search, CheckCircle2, Bug, ShieldCheck, Code2, Lightbulb,
  MinusCircle, PlusCircle, Activity, Play
} from 'lucide-react';
import { SentinelReport, SentinelError, ExecutionMode } from '@/types';

const CodeDiff: React.FC<{ error: SentinelError }> = ({ error }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-4">
    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center">
      <Code2 size={14} className="text-red-400 mr-3" />
      <span className="text-sm font-bold text-slate-300">
        {error.file} &bull; <span className="font-mono text-xs">Line {error.line}</span>
      </span>
    </div>
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-slate-400">{typeof error.reason === 'string' ? error.reason : error.reason.message}</p>
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-start space-x-2">
          <MinusCircle className="text-red-500/70 mt-0.5 shrink-0" size={14} />
          <pre className="text-red-300/70 break-all whitespace-pre-wrap">{error.originalCode}</pre>
        </div>
        <div className="flex items-start space-x-2">
          <PlusCircle className="text-green-500/70 mt-0.5 shrink-0" size={14} />
          <pre className="text-green-300 break-all whitespace-pre-wrap">{error.fixedCode}</pre>
        </div>
      </div>
    </div>
  </div>
);

interface SentinelProps {
  report: SentinelReport | null;
  isAnalyzing: boolean;
  runAnalysis: () => void;
  mode: ExecutionMode;
}

const Sentinel: React.FC<SentinelProps> = ({ report, isAnalyzing, runAnalysis, mode }) => (
  <div className="flex h-full bg-slate-950 text-slate-300 overflow-hidden font-sans select-none">
    <div className="flex-1 flex flex-col relative">
      <div className="h-12 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <ShieldCheck size={16} className={mode === 'remote' ? 'text-purple-500' : 'text-red-500'} />
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sentinel</span>
        </div>
        {report && (
          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            report.status === 'healthy' ? 'text-green-500 border-green-500/30 bg-green-500/5' :
            report.status === 'warning' ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' :
            'text-red-500 border-red-500/30 bg-red-500/5'
          }`}>
            Status: {report.status}
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden p-4 space-x-4">
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50 border border-slate-800/50 rounded-xl">
          <div className="flex-shrink-0 flex items-center space-x-3 p-4 border-b border-slate-800/50">
            <Search size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Findings</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-600">
                <Loader2 size={32} className="animate-spin text-sky-500" />
                <span className="text-sm font-bold uppercase tracking-widest">Analyzing Scripts...</span>
              </div>
            ) : report?.errors?.length ? (
              report.errors.map((error, idx) => <CodeDiff key={idx} error={error} />)
            ) : report?.errors?.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto" />
                  <p className="text-lg font-bold text-slate-300">All Systems Nominal</p>
                  <p className="text-sm text-slate-500">No errors found.</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-700 space-y-3">
                  <Bug size={40} className="mx-auto" />
                  <p className="font-bold text-slate-500">Awaiting Analysis</p>
                  <p className="text-xs max-w-xs mx-auto">Click &quot;Run Sentinel Analysis&quot; to check all scripts.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 flex-shrink-0 flex flex-col space-y-4">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 flex items-center space-x-3 p-4 border-b border-slate-800/50">
              <Activity size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Summary</h2>
            </div>
            <div className="p-4 text-sm text-slate-400 leading-relaxed overflow-y-auto custom-scrollbar flex-1">
              {isAnalyzing ? "Analysis in progress..." : report ? report.message : "Run an analysis to see a summary."}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl flex flex-col overflow-hidden">
            <div className="flex-shrink-0 flex items-center space-x-3 p-4 border-b border-slate-800/50">
              <Lightbulb size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Suggestions</h2>
            </div>
            <div className="p-4 space-y-2">
              {report?.suggestions?.length ? (
                report.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-slate-400">• {s}</p>
                ))
              ) : (
                <p className="text-xs text-slate-600 italic">No suggestions yet.</p>
              )}
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            <Play size={16} />
            <span>Run Sentinel Analysis</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Sentinel;
