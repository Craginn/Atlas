import React, { useCallback, useState } from 'react';
import { Play, RotateCcw, ChevronRight, ChevronDown, ArrowDown } from 'lucide-react';
import { formatPlayerAction, PlayerActionType } from '@/services/scriptingService';

/**
 * The action the Director submits. Do/Say/Story are the player action kinds AID
 * frames the input as; Continue carries no new text — the engine generates on
 * from the existing history — so it deliberately ignores the Input box.
 */
export type DirectorAction = PlayerActionType | 'continue';

const ACTIONS: { key: DirectorAction; label: string; help: string }[] = [
  { key: 'do', label: 'Do', help: 'An action — sent as "> You …"' },
  { key: 'say', label: 'Say', help: 'Speech — sent as "> You say "…""' },
  { key: 'story', label: 'Story', help: 'Narration, written as-is' },
  { key: 'continue', label: 'Continue', help: 'No new action — the AI writes on from the story so far' },
];

interface DirectorProps {
  onExecute: (input: string, context?: string, output?: string, action?: DirectorAction) => void;
  isProcessing: boolean;
  input: string;
  /** Extra Memory Bank lines for this run (was labelled "Context"). */
  context: string;
  output: string;
  /**
   * The scenario's opening text. AID sends this as the first turn's input on
   * load, which is how an engine script gets its start signal — without it the
   * first turn carries '' and setup work (character creation, world seeding)
   * never fires.
   */
  opening: string;
  /** The finished run's output — what the player would see. Read-only. */
  result: string;
  setInput: (value: string) => void;
  setContext: (value: string) => void;
  setOutput: (value: string) => void;
  setOpening: (value: string) => void;
  /** Last run sent no action at all but a filled AI Call — the classic mix-up. */
  misdirectedAnswer?: boolean;
  /** How many turns the adventure has had. */
  turn?: number;
  /** Clear the story history and saved state to start over. */
  onNewAdventure?: () => void;
}

const fieldClass =
  'w-full bg-zinc-950 rounded-md p-2.5 border border-zinc-800 focus:border-zinc-600 font-mono text-[13px] text-zinc-200 placeholder:text-zinc-600 resize-y focus:outline-none leading-relaxed';

