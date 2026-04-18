import React, { useState, useCallback, useEffect } from 'react';
import { WorldState, Script, SentinelReport, SimulationMode, KnowledgeBase, LastSimData } from '@/types';
import { INITIAL_WORLD_STATE, DEFAULT_SCRIPTS, INITIAL_KB } from '@/constants';
import AILogicEditor from '@/components/atlas/AILogicEditor';
import Sentinel from '@/components/atlas/Sentinel';
import StateEditor from '@/components/atlas/StateEditor';
import SimulationEngine from '@/components/atlas/SimulationEngine';
import PlotEssentials from '@/components/atlas/PlotEssentials';
import SettingsView from '@/components/atlas/SettingsView';
import {
  Github, Code2, ShieldCheck, Cpu, Database, PanelLeft,
  Activity, Terminal, Book, Settings, FlaskConical
} from 'lucide-react';
import { validateScriptSyntax } from '@/services/offlineSimulationService';
import { ScriptingService } from '@/services/scriptingService';

type ViewType = 'state' | 'logic' | 'sentinel' | 'simulation' | 'plot';
type ScriptLinkType = 'library' | 'input' | 'context' | 'output';
type FileLinkingConfig = Record<ScriptLinkType, { path: string; content: string }>;

const EMPTY_FILE_LINKING_CONFIG: FileLinkingConfig = {
  library: { path: 'Link File', content: '' },
  input: { path: 'Link File', content: '' },
  context: { path: 'Link File', content: '' },
  output: { path: 'Link File', content: '' },
};

const SCRIPT_NAME_BY_LINK_TYPE: Record<ScriptLinkType, string> = {
  library: 'Library',
  input: 'Input Modifier',
  context: 'Context Modifier',
  output: 'Output Modifier',
};

const RECENT_HISTORY_LIMIT = 8;

const applyLinkedFileContentsToScripts = (baseScripts: Script[], config: FileLinkingConfig): Script[] =>
  baseScripts.map(script => {
    const linkedEntry = Object.entries(SCRIPT_NAME_BY_LINK_TYPE).find(([, scriptName]) => scriptName === script.name);
    if (!linkedEntry) {
      return script;
    }

    const [linkType] = linkedEntry as [ScriptLinkType, string];
    const linkedConfig = config[linkType];
    if (!linkedConfig.content || linkedConfig.path === 'Link File') {
      return script;
    }

    return {
      ...script,
      code: linkedConfig.content,
      lastModified: new Date().toISOString(),
    };
  });

const getScriptLine = (code: string, lineNumber: number): string => {
  const line = code.split('\n')[lineNumber - 1];
  return line ?? '';
};

const suggestFixedCode = (message: string, originalCode: string): string => {
  if (!originalCode.trim()) {
    return '// Review the surrounding block and repair the structural syntax issue.';
  }

  if (message.includes('comparison (===)')) {
    return originalCode.replace(/==?/, '===');
  }

  if (message.includes('"healt" should be "health"')) {
    return originalCode.replace(/healt/gi, 'health');
  }

  if (message.includes('"activeMonster" should be "activeMonsters"')) {
    return originalCode.replace(/activeMonster/g, 'activeMonsters');
  }

  if (message.includes('"state.ps" should be "state.PS"')) {
    return originalCode.replace(/state\.(ps|Ps)/g, 'state.PS');
  }

  return `${originalCode}\n// Manual follow-up: ${message}`;
};

const appendRecentHistory = (currentHistory: string, input: string, output: string): string => {
  const historyLines = currentHistory
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const nextLines = [
    ...historyLines,
    `User: ${input}`,
    output ? `System: ${output}` : '',
  ].filter(Boolean);

  return nextLines.slice(-RECENT_HISTORY_LIMIT).join('\n');
};

