import React from 'react';
import { Play } from 'lucide-react';

interface DirectorProps {
  onExecute: (input: string, context?: string, output?: string) => void;
  isProcessing: boolean;
  input: string;
  context: string;
  output: string;
  setInput: (value: string) => void;
  setContext: (value: string) => void;
  setOutput: (value: string) => void;
}

const Director: React.FC<DirectorProps> = ({
  onExecute, isProcessing, input, context, output, setInput, setContext, setOutput
}) => (
  <div className="h-full flex flex-col bg-zinc-900 text-zinc-300 font-mono">
    <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-zinc-800/50">
      <h2 className="text-sm font-semibold text-zinc-200">Director</h2>
    </div>
    <div className="flex-1 flex flex-col p-4 gap-4">
      {[
        { label: 'Input', key: 'input', value: input, setter: setInput, placeholder: 'Enter user input...' },
        { label: 'Context', key: 'context', value: context, setter: setContext, placeholder: 'Enter context...' },
        { label: 'Output', key: 'output', value: output, setter: setOutput, placeholder: 'Enter expected output...' },
      ].map(({ label, key, value, setter, placeholder }) => (
        <div key={key}>
          <label className="text-xs font-semibold text-zinc-400">{label}</label>
          <textarea
            className="w-full bg-zinc-950 rounded-md p-2 mt-1 border-0 focus-within:ring-1 focus-within:ring-zinc-600 font-mono text-xs text-zinc-400 resize-none focus:outline-none leading-snug"
            value={value}
            onChange={(e) => setter(e.target.value)}
            placeholder={placeholder}
            rows={3}
          />
        </div>
      ))}
      <button
        className="mt-auto bg-green-500 text-white rounded-md p-2 flex items-center justify-center disabled:opacity-50 hover:bg-green-600 transition-colors"
        onClick={() => onExecute(input, context, output)}
        disabled={isProcessing}
      >
        <Play className="mr-2" size={16} />
        Execute
      </button>
    </div>
  </div>
);

export default Director;
