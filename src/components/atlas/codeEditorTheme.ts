import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// CodeMirror theme + syntax colors for the reworked CodeBuffer editor.
// Colors are ported from the previous Prism "traditional" theme
// (prism-traditional.css) so the editor keeps its familiar look, and the shell
// matches the dark Atlas panel chrome it sits in.

// Token colors matching the old Prism theme:
//   comments #6a737d · keywords/functions #f97583 · strings #ffab70
//   numbers/booleans #90ee90 · properties/regex #79b8ff · class names #56d4dd
const atlasHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#6a737d', fontStyle: 'italic' },
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword], color: '#f97583' },
  { tag: t.self, color: '#f97583' },
  { tag: [t.string, t.special(t.string)], color: '#ffab70' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#90ee90' },
  { tag: [t.typeName, t.className], color: '#56d4dd' },
  { tag: t.function(t.variableName), color: '#f97583' },
  { tag: [t.propertyName], color: '#79b8ff' },
  { tag: [t.regexp, t.variableName], color: '#79b8ff' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#e1e4e8' },
  { tag: t.meta, color: '#f97583' },
]);

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
  '.cm-selectionMatch': { backgroundColor: 'rgba(103,232,249,0.18)' },
  '.cm-runtime-error-line': { backgroundColor: 'rgba(220, 38, 38, 0.15)' },
  '.cm-gutter-error-dot': { color: '#ef4444', fontSize: '10px', lineHeight: '1', paddingTop: '4px' },
}, { dark: true });

// One bundle: editor chrome + syntax colors. Applied via the CodeMirror
// `extensions` prop in CodeBuffer.
export const atlasTheme = [atlasEditorTheme, syntaxHighlighting(atlasHighlight)];
