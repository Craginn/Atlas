// Context Lab: compare what real AI Dungeon assembles with what Atlas assembles.
//
// Pipeline:
//   1. parseProbeExport — the story-card JSON exported from a scenario running
//      the AID Probe scripts (repo folder `AID Probe/`) → one record per turn.
//   2. segmentContext — split a real context `text` into its sections using the
//      headers Latitude documents (World Lore:, Story Summary:, Memories:,
//      Recent Story:, [Author's note: …]) plus info.memoryLength.
//   3. rebuildWithAtlas — feed those same section contents, the captured
//      history and the player's input through Atlas's assembleContext.
//   4. lineDiff — show exactly where the two disagree.
//
// Anything that still differs after step 3 is a real gap between Atlas's model
// of AID and AID itself, not a difference in story content.

import { assembleContext, type ContextSectionId } from './scriptingService';
import type { HistoryEntry, KnowledgeBase, StoryCard } from '@/types';

// ------------------------------------------------------------------ records

export interface ProbeHistoryEntry {
  type?: string;
  text?: string;
  rawText?: string;
  fields?: string[];
}

export interface ProbeRecord {
  probe: number;
  seq: number;
  input: { text: string; info: Record<string, unknown> | null } | null;
  context: {
    text: string;
    length: number | null;
    info: Record<string, unknown> | null;
    memory: { context?: string; authorsNote?: string; frontMemory?: string } | null;
    history: ProbeHistoryEntry[];
    historyLength: number | null;
    cards: { count: number; fields: string[]; keysType: string | null };
  } | null;
  output?: { text: string; info: Record<string, unknown> | null };
}

export interface ProbeImport {
  records: ProbeRecord[];
  /** Problems worth showing: missing chunks, truncated JSON, not a probe file. */
  problems: string[];
}

const KEY_RE = /^atlasprobe:t(\d+):(\d+)\/(\d+)$/;

/**
 * Parse an exported story-card file. Export uses `value` for the entry; `entry`
 * is accepted too, so a card list copied from a script log also works.
 */
