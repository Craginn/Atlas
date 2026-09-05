import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Terminal, AlertTriangle, Bot, MessageSquare, ArrowRightToLine, ChevronDown, ChevronRight } from 'lucide-react';
import { SimulationResult, SentinelReport, LogType, LogEntry } from '@/types';
import { RobustLogViewer } from './RobustLogViewer';
import ExecutionTrace, { TraceEntry } from './ExecutionTrace';
import TabButton from '@/components/ui/TabButton';

interface HeimdallPanelProps {
  lastResult: (SimulationResult & { input?: string; context?: string }) | null;
  isProcessing: boolean;
  report: SentinelReport | null;
}

// One labelled channel of the run: the AI Call, the Output, or the state.message
// toast — each its own box so they're never conflated with one another.
const ChannelBox = ({ icon: Icon, label, tone, value, sub, empty }: {
  icon: any; label: string; tone: 'ai' | 'output' | 'message'; value: string; sub?: string; empty: string;
}) => {
  const tones = {
    ai: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
    output: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    message: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
  } as const;
  const has = Boolean(value && value.trim());
  return (
    <div className={`rounded-lg border p-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {sub && <span className="ml-auto text-[9px] font-mono opacity-70">{sub}</span>}
      </div>
      <div className={`text-xs font-mono whitespace-pre-wrap break-words ${has ? 'text-zinc-200' : 'text-zinc-600 italic'}`}>
        {has ? value : empty}
      </div>
    </div>
  );
};

const HeimdallPanel: React.FC<HeimdallPanelProps> = ({ lastResult, isProcessing, report }) => {
  const [activeTab, setActiveTab] = useState('logs');
  // Code suggestions are opt-in: a fresh failure always starts them collapsed,
  // so nothing code-level appears in the error area automatically.
  const [showSuggestions, setShowSuggestions] = useState(false);
  useEffect(() => { setShowSuggestions(false); }, [lastResult?.executionError]);

  // Surface the failure automatically: on an execution error, jump to Code Logs
  // where the red [ERROR] line lives.
  useEffect(() => {
    if (lastResult?.executionError || (lastResult?.scriptErrors?.length ?? 0) > 0) setActiveTab('trace');
  }, [lastResult?.executionError, lastResult?.scriptErrors]);

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

    // AI Call, Output, and state.message each have their own box above this stream
    // (see ChannelBox), so they're intentionally not duplicated as log entries here.

    if (isProcessing) {
      entries.push({
        id: idCounter++,
        type: LogType.SYSTEM,
        message: 'Simulating...',
        timestamp: now,
      });
    }

    return entries;
  }, [lastResult, isProcessing]);

  // The run, hook by hook, in fire order. Kept structured rather than flattened
  // into the log stream: the flat version regrouped by log type, which
  // interleaved the three hooks and made it impossible to see which one produced
  // what — the whole question you open this tab to answer.
  const trace: TraceEntry[] = useMemo(
    () => (Array.isArray(report?.executionTrace) ? report.executionTrace : []),
    [report],
  );

  // A hook threw this run: the engine stopped and the panel turns red.
  const hasExecutionError = Boolean(lastResult?.executionError);

  // Errors a script caught and only logged (console.error). The pipeline kept
  // running, but these are the silent crashes worth flagging — amber, not red.
  const scriptErrors = lastResult?.scriptErrors ?? [];
  const hasScriptErrors = !hasExecutionError && scriptErrors.length > 0;

  // The three separate channels of a run. The AI Call is the text sent through the
  // hooks and returned by the model; the Output is that text after the Output hook
  // manipulates it; state.message is a player-facing toast, wholly separate.
  const aiCall = lastResult?.aiCall;
  const aiCallText = aiCall?.simulated ?? '';
  // What the player actually sees. This is the pipeline's final output — the Output
  // hook's `return { text }`, or whatever seized it — NOT aiCall.final, which only
  // tracks the stand-in reply and so stays empty whenever a hook produced the text
  // by returning it rather than by overriding the AI call.
  const outputText = lastResult?.output ?? '';
  const stateMessage = lastResult?.stateMessage ?? '';
  // An empty AI Call means "the box was blank", not "generation was halted" — only
  // a missing aiCall means the run never reached the model.
  const aiCallEmptyText = aiCall
    ? '(AI Call box was empty — nothing stood in for the model)'
    : '(no AI call — generation was halted)';
  const showChannels = Boolean(lastResult) && !isProcessing && !hasExecutionError;

  return (
    <div className={`h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono transition-colors ${
      hasExecutionError ? 'ring-2 ring-inset ring-red-500/70' : ''
    }`}>
      <div className={`flex-shrink-0 flex items-center justify-between p-2 border-b ${
        hasExecutionError ? 'border-red-500/40' : 'border-zinc-800/50'
      }`}>
        <div className="flex items-center space-x-2">
          <TabButton label="Logs" icon={Terminal} active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <TabButton label="Code Logs" icon={Activity} active={activeTab === 'trace'} onClick={() => setActiveTab('trace')} />
        </div>
        {hasExecutionError && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} />
            Engine Stopped
          </span>
        )}
        {hasScriptErrors && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} />
            {scriptErrors.length} Caught Error{scriptErrors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {hasScriptErrors && (
        <div className="flex-shrink-0 px-3 py-2 bg-amber-950/40 border-b border-amber-500/30 text-[11px] text-amber-300">
          <span className="font-bold">CAUGHT ERROR{scriptErrors.length > 1 ? 'S' : ''}</span>
          {' — a script logged an error but did not stop (possible silent crash):'}
          <ul className="mt-1 space-y-0.5">
            {scriptErrors.map((e, i) => (
              <li key={i}>
                <span className="text-amber-200">"{e.hook}"</span>
                {': '}
                <span className="text-amber-200">{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasExecutionError && lastResult?.executionError && (
        <div className="flex-shrink-0 px-3 py-2 bg-red-950/40 border-b border-red-500/30 text-[11px] text-red-300">
          <span className="font-bold">EXECUTION ERROR</span>
          {' — Hook: '}
          <span className="text-red-200">"{lastResult.executionError.hook}"</span>
          {' at line: '}
          <span className="text-red-200">"{lastResult.executionError.line}"</span>
          {': '}
          <span className="text-red-200">"{lastResult.executionError.message}"</span>
        </div>
      )}

      {hasExecutionError && lastResult?.executionError?.details && (
        <div className="flex-shrink-0 px-3 py-1.5 bg-red-950/20 border-b border-red-500/30">
          <button
            onClick={() => setShowSuggestions(s => !s)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-200"
          >
            {showSuggestions ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            Code Suggestions
          </button>
          {showSuggestions && (
            <div className="mt-1.5 rounded-md border border-red-500/25 bg-black/40 overflow-hidden">
              <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-400/80 border-b border-red-500/25">
                Code Suggestions
              </div>
              <pre className="px-2 py-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[10px] leading-snug text-red-200/90">
                {lastResult.executionError.details}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'logs' && (
          <div className="flex-1 min-h-0 flex flex-col">
            {showChannels && (
              <div className="flex-shrink-0 p-2 space-y-2 border-b border-zinc-800/50 overflow-y-auto max-h-[45%]">
                <ChannelBox
                  icon={Bot} label="AI Call" tone="ai"
                  value={aiCallText}
                  sub={aiCall?.overridden ? 'no generation — halted' : undefined}
                  empty={aiCallEmptyText}
                />
                <ChannelBox
                  icon={ArrowRightToLine} label="Output" tone="output"
                  value={outputText}
                  empty="(nothing sent to output)"
                />
                <ChannelBox
                  icon={MessageSquare} label="state.message" tone="message"
                  value={stateMessage}
                  sub={lastResult?.stateMessageAuthor ? `set by ${lastResult.stateMessageAuthor}` : undefined}
                  empty="(no toast raised)"
                />
              </div>
            )}
            <RobustLogViewer
              logs={mainLogs}
              className="flex-1"
              initiallyCollapsed={[]}
            />
          </div>
        )}

        {activeTab === 'trace' && <ExecutionTrace trace={trace} className="flex-1 min-h-0" />}
      </div>
    </div>
  );
};

export default HeimdallPanel;
