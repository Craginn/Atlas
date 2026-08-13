// The block model behind the visual scripting canvas.
//
// DESIGN: statements are structure, expressions are text.
//
// A beginner needs to see the *shape* of a script — what runs when, what's
// nested inside what. That's the statement layer, and it's what becomes boxes.
// Expressions (`text.includes("sword")`, `a.b(c) + 1`) are kept as their exact
// source substring in an editable field rather than exploded into a tree of
// operand boxes. Two reasons:
//
//   1. Round-trip safety. An expression we never decompose is an expression we
//      can never reassemble wrongly. Re-emitting the original slice verbatim is
//      lossless by construction, which is what lets arbitrary uploaded code
//      survive a trip through the canvas unchanged.
//   2. Legibility. Nesting a box per operand turns `(a + b) * c` into a
//      five-level tower that is harder to read than the text it replaced.
//
// Anything the parser doesn't recognize becomes a `raw` block holding verbatim
// source. So coverage gaps degrade to "shown as code" and never to data loss.

export type BlockKind =
  // Declarations & functions
  | 'var'            // let/const/var declaration
  | 'function'       // function declaration
  | 'return'
  // Control flow
  | 'if'
  | 'for'            // classic for(;;)
  | 'forIn'          // for...in / for...of
  | 'while'
  | 'doWhile'
  | 'switch'
  | 'case'           // a case/default arm inside a switch
  | 'try'
  | 'throw'
  | 'break'
  | 'continue'
  // Statements
  | 'call'           // invoke a named function — a UI affordance over `expression`
  | 'expression'     // a bare expression statement (calls, assignments, ...)
  | 'block'          // a bare `{ ... }` block
  | 'empty'
  // Escape hatch — verbatim source we chose not to (or couldn't) model
  | 'raw';

/**
 * One box on the canvas.
 *
 * `fields` holds expression source and identifiers (editable text).
 * `slots` holds nested statement lists — this is what makes blocks expandable
 * and lets them accept other blocks inside them.
 */
export interface BlockNode {
  id: string;
  kind: BlockKind;
  /** Expression source / names, keyed by role (e.g. `test`, `init`, `name`). */
  fields: Record<string, string>;
  /** Nested statement lists, keyed by role (e.g. `body`, `then`, `else`). */
  slots: Record<string, BlockNode[]>;
  /** Collapsed boxes hide their slots on the canvas. */
  collapsed?: boolean;
  /**
   * Free-floating canvas position, for root-level blocks only. Nested blocks
   * are laid out by their parent and ignore this.
   */
  pos?: { x: number; y: number };
}

/** A parsed script: root blocks plus anything we couldn't parse at all. */
export interface BlockProgram {
  roots: BlockNode[];
  /**
   * Set when the source failed to parse outright (a syntax error). The whole
   * script is preserved in a single `raw` root so nothing is lost, and the UI
   * surfaces this message instead of pretending the parse succeeded.
   */
  parseError?: { message: string; line: number };
}

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `b${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeBlock(
  kind: BlockKind,
  fields: Record<string, string> = {},
  slots: Record<string, BlockNode[]> = {},
): BlockNode {
  return { id: newId(), kind, fields, slots };
}

/** Human-facing label + accent color per kind, used by the canvas renderer. */
export const BLOCK_META: Record<BlockKind, { label: string; color: string; hint: string }> = {
  var:        { label: 'Set Variable',  color: 'sky',     hint: 'Store a value under a name' },
  function:   { label: 'Function',      color: 'violet',  hint: 'A reusable named routine' },
  return:     { label: 'Return',        color: 'rose',    hint: 'Send a value back' },
  if:         { label: 'If',            color: 'amber',   hint: 'Run steps only when a condition is true' },
  for:        { label: 'For Loop',      color: 'emerald', hint: 'Repeat with a counter' },
  forIn:      { label: 'For Each',      color: 'emerald', hint: 'Repeat over each item' },
  while:      { label: 'While',         color: 'emerald', hint: 'Repeat while a condition holds' },
  doWhile:    { label: 'Do / While',    color: 'emerald', hint: 'Run once, then repeat while true' },
  switch:     { label: 'Switch',        color: 'amber',   hint: 'Pick one branch by value' },
  case:       { label: 'Case',          color: 'amber',   hint: 'One branch of a switch' },
  try:        { label: 'Try / Catch',   color: 'orange',  hint: 'Attempt steps, handle failures' },
  throw:      { label: 'Throw',         color: 'red',     hint: 'Raise an error' },
  break:      { label: 'Break',         color: 'zinc',    hint: 'Exit the current loop' },
  continue:   { label: 'Continue',      color: 'zinc',    hint: 'Skip to the next repeat' },
  call:       { label: 'Call',          color: 'cyan',    hint: 'Run a function you defined' },
  expression: { label: 'Do',            color: 'blue',    hint: 'Run an action' },
  block:      { label: 'Group',         color: 'zinc',    hint: 'A bare group of steps' },
  empty:      { label: 'Empty',         color: 'zinc',    hint: 'Does nothing' },
  raw:        { label: 'Code',          color: 'zinc',    hint: 'Raw JavaScript, shown as written' },
};