export function parseProbeExport(raw: string): ProbeImport {
  const problems: string[] = [];
  let cards: unknown;
  try {
    cards = JSON.parse(raw);
  } catch (e) {
    return { records: [], problems: [`Not valid JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }
  if (!Array.isArray(cards)) return { records: [], problems: ['Expected a JSON array of story cards (AID’s export format).'] };

  const turns = new Map<number, { total: number; parts: Map<number, string> }>();
  for (const c of cards) {
    if (!c || typeof c !== 'object') continue;
    const card = c as Record<string, unknown>;
    const m = KEY_RE.exec(String(card.keys ?? '').trim());
    if (!m) continue;
    const seq = Number(m[1]);
    const part = Number(m[2]);
    const total = Number(m[3]);
    const body = String(card.value ?? card.entry ?? '');
    const t = turns.get(seq) ?? { total, parts: new Map() };
    t.total = Math.max(t.total, total);
    t.parts.set(part, body);
    turns.set(seq, t);
  }

  if (turns.size === 0) {
    problems.push('No Atlas probe cards found (keys like "atlasprobe:t3:1/2"). Was the probe installed and a turn played?');
  }

  const records: ProbeRecord[] = [];
  for (const [seq, t] of [...turns.entries()].sort((a, b) => a[0] - b[0])) {
    const missing = Array.from({ length: t.total }, (_, i) => i + 1).filter(i => !t.parts.has(i));
    if (missing.length) {
      problems.push(`Turn ${seq}: missing part(s) ${missing.join(', ')} of ${t.total}.`);
      continue;
    }
    const json = Array.from({ length: t.total }, (_, i) => t.parts.get(i + 1)!).join('');
    try {
      records.push(JSON.parse(json) as ProbeRecord);
    } catch {
      problems.push(
        `Turn ${seq}: capture is cut off (${json.length} chars). AID may cap story card length — ` +
        'lower ATLAS_PROBE.chunkChars in the probe Library and capture again.',
      );
    }
  }
  return { records, problems };
}

// ------------------------------------------------------------------ segments

export type SegmentId = ContextSectionId | 'unknown';

export interface Segment {
  id: SegmentId;
  from: number;
  to: number;
  text: string;
}

const HEADERS: { id: ContextSectionId; re: RegExp }[] = [
  { id: 'worldLore', re: /^World Lore:[ \t]*$/m },
  { id: 'storySummary', re: /^Story Summary:[ \t]*$/m },
  { id: 'memories', re: /^Memories:[ \t]*$/m },
  { id: 'recentStory', re: /^Recent Story:[ \t]*$/m },
];
const AUTHORS_NOTE = /^\[Author's note: [\s\S]*?\]$/m;

/**
 * Split a context into sections. Plot Essentials is `text.slice(0, memoryLength)`
 * when AID reports it, else everything before the first header. After the
 * Author's Note (or Recent Story) comes the last action; Front Memory is the
 * tail when it is known and the text ends with it.
 */
export function segmentContext(text: string, memoryLength?: number | null, frontMemory?: string | null): Segment[] {
  const marks: { id: SegmentId; at: number }[] = [];
  for (const h of HEADERS) {
    const m = h.re.exec(text);
    if (m) marks.push({ id: h.id, at: m.index });
  }
  const an = AUTHORS_NOTE.exec(text);
  if (an) marks.push({ id: 'authorsNote', at: an.index });
  marks.sort((a, b) => a.at - b.at);

  const segs: Segment[] = [];
  const add = (id: SegmentId, from: number, to: number) => {
    // Trim surrounding newlines but keep exact offsets.
    while (from < to && text[from] === '\n') from++;
    while (to > from && text[to - 1] === '\n') to--;
    if (to > from) segs.push({ id, from, to, text: text.slice(from, to) });
  };

  const firstMark = marks.length ? marks[0].at : text.length;
  if (typeof memoryLength === 'number') {
    // AID told us where the memory ends; anything else before the first header
    // is unaccounted for and shown as such.
    const peEnd = Math.min(Math.max(0, memoryLength), firstMark);
    if (peEnd > 0) add('plotEssentials', 0, peEnd);
    if (firstMark > peEnd) add('unknown', peEnd, firstMark);
  } else if (firstMark > 0) {
    // No memoryLength: Plot Essentials is the only thing documented to come
    // before the first header. With no headers at all, nothing can be named.
    add(marks.length ? 'plotEssentials' : 'unknown', 0, firstMark);
  }

  for (let i = 0; i < marks.length; i++) {
    const { id, at } = marks[i];
    let end = i + 1 < marks.length ? marks[i + 1].at : text.length;
    if (id === 'authorsNote' && an) end = an.index + an[0].length;
    add(id, at, end);
    if (id === 'authorsNote' && an && i + 1 === marks.length) {
      addTail(end, text.length);
    }
  }
  // No Author's Note: the last action is the last line of Recent Story's stream,
  // which can't be told apart from history by structure alone, so it stays in
  // Recent Story — except a known Front Memory tail.
  if (!an) {
    const fm = (frontMemory ?? '').trim();
    const last = segs[segs.length - 1];
    if (fm && last && last.text.endsWith(fm) && last.text !== fm) {
      segs.pop();
      add(last.id, last.from, last.to - fm.length);
      add('frontMemory', last.to - fm.length, last.to);
    }
  }
  return segs;

  function addTail(from: number, to: number) {
    const fm = (frontMemory ?? '').trim();
    const tail = text.slice(from, to);
    if (fm && tail.trimEnd().endsWith(fm)) {
      const fmAt = from + tail.lastIndexOf(fm);
      add('lastAction', from, fmAt);
      add('frontMemory', fmAt, fmAt + fm.length);
    } else {
      add('lastAction', from, to);
    }
  }
}

export const SEGMENT_LABELS: Record<SegmentId, string> = {
  plotEssentials: 'Plot Essentials',
  worldLore: 'World Lore',
  storySummary: 'Story Summary',
  memories: 'Memories',
  recentStory: 'Recent Story',
  authorsNote: "Author's Note",
  lastAction: 'Last Action',
  frontMemory: 'Front Memory',
  unknown: 'Unlabelled',
};

const body = (seg: Segment | undefined, header: string) =>
  seg ? seg.text.replace(new RegExp(`^${header}[ \\t]*\\n?`), '') : '';

// ------------------------------------------------------------------ rebuild

export interface Rebuild {
  atlas: string;
  /** How many captured history entries Atlas placed in Recent Story. */
  historyUsed: number;
  notes: string[];
}

/** Rebuild a captured context with Atlas's assembler from the capture's own parts. */
export function rebuildWithAtlas(record: ProbeRecord): Rebuild | null {
  const ctx = record.context;
  if (!ctx || typeof ctx.text !== 'string') return null;
  const notes: string[] = [];
  const memoryLength = typeof ctx.info?.memoryLength === 'number' ? (ctx.info.memoryLength as number) : null;
  const segs = segmentContext(ctx.text, memoryLength, ctx.memory?.frontMemory);
  const get = (id: SegmentId) => segs.find(s => s.id === id);

  const loreBody = body(get('worldLore'), 'World Lore:');
  const cards: StoryCard[] = loreBody
    ? loreBody.split(/\n\s*\n/).map((content, i) => ({
        id: `probe-${i}`, title: `Card ${i + 1}`, content: content.trim(), keywords: [], type: 'Custom', notes: '',
      }))
    : [];
  const anSeg = get('authorsNote');
  const authorsNote = anSeg ? anSeg.text.replace(/^\[Author's note: /, '').replace(/\]$/, '') : '';

  const kb: KnowledgeBase = {
    aiInstructions: '',
    plotEssentials: get('plotEssentials')?.text ?? '',
    storyCards: [],
    storySummary: body(get('storySummary'), 'Story Summary:'),
    memoryBank: body(get('memories'), 'Memories:'),
    recentHistory: '',
    authorsNote,
  };

  // Use the trailing history entries that actually appear in Recent Story —
  // AID fits as many as its budget allows, which Atlas can't know.
  const history: HistoryEntry[] = (ctx.history ?? [])
    .filter(h => typeof h.text === 'string')
    .map(h => ({ text: h.text as string, rawText: h.rawText ?? '', type: (h.type as HistoryEntry['type']) ?? 'continue' }));
  const recentBody = body(get('recentStory'), 'Recent Story:') + '\n' + (get('lastAction')?.text ?? '');
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i].text.trim();
    if (t && !recentBody.includes(t)) break;
    used++;
  }
  if (history.length && used === 0) notes.push('No captured history entry appears verbatim in Recent Story.');
  if (used === history.length && history.length > 0 && (ctx.historyLength ?? 0) > history.length) {
    notes.push(`Recent Story may reach further back than the ${history.length} captured entries.`);
  }

  // The player's input as the Context hook saw it is the newest history entry
  // when AID has already appended it; otherwise it's the Input hook's text.
  const action = record.input?.text ?? '';
  const inputInHistory = action.trim() !== '' && history.length > 0 && history[history.length - 1].text.trim() === action.trim();
  if (inputInHistory) notes.push('The player input was already the newest history entry when the Context hook ran.');

  const rebuilt = assembleContext(
    kb,
    inputInHistory ? history.slice(0, -1) : history,
    action,
    { frontMemory: ctx.memory?.frontMemory ?? '' },
    { cards, historyEntries: Math.max(0, inputInHistory ? used - 1 : used) || undefined },
  );
  return { atlas: rebuilt.context, historyUsed: used, notes };
}

// ------------------------------------------------------------------ diff

export type DiffOp = { op: 'same' | 'add' | 'del'; text: string };

/** Above this many lines per side the O(n·m) table is too big; fall back to a coarse diff. */
const MAX_DIFF_LINES = 3000;

/**
 * Line diff of `real` → `atlas`: 'del' lines are only in the real context,
 * 'add' lines only in Atlas's.
 */
export function lineDiff(real: string, atlas: string): DiffOp[] {
  const a = real.split('\n');
  const b = atlas.split('\n');
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    return [...a.map(text => ({ op: 'del' as const, text })), ...b.map(text => ({ op: 'add' as const, text }))];
  }
  // LCS table, built from the end so the walk below goes forwards.
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ op: 'same', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ op: 'del', text: a[i++] });
    else ops.push({ op: 'add', text: b[j++] });
  }
  while (i < n) ops.push({ op: 'del', text: a[i++] });
  while (j < m) ops.push({ op: 'add', text: b[j++] });
  return ops;
}

/** Share of lines that match, 0–1. */
export const similarity = (ops: DiffOp[]) => {
  const same = ops.filter(o => o.op === 'same').length;
  const real = ops.filter(o => o.op !== 'add').length;
  const atlas = ops.filter(o => o.op !== 'del').length;
  return Math.max(real, atlas) === 0 ? 1 : same / Math.max(real, atlas);
};
