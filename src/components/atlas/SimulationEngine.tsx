import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import Director, { DirectorAction } from './Director';
import HeimdallPanel from './HeimdallPanel';
import { LastSimData, SentinelReport } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface SimulationEngineProps {
  onExecute: (input: string, context?: string, output?: string, action?: DirectorAction) => void;
  isProcessing: boolean;
  lastResult: LastSimData | null;
  report: SentinelReport | null;
  /**
   * The Input box, owned by the page so other views can read it — the Block
   * Canvas binds it to `text` for scratch runs. Context/output stay local
   * because nothing outside the Director needs them.
   */
  input: string;
  setInput: (value: string) => void;
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({
  onExecute, isProcessing, lastResult, report, input, setInput
}) => {
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');
  const [opening, setOpening] = useState('');
  const isMobile = useIsMobile();
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  const hasIssue = Boolean(lastResult?.executionError) || (lastResult?.scriptErrors?.length ?? 0) > 0;

  const misdirectedAnswer =
    !!lastResult &&
    !lastResult.isProcessing &&
    lastResult.actionType !== 'continue' &&
    !lastResult.input?.trim() &&
    !!lastResult.aiCall?.simulated?.trim();

  const directorProps = {
    onExecute, isProcessing,
    input, context, output, opening,
    result: lastResult?.output ?? '',
    setInput, setContext, setOutput,
    setOpening,
    misdirectedAnswer,
  };

  if (isMobile) {
    return (
      <div className="h-full flex flex-col text-white bg-zinc-950">
        <div className="bg-zinc-950 flex flex-col min-h-0 min-w-0 flex-1">
          <Director {...directorProps} />
        </div>
        <div className={`bg-zinc-950 flex flex-col min-h-0 min-w-0 border-t border-zinc-800/50 ${
          logsCollapsed ? 'shrink-0' : 'flex-1'
        }`}>
          <button
            type="button"
            onClick={() => setLogsCollapsed(c => !c)}
            aria-expanded={!logsCollapsed}
            className={`shrink-0 flex items-center gap-2 px-3 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800/60 transition-colors ${
              hasIssue ? 'text-amber-300' : 'text-zinc-300'
            }`}
          >
            <Activity size={14} />
            <span>Code Logs</span>
            {logsCollapsed && hasIssue && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="has errors" />
            )}
            {logsCollapsed
              ? <ChevronUp size={16} className="ml-auto" />
              : <ChevronDown size={16} className="ml-auto" />}
          </button>
          {!logsCollapsed && (
            <div className="flex-1 min-h-0">
              <HeimdallPanel lastResult={lastResult} isProcessing={isProcessing} report={report} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col text-white bg-zinc-950">
      {/* The row is explicitly minmax(0,1fr) rather than the default `auto`: an
          auto row grows to fit its content, so the panels below never receive a
          bounded height to scroll within and their overflow just gets clipped.
          Below `md` the two panels stack into scrollable rows instead — side by
          side they'd be ~180px wide each on a phone. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] gap-px bg-zinc-800/50 overflow-hidden">
        <div className="bg-zinc-950 flex flex-col min-h-0 min-w-0">
          <Director {...directorProps} />
        </div>
        <div className="bg-zinc-950 flex flex-col min-h-0 min-w-0">
          <HeimdallPanel lastResult={lastResult} isProcessing={isProcessing} report={report} />
        </div>
      </div>
    </div>
  );
};

export default SimulationEngine;
