import React, { useMemo, useState } from 'react';
import { Wand2, X, ArrowLeft } from 'lucide-react';
import type { Recipe } from '@/services/blocks/guide';
import { RichText } from './ProblemCard';

// "Help me write this": pick a plain-language recipe, fill in the blanks, see
// the code it produces, insert it. For people who know what they want to
// happen but not how to write it.

interface Props {
  recipes: Recipe[];
  /** What the field currently holds, so a condition can be combined with it. */
  current: string;
  kind: 'condition' | 'action';
  onInsert: (code: string) => void;
  onClose: () => void;
}

const RecipePicker: React.FC<Props> = ({ recipes, current, kind, onInsert, onClose }) => {
  const [picked, setPicked] = useState<Recipe | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [combine, setCombine] = useState<'replace' | 'and' | 'or'>('replace');

  const code = useMemo(() => (picked ? picked.build(values) : ''), [picked, values]);
  const canCombine = kind === 'condition' && current.trim() !== '' && current.trim() !== 'true';
  const final = combine === 'replace' || !canCombine ? code : `(${current.trim()}) ${combine === 'and' ? '&&' : '||'} (${code})`;

  const pick = (r: Recipe) => {
    setPicked(r);
    setValues(Object.fromEntries(r.inputs.map(i => [i.key, i.defaultValue ?? ''])));
  };

  return (
    <div
      className="absolute z-30 mt-1 w-80 max-w-[90vw] rounded-xl border border-violet-500/40 bg-[#111018] shadow-2xl text-[11px] text-zinc-200"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        {picked ? (
          <button onClick={() => setPicked(null)} className="text-zinc-400 hover:text-white" aria-label="Back"><ArrowLeft size={13} /></button>
        ) : (
          <Wand2 size={13} className="text-violet-300" />
        )}
        <span className="font-semibold">{picked ? picked.label : kind === 'condition' ? 'When should this happen?' : 'What should happen?'}</span>
        <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-white" aria-label="Close"><X size={13} /></button>
      </div>

      {!picked ? (
        <div className="max-h-72 overflow-y-auto p-1.5">
          {recipes.map(r => (
            <button key={r.id} onClick={() => pick(r)} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-violet-500/10">
              <div className="text-zinc-100">{r.label}</div>
              <div className="text-[11px] text-zinc-500 leading-snug"><RichText text={r.why} /></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          <p className="text-[11px] text-zinc-400 leading-snug"><RichText text={picked.why} /></p>
          {picked.inputs.map(input => (
            <label key={input.key} className="block">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">{input.label}</span>
              {input.options ? (
                <select
                  value={values[input.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [input.key]: e.target.value }))}
                  className="mt-0.5 w-full bg-black/50 border border-zinc-700 rounded px-2 py-1 outline-none focus:border-violet-500/60"
                >
                  {input.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  autoFocus={picked.inputs[0] === input}
                  value={values[input.key] ?? ''}
                  placeholder={input.placeholder}
                  onChange={e => setValues(v => ({ ...v, [input.key]: e.target.value }))}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="mt-0.5 w-full bg-black/50 border border-zinc-700 rounded px-2 py-1 outline-none focus:border-violet-500/60"
                />
              )}
            </label>
          ))}
          {canCombine && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-zinc-500">Existing condition:</span>
              {(['replace', 'and', 'or'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCombine(c)}
                  className={`px-1.5 py-0.5 rounded border ${combine === c ? 'border-violet-400/60 text-violet-200 bg-violet-500/10' : 'border-zinc-700 text-zinc-400'}`}
                >
                  {c === 'replace' ? 'replace it' : c === 'and' ? 'AND both' : 'OR either'}
                </button>
              ))}
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Code it writes</span>
            <pre className="mt-0.5 px-2 py-1 rounded bg-black/60 border border-zinc-800 font-mono text-[11px] text-emerald-200 whitespace-pre-wrap break-all">{final}</pre>
          </div>
          <button
            onClick={() => { onInsert(final); onClose(); }}
            className="w-full py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-500 text-white font-semibold"
          >
            Use this
          </button>
        </div>
      )}
    </div>
  );
};

export default RecipePicker;
