import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// CodeMirror theme + syntax colors for the Atlas editors (JS scripts and JSON
// state). Each token class the JS grammar distinguishes gets its own color, so
// a definition reads differently from a use, a call from a property, and a
// keyword that declares from one that branches.
//
// Brackets are deliberately NOT colored here: their color comes from nesting
// depth (editor/nesting.ts → .cm-bracket-dN), which a static tag style would
// override.

const C = {
  comment: '#6a737d',
  control: '#f97583', // if / return / for / throw
  declare: '#c792ea', // const / let / function / class
  operatorWord: '#89ddff', // typeof / new / in / of / delete
  self: '#ff9cac', // this / super
  string: '#ffab70',
  template: '#c3e88d',
  escape: '#89ddff',
  regexp: '#ff5370',
  number: '#f78c6c',
  literal: '#ff9e64', // true / false / null / undefined
  fnDef: '#82aaff',
  fnCall: '#82aaff',
  varDef: '#ffcb6b',

  prop: '#b2ccd6',
  propDef: '#f07178', // object keys
  type: '#56d4dd',
  operator: '#89ddff',
  separator: '#8b949e',
  label: '#ffcb6b',
  invalid: '#ff5370',
};

const atlasHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: C.comment, fontStyle: 'italic' },
  { tag: t.docComment, color: '#7f8c98', fontStyle: 'italic' },
  { tag: [t.controlKeyword, t.keyword], color: C.control },
  { tag: [t.definitionKeyword, t.modifier, t.moduleKeyword], color: C.declare },
  { tag: t.operatorKeyword, color: C.operatorWord },
  { tag: t.self, color: C.self, fontStyle: 'italic' },
  { tag: t.string, color: C.string },
  { tag: t.special(t.string), color: C.template },
  { tag: t.escape, color: C.escape },
  { tag: t.regexp, color: C.regexp },
  { tag: t.number, color: C.number },
  { tag: [t.bool, t.null, t.atom], color: C.literal },
  { tag: t.function(t.definition(t.variableName)), color: C.fnDef, fontWeight: '600' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: C.fnCall },
  { tag: t.definition(t.variableName), color: C.varDef },
  // Plain variable uses get no rule: they render in the base text color, and
  // leaving them unstyled lets the AID-global mark (.cm-aid-global) color
  // `state`, `history`, … — an inner highlight span would override it.
  { tag: t.definition(t.propertyName), color: C.propDef },
  { tag: t.propertyName, color: C.prop },
  { tag: [t.typeName, t.className, t.namespace], color: C.type },
  { tag: t.labelName, color: C.label },
  { tag: [t.operator, t.derefOperator, t.arithmeticOperator, t.logicOperator, t.compareOperator,
          t.updateOperator, t.definitionOperator, t.bitwiseOperator], color: C.operator },
  { tag: t.separator, color: C.separator },
  { tag: t.meta, color: C.control },
  { tag: t.invalid, color: C.invalid, textDecoration: 'underline wavy' },
]);

/** Depth colors, outermost first; cycles after the last. Count must match BRACKET_COLORS. */
const BRACKETS = ['#ffd700', '#da70d6', '#4fc1ff', '#7ee787', '#ff9e64', '#f97583'];

const bracketStyles = Object.fromEntries(
  BRACKETS.map((color, i) => [`.cm-bracket-d${i}`, { color }]),
);

const atlasEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: '#e1e4e8',
    backgroundColor: '#020617',
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily: '"Fira Code", "Fira Mono", monospace',
    caretColor: '#f97316',
    lineHeight: '1.7',
    paddingBottom: '48px',
  },
  '.cm-scroller': {
    fontFamily: '"Fira Code", "Fira Mono", monospace',
    overflow: 'auto',
  },
  '.cm-gutters': {
    backgroundColor: '#04060d',
    color: 'rgba(255,255,255,0.45)',
    border: 'none',
    borderRight: '1px solid rgba(63,63,70,0.3)',
    fontSize: '10px',
    minWidth: '48px',
    lineHeight: '1.7',
  },
  '.cm-gutterElement': { padding: '0 4px 0 6px' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(129,140,248,0.3)',
  },
  // Panels (search) and popups (autocomplete, folding) share the app's dark chrome.
  '.cm-panel': {
    backgroundColor: '#18181b',
    color: '#d4d4d8',
    border: 'none',
    borderBottom: '1px solid rgba(63,63,70,0.5)',
    padding: '4px 6px',
  },
  '.cm-panel input, .cm-panel button, .cm-panel select': {
    backgroundColor: '#09090b',
    color: '#e4e4e7',
    border: '1px solid #3f3f46',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '12px',
  },
  '.cm-panel button': { cursor: 'pointer' },
  '.cm-tooltip': {
    backgroundColor: '#18181b',
    border: '1px solid #3f3f46',
    borderRadius: '6px',
    overflow: 'hidden',
    color: '#d4d4d8',
    fontSize: '12px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'rgba(249,115,131,0.18)',
    color: '#fed7aa',
  },
  '.cm-completionIcon': { opacity: 0.7 },
  '.cm-foldGutter span': { color: 'rgba(255,255,255,0.35)', fontSize: '11px', cursor: 'pointer' },
  '.cm-foldGutter span:hover': { color: '#fb923c' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'rgba(130,170,255,0.12)',
    border: '1px solid rgba(130,170,255,0.35)',
    color: '#82aaff',
    borderRadius: '4px',
    padding: '0 4px',
  },
  '.cm-selectionMatch': { backgroundColor: 'rgba(103,232,249,0.18)' },
  '.cm-runtime-error-line': { backgroundColor: 'rgba(220, 38, 38, 0.15)' },
  '.cm-gutter-error-dot': { color: '#ef4444', fontSize: '10px', marginRight: '4px', cursor: 'help' },
  // The exact token an error points at.
  '.cm-error-mark': {
    textDecoration: 'underline wavy #ef4444',
    textUnderlineOffset: '3px',
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderRadius: '2px',
  },
  // "Go to line" lands here: a brief highlight so the eye finds it.
  '.cm-jump-flash': {
    backgroundColor: 'rgba(250,204,21,0.22) !important',
    transition: 'background-color 0.4s',
  },

  // ── Nesting aids (editor/nesting.ts) ───────────────────────────────────────
  ...bracketStyles,
  // The pair under the cursor, and a bracket with no partner.
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'rgba(255,255,255,0.14)',
    outline: '1px solid rgba(255,255,255,0.45)',
    borderRadius: '2px',
  },
  '.cm-nonmatchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    color: '#ff5370 !important',
    backgroundColor: 'rgba(255,83,112,0.2)',
    textDecoration: 'underline wavy #ff5370',
  },
  // Lines inside the block the cursor is in: a bar at the left edge.
  '.cm-scope-line': { boxShadow: 'inset 2px 0 0 rgba(130,170,255,0.45)' },
  '.cm-scope-bracket': {
    fontWeight: '700',
    textShadow: '0 0 6px currentColor',
  },
  '.cm-aid-global': { color: '#4fd6be', fontWeight: '600' },
}, { dark: true });

// One bundle: editor chrome + syntax colors. Applied via the CodeMirror
// `extensions` prop in CodeBuffer and the JSON state editors.
export const atlasTheme = [atlasEditorTheme, syntaxHighlighting(atlasHighlight)];
