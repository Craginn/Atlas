import React, { useState, useEffect } from 'react';
import Director from './Director';
import HeimdallPanel from './HeimdallPanel';
import { LastSimData, SentinelReport, KnowledgeBase } from '@/types';

interface SimulationEngineProps {
  onExecute: (input: string, context?: string, output?: string) => void;
  isProcessing: boolean;
  lastResult: LastSimData | null;
  report: SentinelReport | null;
  fileLinkingConfig: {
    library: { path: string; content: string };
    input: { path: string; content: string };
    context: { path: string; content: string };
    output: { path: string; content: string };
  };
}

const SimulationEngine: React.FC<SimulationEngineProps> = ({
  onExecute, isProcessing, lastResult, report, fileLinkingConfig
}) => {
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (fileLinkingConfig.input.content) setInput(fileLinkingConfig.input.content);
    if (fileLinkingConfig.context.content) setContext(fileLinkingConfig.context.content);
    if (fileLinkingConfig.output.content) setOutput(fileLinkingConfig.output.content);
  }, [fileLinkingConfig]);

  return (
    <div className="h-full flex flex-col text-white bg-zinc-950">
      <div className="flex-1 grid grid-cols-2 gap-px bg-zinc-800/50 overflow-hidden">
        <div className="bg-zinc-950 flex flex-col">
          <Director
            onExecute={onExecute} isProcessing={isProcessing}
            input={input} context={context} output={output}
            setInput={setInput} setContext={setContext} setOutput={setOutput}
          />
        </div>
        <div className="bg-zinc-950 flex flex-col">
          <HeimdallPanel lastResult={lastResult} isProcessing={isProcessing} report={report} />
        </div>
      </div>
    </div>
  );
};

export default SimulationEngine;
