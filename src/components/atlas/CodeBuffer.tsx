import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { openSearchPanel, searchKeymap, SearchQuery, setSearchQuery } from '@codemirror/search';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { Copy, Search, AlertCircle } from 'lucide-react';
import { validateScriptSyntax, AID_GLOBALS } from '@/services/offlineSimulationService';
import { atlasTheme } from './codeEditorTheme';

// Reworked on CodeMirror 6: rendering is viewport-based, so the visible lines
// are the only thing laid out no matter how large the file gets. The props
// contract is unchanged — AILogicEditor (and the cross-file find) plug in
// exactly as before.

// The words the autocomplete always knows about, independent of what's typed:
// the AID scripting globals plus JS keywords. Code-local identifiers are mixed
// in at suggest time (see aidCompletionSource) so "fill-ins" match nearby usage.
const JS_KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'typeof', 'instanceof', 'new',
  'try', 'catch', 'finally', 'throw', 'class', 'extends', 'super', 'this', 'null',
  'undefined', 'true', 'false', 'async', 'await', 'of', 'in', 'delete', 'void',
  'yield', 'JSON', 'Object', 'Array', 'Math', 'String', 'Number', 'Boolean',
  'console', 'push', 'pop', 'slice', 'splice', 'map', 'filter', 'forEach',
  'includes', 'indexOf', 'length', 'toString', 'stringify', 'parse',
];

// Rank + filter the completion dictionary against the partial word. Code-local
// identifiers (auto-detected from what's already written) are folded in so the
// suggestions bias toward names the script already uses. Runs on demand only,
// never per keystroke.
const aidCompletionSource: CompletionSource = (context) => {
  const word = context.matchBefore(/[\w$]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const local = context.state.doc.toString().match(/[A-Za-z_$][\w$]*/g) || [];
  const dict = new Set<string>([...AID_GLOBALS, ...JS_KEYWORDS, ...local]);
  const lower = word.text.toLowerCase();
  return {
    from: word.from,
    options: Array.from(dict)
      .filter(w => w !== word.text && w.toLowerCase().startsWith(lower))
      // Shorter, closer matches first; then alphabetical for stability.
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .slice(0, 20)
      .map(label => ({
        label,
        type: JS_KEYWORDS.includes(label) ? 'keyword' : AID_GLOBALS.includes(label) ? 'variable' : 'text',
      })),
  };
};

interface CodeBufferProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  color: string;
  id: string;
  isReadOnly?: boolean;
  isActive: boolean;
  // An external request (e.g. from the Code Explorer's cross-file search) to open
  // the find panel pre-filled with a query. `nonce` changes on each request so
  // re-searching the same term still re-triggers.
  findRequest?: { query: string; nonce: number } | null;
}

const CodeBuffer: React.FC<CodeBufferProps> = ({ title, value, onChange, isReadOnly = false, isActive, color, findRequest }) => {
  const safeValue = value || '';
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  // ── Validation (drives the red bar) ────────────────────────────────────────
  const validation = useMemo(
    () => validateScriptSyntax(safeValue, title !== 'Library'),
    [safeValue, title]
  );
  const errorCount = validation.errors.length;
  const hasErrors = errorCount > 0;

  // Editor plumbing. Everything runs through CodeMirror's own viewport, so the
  // extension set is static — no per-keystroke measurement or re-highlight of
  // the whole document.
  const extensions = useMemo(() => [
    atlasTheme,
    lineNumbers(),
    javascript(),
    EditorView.lineWrapping,
    history(),
    foldGutter(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ override: [aidCompletionSource], activateOnTyping: true }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
    ]),
  ], []);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  const openFind = useCallback(() => {
    const view = cmRef.current?.view;
    if (view) openSearchPanel(view);
  }, []);

  // Honor an external find request (from the Explorer's cross-file search):
  // open the search panel pre-filled with the query. openSearchPanel focuses
  // the panel input, matching the old jump behavior.
  useEffect(() => {
    if (!findRequest?.query) return;
    const view = cmRef.current?.view;
    if (!view) return;
    openSearchPanel(view);
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: findRequest.query })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findRequest?.nonce]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      <div
        className={`h-10 px-6 flex items-center justify-between border-b shrink-0 transition-colors ${
          hasErrors ? 'bg-red-950/50 border-red-500/50' : 'bg-zinc-950/40 border-zinc-800/40'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
            {isReadOnly ? 'PROTECTED_BUNDLE' : 'EDITABLE_JS_MODULE'}
          </span>
          <div className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className={`text-[9px] font-mono uppercase font-bold ${hasErrors ? 'text-red-400' : color}`}>{title}</span>
          {hasErrors && (
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-red-400">
              <AlertCircle size={11} />
              {errorCount} error{errorCount > 1 ? 's' : ''} · line {validation.errors[0].line}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={openFind}
            className="flex items-center space-x-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Find (Ctrl+F)"
          >
            <Search size={10} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Find</span>
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(safeValue)}
            className="flex items-center space-x-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Copy size={10} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Copy Code</span>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          ref={cmRef}
          value={safeValue}
          onChange={handleChange}
          extensions={extensions}
          theme="none"
          basicSetup={false}
          editable={!isReadOnly}
          readOnly={isReadOnly}
          className="atlas-code-editor h-full"
        />
      </div>
    </div>
  );
};

export default CodeBuffer;
