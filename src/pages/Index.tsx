import React, { useState, useCallback, useEffect } from 'react';
import { WorldState, Script, StoryCard, SentinelReport, SimulationMode, KnowledgeBase, LastSimData } from '@/types';
import { INITIAL_WORLD_STATE, DEFAULT_SCRIPTS, INITIAL_STORY_CARDS } from '@/constants';
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
import { ScriptingService } from '@/services/scriptingService';

const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  aiInstructions: '',
  plotEssentials: '',
  storyCards: [],
  storySummary: '',
  memoryBank: '',
  recentHistory: '',
  authorsNote: '',
};

type ViewType = 'state' | 'logic' | 'sentinel' | 'simulation' | 'plot';

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
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(INITIAL_KNOWLEDGE_BASE);
  const [view, setView] = useState<ViewType>('simulation');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [engine] = useState<SimulationMode>('local');
  const [lastSimData, setLastSimData] = useState<LastSimData | null>(null);
  const [panels, setPanels] = useState({ left: true });
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(null);
  const [isAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeScriptId, setActiveScriptId] = useState<string>('');
  const [fileLinkingConfig, setFileLinkingConfig] = useState({
    library: { path: 'Link File', content: '' },
    input: { path: 'Link File', content: '' },
    context: { path: 'Link File', content: '' },
    output: { path: 'Link File', content: '' },
  });
  const [linkedFiles, setLinkedFiles] = useState<Record<string, File | null>>({
    library: null, input: null, context: null, output: null,
  });

  useEffect(() => {
    if (activeScriptId && !scripts.some(s => s.id === activeScriptId)) {
      setActiveScriptId(scripts.length > 0 ? scripts[0].id : '');
    } else if (!activeScriptId && scripts.length > 0) {
      setActiveScriptId(scripts[0].id);
    }
  }, [scripts]);

  // Sync library linked file content into the active script's code
  useEffect(() => {
    const libContent = fileLinkingConfig.library.content;
    const libPath = fileLinkingConfig.library.path;
    if (libContent && libPath !== 'Link File' && activeScriptId) {
      setScripts(prev => prev.map(s =>
        s.id === activeScriptId ? { ...s, code: libContent } : s
      ));
    }
  }, [fileLinkingConfig.library.content, activeScriptId]);

  const handleSaveSettings = (newPaths: any, newContents: any, newFiles: Record<string, File | null>) => {
    setFileLinkingConfig({
      library: { path: newPaths.library, content: newContents.library },
      input: { path: newPaths.input, content: newContents.input },
      context: { path: newPaths.context, content: newContents.context },
      output: { path: newPaths.output, content: newContents.output },
    });
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

    const updated = { ...fileLinkingConfig };
    if (libContent !== null) updated.library = { ...updated.library, content: libContent };
    if (inContent !== null) updated.input = { ...updated.input, content: inContent };
    if (ctxContent !== null) updated.context = { ...updated.context, content: ctxContent };
    if (outContent !== null) updated.output = { ...updated.output, content: outContent };

    setFileLinkingConfig(updated);
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

  const handleRunSimulation = async (input: string, context?: string, output?: string) => {
    if (lastSimData?.isProcessing) return;

    // Re-read linked files before running
    const updatedConfig = await reReadLinkedFiles();

    // Sync library content to active script
    if (updatedConfig.library.content && updatedConfig.library.path !== 'Link File' && activeScriptId) {
      setScripts(prev => prev.map(s =>
        s.id === activeScriptId ? { ...s, code: updatedConfig.library.content } : s
      ));
    }

    const newKB: KnowledgeBase = { ...knowledgeBase, aiInstructions: input, memoryBank: context || '' };
    setKnowledgeBase(newKB);

    setLastSimData({
      input, context, output,
      previousState: worldState, newState: null, triggeredScripts: [],
      reasoning: '', isProcessing: true, narration: '',
    });

    try {
      const result = await ScriptingService.simulateStep(input, worldState, scripts, engine, newKB);
      const triggered = scripts.filter(s => result.triggeredScriptIds?.includes(s.id));

      let trace = null;
      if (result.reasoning) {
        try { trace = JSON.parse(result.reasoning); } catch {}
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
        return <Sentinel report={sentinelReport} isAnalyzing={isAnalyzing} runAnalysis={() => {}} mode={engine} />;
      case 'plot':
        return <PlotEssentials />;
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
