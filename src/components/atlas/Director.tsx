import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { PlayerActionType } from '@/services/scriptingService';

/**
 * The action the Director submits. Do/Say/Story are the player action kinds AID
 * frames the input as; Continue carries no new text — the engine generates on
 * from the existing history — so it deliberately ignores the Input box.
 */
export type DirectorAction = PlayerActionType | 'continue';

const ACTIONS: { key: DirectorAction; label: string }[] = [
  { key: 'do', label: 'Do' },
  { key: 'say', label: 'Say' },
  { key: 'story', label: 'Story' },
  { key: 'continue', label: 'Continue' },
];

interface DirectorProps {
  onExecute: (input: string, context?: string, output?: string, action?: DirectorAction) => void;
  isProcessing: boolean;
  input: string;
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
}

const Director: React.FC<DirectorProps> = ({
  onExecute, isProcessing, input, context, output, opening, result,
  setInput, setContext, setOutput, setOpening, misdirectedAnswer = false
}) => {
  // Which action kind Execute submits. Do/Say/Story frame the Input; Continue
  // sends no new action at all. Defaults to Do — the previous, only behavior.
  const [action, setAction] = useState<DirectorAction>('do');
  const isContinue = action === 'continue';

  // Continue never carries new text; every other kind sends the Input, falling
  // back to the Opening when Input is empty (the same one path as before).
  const runInput = isContinue ? '' : (input.trim() ? input : opening);
  // Always begins "Execute" so the run button never shares an accessible name
  // with the "Continue" kind toggle; the suffix says what will be sent.
  const runLabel = isContinue
    ? 'Execute (Continue)'
    : (!input.trim() && opening.trim() ? 'Execute (Opening)' : 'Execute');

  return (
  <div className="h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono">
    <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-zinc-800/50">
      <h2 className="text-sm font-semibold text-zinc-200">Director</h2>
    </div>
    {/* Scrolls: four blocks plus the button can outgrow a short panel, and the
        parent grid row is height-bounded so overflow would otherwise be clipped. */}
    <div className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
      {/* The opening IS the turn's input — AID sends it as the first action, and
          it flows Library → Input → Library → Context → AI call → Library →
          Output like any other action. It gets its own box only because it is
          scenario setup you paste once rather than retype each turn; Execute
          falls back to it whenever Input is empty, so there is no second button
          to forget. */}
      <div className="rounded-md ring-1 ring-inset ring-zinc-800/80 p-3">
        <label htmlFor="director-opening" className="text-xs font-semibold text-zinc-400">Opening</label>
        <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug">
          Used as the turn's input whenever Input is empty — the same path a
          player action takes.
        </p>
        <textarea
          id="director-opening"
          className="w-full bg-zinc-950 rounded-md p-2 mt-2 border-0 focus-within:ring-1 focus-within:ring-zinc-600 font-mono text-xs text-zinc-400 resize-none focus:outline-none leading-snug"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="The scenario's opening text…"
          rows={3}
        />
      </div>

      {[
        {
          label: 'Input', key: 'input', value: input, setter: setInput,
          hint: "The player's action. Answers to a script's question go here.",
          placeholder: 'Enter user input...',
        },
        { label: 'Context', key: 'context', value: context, setter: setContext, placeholder: 'Enter context...' },
        {
          label: 'AI Call', key: 'output', value: output, setter: setOutput,
          hint: "The AI's reply, not the player's. Leave empty when a script answers.",
          placeholder: 'Stand-in for the AI reply; the Output hook receives this...',
        },
      ].map(({ label, key, value, setter, placeholder, hint }) => (
        <div key={key}>
          <label className="text-xs font-semibold text-zinc-400">{label}</label>
          {hint && <p className="text-[10px] text-zinc-600 leading-snug">{hint}</p>}
          <textarea
            className="w-full bg-zinc-950 rounded-md p-2 mt-1 border-0 focus-within:ring-1 focus-within:ring-zinc-600 font-mono text-xs text-zinc-400 resize-none focus:outline-none leading-snug"
            value={value}
            onChange={(e) => setter(e.target.value)}
            placeholder={placeholder}
            rows={3}
          />
        </div>
      ))}

      {/* The run's result, not an input to it — the text the Output hook returned
          and the player receives. Kept read-only so it can't be mistaken for a
          field that feeds the next run. */}
      {misdirectedAnswer && (
        // Named rather than generic: this run sent an empty player action, and a
        // script rejecting "" reads as the app losing the answer that was typed.
        <div className="rounded-md bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 p-2.5">
          <p className="text-[11px] text-amber-300/90 leading-snug">
            <span className="font-semibold">No action was sent.</span> Input and Opening were
            both empty, so that run sent the player action as{' '}
            <span className="font-mono">""</span> and only your AI Call text reached the Output
            hook — a script asking a question saw no answer. Put the action in
            <span className="font-semibold"> Input</span> (or <span className="font-semibold">Opening</span>)
            and run again.
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-400">Output</label>
          <span className="text-[9px] uppercase tracking-widest text-zinc-600">read-only</span>
        </div>
        <div className="w-full min-h-[4.5rem] max-h-40 overflow-y-auto custom-scrollbar bg-zinc-950 rounded-md p-2 mt-1 ring-1 ring-inset ring-zinc-800/80 font-mono text-xs leading-snug">
          {result
            ? <pre className="whitespace-pre-wrap break-words text-green-300/90">{result}</pre>
            : <span className="text-zinc-600 italic">Sent to the player after the Output hook runs…</span>}
        </div>
      </div>

    </div>

    {/* Pinned footer so the trigger is always reachable — without it the Execute
        button sits at the bottom of the scrolling field stack and falls below the
        fold on short (esp. mobile) panels, forcing a scroll past every box to run.
        Pick the action kind, then run it. Do/Say/Story frame the Input the way AID
        does before any hook sees it; Continue sends no new action and generates on
        from history, so it ignores Input entirely. */}
    <div className="shrink-0 space-y-2 p-4 border-t border-zinc-800/50 bg-zinc-900">
        <div className="flex rounded-md ring-1 ring-inset ring-zinc-800 overflow-hidden" role="group" aria-label="Action kind">
          {ACTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAction(key)}
              aria-pressed={action === key}
              className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${
                action === key
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isContinue && (
          <p className="text-[10px] text-zinc-600 leading-snug">
            Continue sends no new action — the Input box is ignored and the engine
            generates on from the existing history.
          </p>
        )}
        {/* One button, one path. Input wins when it has text; otherwise the
            Opening is the action. The label says which, so a run never silently
            sends something other than what was read on screen. */}
        <button
          className="w-full bg-green-500 text-white rounded-md p-2 flex items-center justify-center disabled:opacity-50 hover:bg-green-600 transition-colors"
          onClick={() => onExecute(runInput, context, output, action)}
          disabled={isProcessing}
        >
          <Play className="mr-2" size={16} />
          {runLabel}
        </button>
    </div>
  </div>
  );
};

export default Director;