const ProjectExplorer = ({ view, setView, onOpenSettings }: { view: ViewType; setView: (v: ViewType) => void; onOpenSettings: () => void }) => {
  const menuItems = [
    { id: 'simulation' as const, icon: Terminal, label: 'Simulation Engine' },
    { id: 'state' as const, icon: Database, label: 'State Editor' },
    { id: 'logic' as const, icon: Code2, label: 'JS Code Editor' },
    { id: 'plot' as const, icon: Book, label: 'Plot Essentials' },
  ];

  return (
    <div className="bg-[#0c0c0f] border-r border-zinc-800/50 flex flex-col h-full">
      <div className="h-14 flex items-center px-4 space-x-2 border-b border-zinc-800/50 shrink-0">
        <div className="p-2 bg-purple-600/20 rounded-lg">
          <FlaskConical className="text-purple-400" size={16} />
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-sm italic text-zinc-200">Aid Atlas</h1>
          <div className="text-[9px] font-mono text-zinc-600 -mt-1">IDE SYSTEM</div>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-start space-x-3 p-2 rounded-md text-xs font-semibold transition-colors ${
                view === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
              }`}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-zinc-800/50">
          <button
            onClick={() => setView('sentinel')}
            className={`w-full flex items-center justify-start space-x-3 p-2 rounded-md text-xs font-semibold transition-colors ${
              view === 'sentinel' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
            }`}
          >
            <ShieldCheck size={14} className="text-red-500" />
            <span>Sentinel Debugger</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-start space-x-3 p-2 rounded-md text-xs font-semibold text-zinc-400 hover:bg-zinc-900/50 hover:text-white transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>
      </div>
      <div className="p-2 border-t border-zinc-800/50 shrink-0">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center space-x-2 p-2 rounded-md text-xs text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 transition-colors">
          <Github size={14} />
          <span>View Source</span>
        </a>
      </div>
    </div>
  );
};

const StatusBar = ({ panels, setPanels, engine }: { panels: { left: boolean }; setPanels: React.Dispatch<React.SetStateAction<{ left: boolean }>>; engine: string }) => (
  <div className="bg-[#0c0c0f] border-t border-zinc-800/50 h-6 px-4 flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
    <div className="flex items-center space-x-4">
      <div className="flex items-center text-zinc-400">
        <Cpu size={10} className="mr-1.5" />
        <span>ENGINE: {engine.toUpperCase()}</span>
      </div>
      <div className="flex items-center space-x-1 uppercase tracking-tighter text-zinc-600">
        <Activity size={10} />
        <span>STATUS: NOMINAL</span>
      </div>
    </div>
    <div className="flex items-center space-x-4">
      <button
        onClick={() => setPanels(p => ({ ...p, left: !p.left }))}
        className={`hover:text-white transition-colors ${panels.left ? 'text-zinc-400' : 'text-zinc-700'}`}
      >
        <PanelLeft size={12} />
      </button>
      <div className="w-px h-3 bg-zinc-700" />
      <span className="text-zinc-600">v2.1.0-STABLE</span>
    </div>
  </div>
);

const Index: React.FC = () => {
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_WORLD_STATE);
  const [previousWorldState, setPreviousWorldState] = useState<WorldState | null>(null);
  const [scripts, setScripts] = useState<Script[]>(DEFAULT_SCRIPTS);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(INITIAL_KB);
  const [view, setView] = useState<ViewType>('simulation');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [engine] = useState<SimulationMode>('local');
  const [lastSimData, setLastSimData] = useState<LastSimData | null>(null);
  const [panels, setPanels] = useState({ left: true });
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeScriptId, setActiveScriptId] = useState<string>('');
  const [fileLinkingConfig, setFileLinkingConfig] = useState<FileLinkingConfig>(EMPTY_FILE_LINKING_CONFIG);
  const [linkedFiles, setLinkedFiles] = useState<Record<ScriptLinkType, File | null>>({
    library: null, input: null, context: null, output: null,
  });

  useEffect(() => {
    if (activeScriptId && !scripts.some(s => s.id === activeScriptId)) {
      setActiveScriptId(scripts.length > 0 ? scripts[0].id : '');
    } else if (!activeScriptId && scripts.length > 0) {
      setActiveScriptId(scripts[0].id);
    }
  }, [activeScriptId, scripts]);

  const handleSaveSettings = (
    newPaths: Record<ScriptLinkType, string>,
    newContents: Record<ScriptLinkType, string>,
    newFiles: Record<ScriptLinkType, File | null>
  ) => {
    const nextConfig: FileLinkingConfig = {
      library: { path: newPaths.library, content: newContents.library },
      input: { path: newPaths.input, content: newContents.input },
      context: { path: newPaths.context, content: newContents.context },
      output: { path: newPaths.output, content: newContents.output },
    };

    setFileLinkingConfig(nextConfig);
    setScripts(prev => applyLinkedFileContentsToScripts(prev, nextConfig));
    setLinkedFiles(prev => ({
      library: newFiles.library ?? prev.library,
      input: newFiles.input ?? prev.input,
      context: newFiles.context ?? prev.context,
      output: newFiles.output ?? prev.output,
    }));
  };

  const reReadLinkedFiles = useCallback(async () => {
    const readFile = (file: File | null): Promise<string | null> => {
      if (!file) return Promise.resolve(null);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      });
    };

    const [libContent, inContent, ctxContent, outContent] = await Promise.all([
      readFile(linkedFiles.library),
      readFile(linkedFiles.input),
      readFile(linkedFiles.context),
      readFile(linkedFiles.output),
    ]);

    const updated: FileLinkingConfig = {
      library: { ...fileLinkingConfig.library },
      input: { ...fileLinkingConfig.input },
      context: { ...fileLinkingConfig.context },
      output: { ...fileLinkingConfig.output },
    };

    if (libContent !== null) updated.library = { ...updated.library, content: libContent };
    if (inContent !== null) updated.input = { ...updated.input, content: inContent };
    if (ctxContent !== null) updated.context = { ...updated.context, content: ctxContent };
    if (outContent !== null) updated.output = { ...updated.output, content: outContent };

    setFileLinkingConfig(updated);
    setScripts(prev => applyLinkedFileContentsToScripts(prev, updated));
    return updated;
  }, [linkedFiles, fileLinkingConfig]);

  const handleSetWorldState = useCallback((newState: WorldState) => {
    console.log('[Index.tsx] handleSetWorldState called with:', JSON.stringify(newState));
    setWorldState(ws => {
      if (JSON.stringify(ws) !== JSON.stringify(newState)) {
        console.log('[Index.tsx] State changed, saving previous state');
        setPreviousWorldState(ws);
      }
      return newState;
    });
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      const scriptsWithCode = scripts.filter(script => script.code.trim().length > 0);
      const emptyActiveScripts = scripts
        .filter(script => script.active && script.code.trim().length === 0)
        .map(script => `${script.name} is active but has no code or linked file yet.`);

      if (scriptsWithCode.length === 0) {
        setSentinelReport(prev => ({
          status: 'warning',
          errors: [],
          suggestions: emptyActiveScripts.length > 0
            ? emptyActiveScripts
            : ['Write or link a script in the JS Code Editor before running Sentinel.'],
          message: 'Sentinel did not find any executable scripts to analyze.',
          executionTrace: prev?.executionTrace,
          executedCode: prev?.executedCode,
        }));
        return;
      }

      const analysisResults = scriptsWithCode.map(script => ({
        script,
        validation: validateScriptSyntax(script.code),
      }));

      const errors = analysisResults.flatMap(({ script, validation }) =>
        validation.errors.map(issue => ({
          file: script.name,
          line: issue.line,
          reason: issue.message,
          originalCode: getScriptLine(script.code, issue.line),
          fixedCode: suggestFixedCode(issue.message, getScriptLine(script.code, issue.line)),
        }))
      );

      const warningSuggestions = analysisResults.flatMap(({ script, validation }) =>
        validation.warnings.map(issue => `${script.name} line ${issue.line}: ${issue.message}`)
      );

      const suggestions = [...new Set([...warningSuggestions, ...emptyActiveScripts])];
      const warningCount = warningSuggestions.length;
      const status = errors.length > 0 ? 'error' : suggestions.length > 0 ? 'warning' : 'healthy';
      const message = errors.length > 0
        ? `Sentinel found ${errors.length} error(s) and ${warningCount} warning(s) across ${scriptsWithCode.length} script(s).`
        : suggestions.length > 0
          ? `Sentinel finished with ${warningCount} warning(s) and a few follow-up suggestions.`
          : `Sentinel analyzed ${scriptsWithCode.length} script(s) with no issues detected.`;

      setSentinelReport(prev => ({
        status,
        errors,
        suggestions,
        message,
        executionTrace: prev?.executionTrace,
        executedCode: prev?.executedCode,
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [scripts]);

  const handleRunSimulation = async (input: string, context?: string, output?: string) => {
    if (lastSimData?.isProcessing) return;

    // Re-read linked files before running
    const updatedConfig = await reReadLinkedFiles();
    const syncedScripts = applyLinkedFileContentsToScripts(scripts, updatedConfig);
    setScripts(syncedScripts);

    const nextKnowledgeBase: KnowledgeBase = {
      ...knowledgeBase,
      memoryBank: context?.trim() ? context : knowledgeBase.memoryBank,
    };
    setKnowledgeBase(nextKnowledgeBase);

    setLastSimData({
      input, context, output,
      previousState: worldState, newState: null, triggeredScripts: [],
      reasoning: '', isProcessing: true, narration: '',
    });

    try {
      const result = await ScriptingService.simulateStep(input, worldState, syncedScripts, engine, nextKnowledgeBase);
      const triggered = syncedScripts.filter(s => result.triggeredScriptIds?.includes(s.id));

      let trace = null;
      if (result.reasoning) {
        try {
          trace = JSON.parse(result.reasoning);
        } catch (_error) {
          trace = result.reasoning;
        }
      }

      setSentinelReport(prev => ({
        ...(prev as SentinelReport),
        executionTrace: trace,
        executedCode: result.executedCode,
        status: 'healthy',
        errors: prev?.errors || [],
        suggestions: prev?.suggestions || [],
        message: `Simulation finished with ${triggered.length} scripts triggered.`,
      }));

      setLastSimData(prevData => ({
        ...(prevData as LastSimData),
        newState: result.newState ?? worldState,
        reasoning: result.reasoning,
        narration: result.output ?? '',
        triggeredScripts: triggered,
        isProcessing: false,
        executedCode: result.executedCode,
      }));

      setKnowledgeBase(prev => ({
        ...prev,
        recentHistory: appendRecentHistory(prev.recentHistory, input, result.output ?? result.narration ?? ''),
      }));

      console.log('[Index.tsx] Simulation result received:', {
        hasNewState: !!result.newState,
        newState: result.newState,
        triggeredScripts: triggered.length,
      });
      
      if (result.newState) {
        console.log('[Index.tsx] Calling handleSetWorldState with:', JSON.stringify(result.newState));
        handleSetWorldState(result.newState);
      } else {
        console.log('[Index.tsx] No newState in result, state not updated');
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      setLastSimData(null);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'simulation':
        return (
          <SimulationEngine
            onExecute={handleRunSimulation}
            isProcessing={lastSimData?.isProcessing ?? false}
            lastResult={lastSimData}
            report={sentinelReport}
            fileLinkingConfig={fileLinkingConfig}
          />
        );
      case 'state':
        return <StateEditor worldState={worldState} setWorldState={handleSetWorldState} previousWorldState={previousWorldState} />;
      case 'logic':
        return <AILogicEditor scripts={scripts} setScripts={setScripts} activeScriptId={activeScriptId} setActiveScriptId={setActiveScriptId} />;
      case 'sentinel':
        return <Sentinel report={sentinelReport} isAnalyzing={isAnalyzing} runAnalysis={handleRunAnalysis} mode={engine} />;
      case 'plot':
        return <PlotEssentials knowledgeBase={knowledgeBase} setKnowledgeBase={setKnowledgeBase} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-black text-zinc-200 font-sans flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {panels.left && (
          <div className="w-64 shrink-0">
            <ProjectExplorer view={view} setView={setView} onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <div className="h-9 p-3 bg-zinc-900 border-b border-zinc-800/50 text-[10px] text-zinc-400 font-semibold flex items-center space-x-2 shrink-0">
            <span className="text-zinc-600 select-none">{'aid atlas > src >'}</span>
            <span className="text-blue-400 select-none">{view}.js</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {renderView()}
          </div>
        </div>
      </div>
      <StatusBar panels={panels} setPanels={setPanels} engine={engine} />
      <SettingsView
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey} setApiKey={setApiKey}
        fileLinkingConfig={fileLinkingConfig} onSave={handleSaveSettings}
      />
    </div>
  );
};

export default Index;
