import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { atlasTheme } from './codeEditorTheme';
import { nestingMarks } from './editor/nesting';

// JSON editor for world state, on the same viewport-rendered CodeMirror stack as
// the script editor — so a multi-megabyte state lays out only the visible lines,
// unlike a textarea re-highlighted in full on every keystroke.

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** CSS height; defaults to filling the parent. */
  height?: string;
  className?: string;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, readOnly = false, height = '100%', className }) => {
  const extensions = useMemo(() => [
    atlasTheme,
    lineNumbers(),
    highlightActiveLine(),
    json(),
    history(),
    foldGutter(),
    bracketMatching({ afterCursor: true }),
    closeBrackets(),
    nestingMarks([]),
    indentationMarkers({
      thickness: 1,
      colors: {
        dark: 'rgba(255,255,255,0.07)',
        activeDark: 'rgba(130,170,255,0.45)',
        light: 'rgba(0,0,0,0.1)',
        activeLight: 'rgba(0,0,0,0.3)',
      },
    }),
    EditorView.lineWrapping,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap]),
  ], []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      basicSetup={false}
      editable={!readOnly}
      readOnly={readOnly}
      height={height}
      className={className ?? 'h-full'}
    />
  );
};

export default JsonEditor;
