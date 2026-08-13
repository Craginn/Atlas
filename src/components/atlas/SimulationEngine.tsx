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
  // The scenario opening. Kept here alongside context/output because nothing
  // outside the Director reads it.
  const [opening, setOpening] = useState('');
  const isMobile = useIsMobile();
  // On mobile the Director and Code Logs share the screen 50/50, which leaves
  // the Director too short to reach its Execute button without scrolling. Let
  // the logs collapse to a header bar so the Director can take the full height
  // when the player just wants to trigger a run.
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  // Draw attention when a collapsed panel is hiding a failure the user should see.
  const hasIssue = Boolean(lastResult?.executionError) || (lastResult?.scriptErrors?.length ?? 0) > 0;

  // The Director asks for two texts per turn and they are easy to confuse: Input
  // is the player's action, AI Call is the model's stand-in reply. Answering a
  // script's question in AI Call sends the hook an empty action, which engines
  // read as an invalid answer — the failure surfaces as the script rejecting
  // input the player believes they gave. Catch that exact shape and name it.
  // A Continue run sends an empty action *on purpose*, so it's never the mix-up.
  const misdirectedAnswer =
    !!lastResult &&
    !lastResult.isProcessing &&
    lastResult.actionType !== 'continue' &&
    !lastResult.input?.trim() &&
    !!lastResult.aiCall?.simulated?.trim();

  // Linked files used to be copied into these three boxes, which conflated two
  // unrelated things: the file-linking slots hold the *hook scripts* (Input
  // Modifier, Context Modifier, Output Modifier), while these boxes hold a
  // turn's player action, context, and stand-in AI reply. Linking an Input
  // Modifier therefore pasted a JavaScript file into the player-action box.
  // The slots now load into the script editor, where they belong.

  if (isMobile) {
    return (
      <div className="h-full flex flex-col text-white bg-zinc-950">
        {/* Director takes whatever the collapsed logs don't; collapsing frees the
            full height so its Execute button is reachable without scrolling. */}
        <div className="bg-zinc-950 flex flex-col min-h-0 min-w-0 flex-1">
          <Director
            onExecute={onExecute} isProcessing={isProcessing}
            input={input} context={context} output={output} opening={opening}
            result={lastResult?.output ?? ''}
            setInput={setInput} setContext={setContext} setOutput={setOutput}
            setOpening={setOpening}
            misdirectedAnswer={misdirectedAnswer}
          />
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
          <Director
            onExecute={onExecute} isProcessing={isProcessing}
            input={input} context={context} output={output} opening={opening}
            result={lastResult?.output ?? ''}
            setInput={setInput} setContext={setContext} setOutput={setOutput}
            setOpening={setOpening}
            misdirectedAnswer={misdirectedAnswer}
          />
        </div>
        <div className="bg-zinc-950 flex flex-col min-h-0 min-w-0">
          <HeimdallPanel lastResult={lastResult} isProcessing={isProcessing} report={report} />
        </div>
      </div>
    </div>
  );
};

export default SimulationEngine;
