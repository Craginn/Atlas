// The app runs offline only: scripts execute locally and the model's reply is
// the user-authored stand-in from the Director's AI Call box. There is no remote
// generation, so `local` is the only mode. Kept as a named type (rather than
// inlined) so the pipeline's intent stays legible.
export type SimulationMode = 'local';
export type ExecutionMode = SimulationMode;

// An arbitrary, user-shaped state bag. Scripts write whatever keys they like
// (`state.stats.hp`, `state.flags.seenDoor`); nothing here is fixed schema.
export type WorldState = Record<string, any>;

export interface Script {
  id: string;
  name: string;
  trigger: string;
  description: string;
  code: string;
  active: boolean;
  lastModified?: string;
}

export interface StoryCard {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  type: 'Character' | 'Location' | 'Faction' |  'Class' | 'Custom' |  'Race';
  notes: string;
}

export const CARD_TYPES = ['Character', 'Location', 'Faction', 'Class', 'Custom', 'Race'] as const satisfies readonly StoryCard['type'][];

export enum LogType {
  SYSTEM = 'system',
  AI = 'ai',
  ERROR = 'error',
  USER = 'user',
  INFO = 'info',
  WARN = 'warn'
}

export interface LogEntry {
  id: number;
  type: LogType;
  message: string;
  timestamp: string;
}

// Robust logging extension
export interface TruncatedLogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: string;
  truncated: boolean;
  originalLength: number;
  groupId: string;
  lineCount?: number;
  isMultiLine?: boolean;
}

export interface LogGroup {
  id: string;
  type: LogType;
  label: string;
  colorClass: string;
  icon: React.ReactNode;
  bgClass: string;
  entries: TruncatedLogEntry[];
  collapsed: boolean;
  totalCount: number;
  visibleCount: number;
}

export interface LogViewerState {
  groups: LogGroup[];
  searchQuery: string;
  autoScroll: boolean;
}

export interface Agent {
  name: string;
  label: string;
  status: 'Running' | 'Idle' | 'Complete' | 'Error' | 'Disabled';
}

export interface KnowledgeBase {
  aiInstructions: string;
  plotEssentials: string;
  storyCards: StoryCard[];
  storySummary: string;
  memoryBank: string;
  recentHistory: string;
  authorsNote: string;
}

// Per-script state snapshot, so the UI can attribute each delta to the script
// that produced it rather than showing one anonymous before/after.
export interface ScriptStateTrace {
  scriptId: string;
  scriptName: string;
  before: WorldState;
  after: WorldState;
  stateChanged: boolean;
  logs?: string[];
}

// The simulated AI call that sits between the Context and Output hooks. No text is
// generated: `simulated` is the user-authored stand-in for what the model would have
// returned, and `final` is that text after the Output hook manipulates it. A command
// script can halt generation with `stop` and return its own text — then `final` is
// the command's text. A script can also seize the Output by assigning `state.output`;
// that value wins over any Output Modifier's `return { text }` (reason: 'output').
// state.message is NOT part of this: it is a separate toast (see
// SimulationResult.stateMessage) and never becomes the AI Call or the Output.
export interface AiCallTrace {
  contextSent: string;
  simulated: string;
  final: string;
  overridden: boolean;
  overriddenBy?: string;
  reason?: 'stop' | 'output';
}

/**
 * One entry in AID's `history` global, matching the shape real AID hands scripts:
 * `{ text, type, rawText }`. `text` is the action after the Input Modifier ran;
 * `rawText` is what the player originally typed, before any hook touched it.
 */
export interface HistoryEntry {
  text: string;
  /** AID's action kinds. The scenario opening is `start`; AI output is `continue`. */
  type: 'start' | 'continue' | 'do' | 'say' | 'story';
  rawText: string;
  /**
   * The turn this entry was created on (1-based). Atlas-only, not part of AID's
   * shape — it is stripped before the entry reaches a script's `history` global,
   * and exists so the State Editor can pin each line to its turn. A player action
   * and the output it produced share one turn number.
   */
  turn?: number;
}

export interface SimulationResult {
  narration: string;
  aiCall?: AiCallTrace;
  influenceLevel?: number;
  triggeredCards?: string[];
  updatedAuthorsNote?: string;
  reasoning?: string;
  triggeredScriptIds?: string[];
  newState?: WorldState;
  // AID's `history` after this turn. Kept beside the state rather than inside it:
  // it is engine-owned, and folding it in made every turn's text pile up in the
  // object scripts persist. Rolling window, oldest entries dropped past the limit.
  newHistory?: HistoryEntry[];
  output?: string;
  executedCode?: { [scriptName: string]: string };
  stateTrace?: ScriptStateTrace[];
  // Set when a hook threw at runtime. The pipeline halts (the engine stops) and
  // the UI paints the log/output surface red. `details` carries the code-level
  // follow-up (the failing source line, or the validator's full suggestion
  // list) — shown only behind the Code Suggestions button, never automatically.
  executionError?: { hook: string; line: string; message: string; details?: string } | null;
  // Errors a script reported via console.error but caught/swallowed itself, so the
  // hook never threw. These don't halt the pipeline, but a silently-swallowed crash
  // is exactly what hides real bugs — so they're surfaced as a warning.
  scriptErrors?: { hook: string; scriptId: string; line: string; message: string }[];
  // Ids of Story Cards a script created or modified this turn. The Knowledge Base
  // merge uses these to reflect script updates to existing cards (e.g. a settings
  // write via updateStoryCard) without reverting cards the user hand-edited.
  changedStoryCardIds?: string[];
  // The player-facing toast a script raised via state.message. It is surfaced in
  // its own box, separate from the AI Call and the Output — setting it never
  // replaces generated text (character-creation prompts, command replies, etc.).
  stateMessage?: string;
  stateMessageAuthor?: string;
}

export interface LastSimData extends SimulationResult {
  input: string;
  context?: string;
  previousState: WorldState;
  isProcessing: boolean;
  triggeredScripts: Script[];
  /** The action kind this run submitted. 'continue' sends no new player action. */
  actionType?: 'do' | 'say' | 'story' | 'continue';
}

export interface SentinelReport {
  status: 'healthy' | 'warning' | 'error';
  errors: SentinelError[];
  suggestions: string[];
  message: string;
  executionTrace?: any;
  executedCode?: { [scriptName: string]: string };
}

export interface SentinelError {
  file: string;
  line: number;
  reason: string | { message: string };
  originalCode: string;
  fixedCode: string;
}

export interface LogEvent {
  source: 'system' | 'input' | 'output' | 'context' | 'simulation';
  content: any;
  code?: string;
}

export interface SimulationLog {
  id: string;
  timestamp: number;
  type: 'input' | 'output' | 'system';
  content: string;
  stateSnapshot?: WorldState;
  reasoning?: string;
  triggeredScriptIds?: string[];
}

export interface ScriptSnippet {
  id: string;
  name: string;
}
