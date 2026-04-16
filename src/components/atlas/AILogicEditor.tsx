import React from 'react';
import CodeBuffer from './CodeBuffer';
import { Script } from '@/types';
import { FileJson } from 'lucide-react';

interface AILogicEditorProps {
  scripts: Script[];
  setScripts: (scripts: Script[]) => void;
  activeScriptId: string;
  setActiveScriptId: (id: string) => void;
}

const AILogicEditor: React.FC<AILogicEditorProps> = ({
  scripts,
  setScripts,
  activeScriptId,
  setActiveScriptId
}) => {
  const handleCodeChange = (scriptId: string, newCode: string) => {
    setScripts(scripts.map(s => (s.id === scriptId ? { ...s, code: newCode } : s)));
  };

  const activeScript = scripts.find(s => s.id === activeScriptId);

  return (
    <div className="flex h-full bg-[#1e1e1e] text-zinc-300">
      <div className="w-56 bg-[#1e1e1e] flex flex-col border-r border-zinc-800/50">
        <div className="h-10 flex items-center px-4 border-b border-zinc-800/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Code Explorer</h2>
        </div>
        <div className="flex-1 py-2 overflow-y-auto custom-scrollbar">
          {scripts.map(script => (
            <button
              key={script.id}
              onClick={() => setActiveScriptId(script.id)}
              className={`w-full flex items-center px-4 py-1.5 text-sm text-left relative transition-colors ${
                activeScriptId === script.id
                  ? 'text-white bg-zinc-700/30'
                  : 'text-zinc-400 hover:bg-zinc-700/20'
              }`}
            >
              {activeScriptId === script.id && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-orange-500" />
              )}
              <FileJson className="mr-2.5 h-4 w-4 text-orange-400" />
              <span>{script.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        {activeScript ? (
          <>
            <div className="h-10 flex-shrink-0 bg-[#1e1e1e] border-b border-zinc-800/50 px-4 flex items-center">
              <span className="font-mono text-xs text-zinc-500 italic">{activeScript.description}</span>
            </div>
            <div className="flex-1 relative">
              <CodeBuffer
                id={activeScript.id}
                title={activeScript.name}
                value={activeScript.code}
                onChange={(newCode) => handleCodeChange(activeScript.id, newCode)}
                color="text-green-400"
                isActive={true}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-zinc-500">Select a file to edit or create one.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AILogicEditor;