/** A numbered step card. The numbers follow the order a turn actually runs in. */
const Step: React.FC<{ n: number; title: string; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }> = ({ n, title, sub, right, children }) => (
  <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
    <div className="flex items-start gap-2.5">
      <span className="mt-px w-5 h-5 shrink-0 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center justify-center">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-zinc-100 font-sans">{title}</h3>
        {sub && <p className="text-xs text-zinc-500 font-sans leading-snug mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

const Director: React.FC<DirectorProps> = ({
  onExecute, isProcessing, input, context, output, opening, result,
  setInput, setContext, setOutput, setOpening, misdirectedAnswer = false,
  turn, onNewAdventure,
}) => {
  // Which action kind the run submits. Do/Say/Story frame the Input; Continue
  // sends no new action at all.
  const [action, setAction] = useState<DirectorAction>('do');
  const [showOpening, setShowOpening] = useState(Boolean(opening.trim()));
  const [showMemories, setShowMemories] = useState(Boolean(context.trim()));
  const isContinue = action === 'continue';

  // Continue never carries new text; every other kind sends the Input, falling
  // back to the Opening when Input is empty.
  const usingOpening = !isContinue && !input.trim() && Boolean(opening.trim());
  const runInput = isContinue ? '' : (input.trim() ? input : opening);
  // The button says what will be sent, so a run never silently sends something
  // other than what was read on screen.
  const runLabel = isContinue ? 'Run turn (Continue)' : usingOpening ? 'Run turn (Opening)' : 'Run turn';

  // Exactly what the scripts will receive as the player's action.
  const preview = !isContinue && runInput.trim() ? formatPlayerAction(runInput, action as PlayerActionType).trim() : '';

  const run = useCallback(() => {
    if (!isProcessing) onExecute(runInput, context, output, action);
  }, [isProcessing, onExecute, runInput, context, output, action]);

  // Enter runs the turn; Shift+Enter makes a new line.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName === 'TEXTAREA') {
      e.preventDefault();
      run();
    }
  }, [run]);

  const current = ACTIONS.find(a => a.key === action)!;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-300" onKeyDown={handleKeyDown}>
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/70">
        <h2 className="text-sm font-semibold text-zinc-100">Director</h2>
        {turn !== undefined && (
          <span className="text-xs text-zinc-500" title="Turns played in this adventure">Turn {turn}</span>
        )}
        <span className="hidden lg:inline text-xs text-zinc-600 truncate">Play a turn through your scripts</span>
        {onNewAdventure && (
          <button
            type="button"
            onClick={onNewAdventure}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors"
            title="Clear the story history and saved state, and start from turn 1"
          >
            <RotateCcw size={13} /> New adventure
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {/* 1 — the player's action */}
        <Step
          n={1}
          title="What the player does"
          sub="Goes to the Input Modifier first."
        >
          <div className="flex rounded-md border border-zinc-800 overflow-hidden" role="group" aria-label="Action kind">
            {ACTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setAction(key)}
                aria-pressed={action === key}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  action === key ? 'bg-zinc-700 text-zinc-50' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{current.help}</p>

          {!isContinue && (
            <>
              <label htmlFor="director-input" className="sr-only">Input</label>
              <textarea
                id="director-input"
                className={fieldClass}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={usingOpening ? 'Empty — the Opening below will be sent' : 'e.g. pick up the sword'}
                rows={2}
              />
              <p className="text-xs text-zinc-500">The player's action. Answers to a script's question go here too.</p>
              {preview && (
                <p className="text-xs text-zinc-500 flex flex-wrap items-baseline gap-1.5">
                  <span>Scripts receive:</span>
                  <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-300/90 font-mono whitespace-pre-wrap break-all">{preview}</code>
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowOpening(s => !s)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                aria-expanded={showOpening}
              >
                {showOpening ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Opening{opening.trim() ? ' (set)' : ''} — the scenario's first text
              </button>
              {showOpening && (
                <div className="space-y-1">
                  <label htmlFor="director-opening" className="sr-only">Opening</label>
                  <textarea
                    id="director-opening"
                    className={fieldClass}
                    value={opening}
                    onChange={e => setOpening(e.target.value)}
                    placeholder="The scenario's opening text…"
                    rows={3}
                  />
                  <p className="text-xs text-zinc-500 leading-snug">
                    Sent as the action whenever Input is empty — the way AI Dungeon starts an adventure, so setup scripts get their first turn.
                  </p>
                </div>
              )}
            </>
          )}
        </Step>

        {/* 2 — optional memories */}
        <Step
          n={2}
          title="Memories (optional)"
          sub="Added to the Memory Bank before the Context Modifier runs."
          right={
            <button
              type="button"
              onClick={() => setShowMemories(s => !s)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              aria-expanded={showMemories}
            >
              {showMemories ? 'Hide' : context.trim() ? 'Edit' : 'Add'}
            </button>
          }
        >
          {showMemories && (
            <>
              <label htmlFor="director-memories" className="sr-only">Memories</label>
              <textarea
                id="director-memories"
                className={fieldClass}
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="One memory per line — e.g. The king owes you a favour."
                rows={3}
              />
              <p className="text-xs text-zinc-500">Saved to your Memory Bank (Plot Essentials page) when you run. Appears under "Memories:" in the context.</p>
            </>
          )}
        </Step>

        {/* 3 — the AI's reply */}
        <Step
          n={3}
          title="The AI's reply"
          sub="Atlas doesn't call a real AI — type what it might write. The Output Modifier receives this."
        >
          <label htmlFor="director-ai" className="sr-only">AI Call</label>
          <textarea
            id="director-ai"
            className={fieldClass}
            value={output}
            onChange={e => setOutput(e.target.value)}
            placeholder="e.g. The blade is cold and heavy in your hand."
            rows={2}
          />
          <p className="text-xs text-zinc-500">The AI's reply, not the player's. Leave it empty when a script writes the reply itself.</p>
        </Step>

        {misdirectedAnswer && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-xs text-amber-200 leading-relaxed">
              <span className="font-semibold">No action was sent.</span> Input and Opening were both
              empty, so the player action went out as <span className="font-mono">""</span> and only
              your AI reply reached the Output hook — a script asking a question saw no answer. Put
              the action in <span className="font-semibold">step 1</span> and run again.
            </p>
          </div>
        )}

        <div className="flex justify-center text-zinc-700" aria-hidden><ArrowDown size={14} /></div>

        {/* 4 — the result */}
        <Step n={4} title="What the player sees" right={<span className="text-[11px] uppercase tracking-wider text-zinc-600">read-only</span>}>
          <div className="w-full min-h-[4rem] max-h-48 overflow-y-auto custom-scrollbar bg-zinc-950 rounded-md p-2.5 border border-zinc-800 font-mono text-[13px] leading-relaxed">
            {result
              ? <pre className="whitespace-pre-wrap break-words text-emerald-300/90">{result}</pre>
              : <span className="text-zinc-600 italic">Sent to the player after the Output hook runs…</span>}
          </div>
        </Step>
      </div>

      {/* Pinned so running is always one click away, however long the steps get. */}
      <div className="shrink-0 px-4 py-3 border-t border-zinc-800/70 bg-zinc-950 space-y-1.5">
        <button
          className="w-full bg-emerald-600 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-50 hover:bg-emerald-500 transition-colors"
          onClick={run}
          disabled={isProcessing}
        >
          <Play size={16} />
          {isProcessing ? 'Running…' : runLabel}
        </button>
        <p className="text-center text-[11px] text-zinc-600">Enter to run · Shift+Enter for a new line</p>
      </div>
    </div>
  );
};

export default Director;
