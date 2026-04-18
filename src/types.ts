export type SimulationMode = 'remote' | 'local' | 'hybrid';
export type ExecutionMode = SimulationMode;

export type WorldAttributeValue = string | number | boolean | null;

export interface Character {
  id?: string;
  name: string;
  role?: string;
  description?: string;
  location?: string;
  status?: string;
  notes?: string;
  traits?: string[];
  inventory?: string[];
  [key: string]: unknown;
}

export interface WorldState {
  location?: string;
  narrativeContext?: string;
  history?: string[];
  characters?: Character[];
  inventory?: string[];
  attributes?: Record<string, WorldAttributeValue>;
  activeMonsters?: string[];
  flags?: Record<string, boolean>;
  [key: string]: unknown;
}

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

export enum LogType {
  SYSTEM = 'system',
  AI = 'ai',
  ERROR = 'error',
  WARN = 'warn',
  USER = 'user',
  INFO = 'info'
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

export interface SimulationResult {
  narration: string;
  influenceLevel?: number;
  triggeredCards?: string[];
  updatedAuthorsNote?: string;
  reasoning?: string;
  triggeredScriptIds?: string[];
  newState?: WorldState;
  output?: string;
  executedCode?: { [scriptName: string]: string };
}

export interface LastSimData extends SimulationResult {
  input: string;
  context?: string;
  previousState: WorldState;
  isProcessing: boolean;
  triggeredScripts: Script[];
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
