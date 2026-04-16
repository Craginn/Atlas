import React, { useRef, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import '@/styles/prism-traditional.css';
import { Copy } from 'lucide-react';

interface CodeBufferProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  color: string;
  id: string;
  isReadOnly?: boolean;
  isActive: boolean;
}

const editorStyle = {
  fontFamily: '"Fira Code", "Fira Mono", monospace',
};

const highlightWithJs = (code: string) => highlight(code, languages.js, 'js');

const CodeBuffer: React.FC<CodeBufferProps> = ({ title, value, onChange, isReadOnly = false, isActive, color }) => {
  const safeValue = value || '';
  const lines = safeValue.split('\n');
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      <div className="h-10 px-6 flex items-center justify-between bg-zinc-950/40 border-b border-zinc-800/40 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
            {isReadOnly ? 'PROTECTED_BUNDLE' : 'EDITABLE_JS_MODULE'}
          </span>
          <div className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className={`text-[9px] font-mono uppercase font-bold ${color}`}>{title}</span>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(safeValue)}
          className="flex items-center space-x-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <Copy size={10} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Copy Code</span>
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={gutterRef}
          className="w-12 bg-zinc-950/20 border-r border-zinc-800/30 pt-6 text-[10px] font-mono text-white select-none shrink-0 overflow-hidden text-center"
        >
          {lines.map((_, i) => <div key={i} className="leading-7 h-7">{i + 1}</div>)}
        </div>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto custom-scrollbar"
        >
          <Editor
            value={safeValue}
            onValueChange={onChange}
            highlight={highlightWithJs}
            padding={24}
            className="atlas-code-editor bg-transparent text-[13px] font-mono focus:outline-none resize-none leading-7 min-h-full min-w-max"
            readOnly={isReadOnly}
            style={editorStyle}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeBuffer;
