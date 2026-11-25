import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Microscope, Upload, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import JsonEditor from './JsonEditor';
import {
  lineDiff, parseProbeExport, rebuildWithAtlas, segmentContext, similarity, SEGMENT_LABELS,
  type DiffOp, type ProbeRecord, type SegmentId,
} from '@/services/contextLab';

// Context Lab: import captures from the AID Probe scripts (repo folder
// `AID Probe/`) running in a real AI Dungeon scenario, see the real context
// split into its sections, and diff it against what Atlas assembles from the
// same parts. See src/services/contextLab.ts for the pipeline.

const PROBE_FILES = import.meta.glob('../../../AID Probe/*.js', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const PROBE_ORDER = ['Library.js', 'Input.js', 'Context.js', 'Output.js'];
const STORAGE_KEY = 'atlas.contextLab.import';

const SEG_CLASS: Record<SegmentId, string> = {
  plotEssentials: 'border-sky-500/40 bg-sky-500/5 text-sky-300',
  worldLore: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
  storySummary: 'border-violet-500/40 bg-violet-500/5 text-violet-300',
  memories: 'border-fuchsia-500/40 bg-fuchsia-500/5 text-fuchsia-300',
  recentStory: 'border-zinc-500/40 bg-zinc-500/5 text-zinc-300',
  authorsNote: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
  lastAction: 'border-orange-500/40 bg-orange-500/5 text-orange-300',
  frontMemory: 'border-rose-500/40 bg-rose-500/5 text-rose-300',
  unknown: 'border-red-500/50 bg-red-500/10 text-red-300',
};

const Chip: React.FC<{ label: string; value: React.ReactNode; title?: string }> = ({ label, value, title }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono" title={title}>
    <span className="text-zinc-500">{label}</span>
    <span className="text-zinc-200">{value}</span>
  </span>
);

const CopyProbeButton: React.FC<{ file: string }> = ({ file }) => {
  const [done, setDone] = useState(false);
  const loader = Object.entries(PROBE_FILES).find(([p]) => p.endsWith(`/${file}`))?.[1];
  return (
    <button
      disabled={!loader}
      onClick={async () => {
        if (!loader) return;
        await navigator.clipboard.writeText(await loader());
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-700 text-[10px] font-mono text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
    >
      {done ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />} {file}
    </button>
  );
};

/** Unified diff with long unchanged runs folded. */
const DiffView: React.FC<{ ops: DiffOp[] }> = ({ ops }) => {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const blocks = useMemo(() => {
    const out: { start: number; ops: DiffOp[]; fold: boolean }[] = [];
    let i = 0;
    while (i < ops.length) {
      const sameRun = ops[i].op === 'same';
      let j = i;
      while (j < ops.length && (ops[j].op === 'same') === sameRun) j++;
      const run = ops.slice(i, j);
      if (sameRun && run.length > 8) {
        out.push({ start: i, ops: run.slice(0, 3), fold: false });
        out.push({ start: i + 3, ops: run.slice(3, -3), fold: true });
        out.push({ start: j - 3, ops: run.slice(-3), fold: false });
      } else {
        out.push({ start: i, ops: run, fold: false });
      }
      i = j;
    }
    return out;
  }, [ops]);

  return (
    <div className="font-mono text-[11px] leading-5 rounded-lg border border-zinc-800 overflow-hidden">
      {blocks.map(b =>
        b.fold && !open.has(b.start) ? (
          <button
            key={b.start}
            onClick={() => setOpen(prev => new Set(prev).add(b.start))}
            className="w-full text-left px-3 py-0.5 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 text-[10px]"
          >
            … {b.ops.length} identical lines (show)
          </button>
        ) : (
          b.ops.map((o, k) => (
            <div
              key={`${b.start}-${k}`}
              className={`px-3 whitespace-pre-wrap break-words ${
                o.op === 'del' ? 'bg-red-500/10 text-red-200' : o.op === 'add' ? 'bg-emerald-500/10 text-emerald-200' : 'text-zinc-400'
              }`}
            >
              <span className="select-none text-zinc-600 mr-2">{o.op === 'del' ? '−' : o.op === 'add' ? '+' : ' '}</span>
              {o.text || ' '}
            </div>
          ))
        ),
      )}
    </div>
  );
};

const ContextLab: React.FC = () => {
  const [raw, setRaw] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<'segments' | 'diff' | 'json'>('segments');
  const [setupOpen, setSetupOpen] = useState(!raw);
  const fileRef = useRef<HTMLInputElement>(null);

  const imported = useMemo(() => (raw ? parseProbeExport(raw) : { records: [], problems: [] }), [raw]);
  const records = imported.records;
  const record: ProbeRecord | undefined = records.find(r => r.seq === selected) ?? records[records.length - 1];

  useEffect(() => {
    try {
      if (raw.length < 4_000_000) localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      // Storage full or unavailable — the import still works for this session.
    }
  }, [raw]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => {
      setRaw(t);
      setSelected(null);
      setSetupOpen(false);
    });
    e.target.value = '';
  };

  const ctx = record?.context;
  const memoryLength = typeof ctx?.info?.memoryLength === 'number' ? (ctx.info.memoryLength as number) : null;
  const segments = useMemo(
    () => (ctx?.text != null ? segmentContext(ctx.text, memoryLength, ctx.memory?.frontMemory) : []),
    [ctx, memoryLength],
  );
  const rebuild = useMemo(() => (record ? rebuildWithAtlas(record) : null), [record]);
  const ops = useMemo(() => (ctx?.text != null && rebuild ? lineDiff(ctx.text, rebuild.atlas) : []), [ctx, rebuild]);
  const score = ops.length ? similarity(ops) : null;

  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-2">
          <Microscope size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Context Lab</span>
          <span className="text-[10px] text-zinc-600">real AID context vs Atlas</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSetupOpen(o => !o)} className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-200">
            How to capture
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-zinc-800/60 hover:bg-zinc-700/60"
          >
            <Upload size={11} /> Import probe export
          </button>
        </div>
      </div>

      {setupOpen && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-black/30 text-[11px] text-zinc-300 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>In AI Dungeon, create a <b>throwaway test scenario</b> and open its Scripts.</li>
            <li>Paste each probe file into the matching slot:</li>
          </ol>
          <div className="flex flex-wrap gap-2 pl-5">
            {PROBE_ORDER.map(f => <CopyProbeButton key={f} file={f} />)}
          </div>
          <ol className="list-decimal list-inside space-y-1" start={3}>
            <li>Fill in whatever you want to test (Plot Essentials, Author's Note, story cards, …) and play a few turns.</li>
            <li>Story Cards → <b>Export</b>, then import that JSON here. The probe keeps the last 5 turns as cards of type <code>atlas-probe</code>.</li>
          </ol>
          <p className="text-zinc-500">
            Options are at the top of the probe Library (<code>ATLAS_PROBE</code>). <code>markers: true</code> writes
            ⟦ATLAS:…⟧ markers into Plot Essentials, Author's Note and Front Memory so their exact positions are unmistakable.
            The probe never changes the story text. Files live in the repo's <code>AID Probe/</code> folder.
          </p>
        </div>
      )}

      {imported.problems.length > 0 && (
        <div className="px-4 py-2 border-b border-amber-500/30 bg-amber-500/5 space-y-0.5">
          {imported.problems.map((p, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-200">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {p}
            </div>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div className="space-y-2 max-w-sm">
            <Microscope size={28} className="mx-auto text-zinc-700" />
            <p className="text-[11px] text-zinc-400">No captures yet.</p>
            <p className="text-[10px] text-zinc-600">
              Run the AID Probe scripts in a real AI Dungeon scenario, export its story cards and import the file here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="w-44 shrink-0 border-r border-zinc-800 overflow-y-auto custom-scrollbar">
            {records.map(r => (
              <button
                key={r.seq}
                onClick={() => setSelected(r.seq)}
                className={`w-full text-left px-3 py-2 border-b border-zinc-800/60 ${
                  record?.seq === r.seq ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/30'
                }`}
              >
                <div className="text-[11px] font-mono text-zinc-200">Capture #{r.seq}</div>
                <div className="text-[9px] font-mono text-zinc-500">
                  action {String(r.context?.info?.actionCount ?? r.input?.info?.actionCount ?? '?')} ·{' '}
                  {r.context?.length ?? 0} chars{r.input ? '' : ' · continue'}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex border-b border-zinc-800 bg-black/20">
              {([
                ['segments', 'Real context'],
                ['diff', `Atlas vs real${score !== null ? ` · ${Math.round(score * 100)}%` : ''}`],
                ['json', 'Capture JSON'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 ${
                    tab === id ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {!ctx && tab !== 'json' && (
                <div className="text-[11px] text-zinc-500">This capture has no Context hook data (the turn produced no model call).</div>
              )}

              {ctx && tab === 'segments' && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip label="length" value={ctx.length ?? ctx.text.length} />
                    <Chip label="maxChars" value={String(ctx.info?.maxChars ?? '—')} />
                    <Chip label="memoryLength" value={String(ctx.info?.memoryLength ?? '—')} />
                    <Chip label="actionCount" value={String(ctx.info?.actionCount ?? '—')} />
                    <Chip label="history" value={`${ctx.history?.length ?? 0} captured / ${ctx.historyLength ?? '?'} total`} />
                    <Chip label="info keys" value={Object.keys(ctx.info ?? {}).join(', ') || '—'} />
                    <Chip label="history fields" value={ctx.history?.[0]?.fields?.join(', ') ?? '—'} />
                    <Chip label="card fields" value={ctx.cards?.fields?.join(', ') || '—'} title={`keys is a ${ctx.cards?.keysType ?? '?'}`} />
                  </div>
                  {segments.map((s, i) => (
                    <div key={i} className={`rounded-lg border ${SEG_CLASS[s.id]}`}>
                      <div className="flex items-center gap-2 px-3 py-1 border-b border-inherit">
                        <span className="text-[10px] font-black uppercase tracking-widest">{SEGMENT_LABELS[s.id]}</span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          chars {s.from}–{s.to} ({s.to - s.from})
                        </span>
                      </div>
                      <pre className="px-3 py-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] font-mono text-zinc-300">
                        {s.text}
                      </pre>
                    </div>
                  ))}
                  {record?.output && (
                    <div className="rounded-lg border border-zinc-700/50">
                      <div className="px-3 py-1 border-b border-zinc-700/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Model output (Output hook received)
                      </div>
                      <pre className="px-3 py-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] font-mono text-zinc-300">
                        {record.output.text}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {ctx && tab === 'diff' && rebuild && (
                <>
                  <div className="flex items-start gap-2 text-[11px] text-zinc-400">
                    <Info size={12} className="mt-0.5 shrink-0 text-zinc-500" />
                    <div className="space-y-1">
                      <p>
                        Atlas rebuilt this context from the capture's own parts: the sections above, the captured history
                        ({rebuild.historyUsed} entries placed in Recent Story) and the player's input.{' '}
                        <span className="text-red-300">− lines</span> are only in the real context,{' '}
                        <span className="text-emerald-300">+ lines</span> only in Atlas's. Any difference is a gap in
                        Atlas's model of AID, not story content.
                      </p>
                      {rebuild.notes.map((n, i) => <p key={i} className="text-amber-300/80">{n}</p>)}
                    </div>
                  </div>
                  <DiffView ops={ops} />
                </>
              )}

              {tab === 'json' && record && (
                <div className="h-[60vh] rounded-lg border border-zinc-800 overflow-hidden">
                  <JsonEditor value={JSON.stringify(record, null, 2)} readOnly />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextLab;
