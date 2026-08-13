import React, { useState, useEffect, useRef } from 'react';
import {
  X, Link, Loader2, RefreshCw, Smartphone, Bug,
} from 'lucide-react';
import { useLayoutMode, LayoutMode } from '@/hooks/use-layout-mode';
import { supportsFileSystemAccess, pickFile } from '@/services/fileLinkService';
import { Script } from '@/types';
import { useRpgDebug } from '@/hooks/use-rpg-debug';

type SlotHandles = Record<string, FileSystemFileHandle | null>;

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  fileLinkingConfig: {
    library: { path: string; content: string };
    input: { path: string; content: string };
    context: { path: string; content: string };
    output: { path: string; content: string };
  };
  onSave: (
    newPaths: Record<string, string>,
    newContents: Record<string, string>,
    newFiles: Record<string, File | null>,
    newHandles: SlotHandles,
  ) => void;
  /** Re-read all linked files from disk (picks up external VS Code edits). */
  onReloadFromDisk?: () => void;
  /** Script slots, for the debug fixture toggle. */
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen, onClose, fileLinkingConfig, onSave, onReloadFromDisk,
  scripts, setScripts,
}) => {
  const liveSync = supportsFileSystemAccess();
  const [activeTab, setActiveTab] = useState('linking');
  const [localPaths, setLocalPaths] = useState({
    library: fileLinkingConfig.library.path,
    input: fileLinkingConfig.input.path,
    context: fileLinkingConfig.context.path,
    output: fileLinkingConfig.output.path,
  });
  const [localContents, setLocalContents] = useState<Record<string, string | null>>({
    library: null, input: null, context: null, output: null,
  });
  const [localFiles, setLocalFiles] = useState<Record<string, File | null>>({
    library: null, input: null, context: null, output: null,
  });
  const [localHandles, setLocalHandles] = useState<SlotHandles>({
    library: null, input: null, context: null, output: null,
  });
  const fileInputRefs = {
    library: useRef<HTMLInputElement>(null),
    input: useRef<HTMLInputElement>(null),
    context: useRef<HTMLInputElement>(null),
    output: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    if (isOpen) {
      setLocalPaths({
        library: fileLinkingConfig.library.path,
        input: fileLinkingConfig.input.path,
        context: fileLinkingConfig.context.path,
        output: fileLinkingConfig.output.path,
      });
      setLocalContents({ library: null, input: null, context: null, output: null });
      setLocalFiles({ library: null, input: null, context: null, output: null });
      setLocalHandles({ library: null, input: null, context: null, output: null });
    }
  }, [isOpen, fileLinkingConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalContents = {
      library: localContents.library ?? fileLinkingConfig.library.content,
      input: localContents.input ?? fileLinkingConfig.input.content,
      context: localContents.context ?? fileLinkingConfig.context.content,
      output: localContents.output ?? fileLinkingConfig.output.content,
    };
    onSave(localPaths, finalContents, localFiles, localHandles);
    onClose();
  };

  // Fallback path (Firefox/Safari): plain <input type=file>, stale snapshot.
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setLocalPaths(prev => ({ ...prev, [type]: file.name }));
      setLocalFiles(prev => ({ ...prev, [type]: file }));
      const reader = new FileReader();
      reader.onload = (e) => setLocalContents(prev => ({ ...prev, [type]: e.target?.result as string }));
      reader.readAsText(file);
    }
  };

  // Preferred path (Chromium): keep a live handle so external edits can be re-read.
  const handlePickFile = async (type: string) => {
    try {
      const picked = await pickFile();
      if (!picked) return;
      setLocalPaths(prev => ({ ...prev, [type]: picked.name }));
      setLocalHandles(prev => ({ ...prev, [type]: picked.handle }));
      setLocalContents(prev => ({ ...prev, [type]: picked.content }));
    } catch {
      // User cancelled the picker or permission denied — no-op.
    }
  };

  const renderFileLinkSelector = (type: 'library' | 'input' | 'context' | 'output') => {
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    return (
      <div key={type}>
        <label className="block text-sm font-medium text-zinc-400 mb-2">{title} Script</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={localPaths[type]}
            onChange={(e) => setLocalPaths(prev => ({ ...prev, [type]: e.target.value }))}
            // min-w-0 lets the field actually shrink inside the flex row; without
            // it the intrinsic width of a long filename pushes the button off a
            // phone screen. 16px text avoids iOS Safari's auto-zoom on focus.
            className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-base sm:text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter file path or click browse"
          />
          {/* Mobile pickers (Android Files, iOS Files) match on MIME type and
              largely ignore a bare extension list — with only `.js,.ts,...` a
              phone shows every script greyed out and unselectable. The MIME
              types are listed first so those pickers have something to match,
              with the extensions kept for desktop. */}
          <input
            type="file"
            ref={fileInputRefs[type]}
            onChange={(e) => handleFileChange(e, type)}
            className="hidden"
            accept="text/plain,text/javascript,application/javascript,application/json,.js,.mjs,.ts,.txt,.json"
          />
          <button
            type="button"
            onClick={() => (liveSync ? handlePickFile(type) : fileInputRefs[type].current?.click())}
            className="shrink-0 px-4 py-2 rounded-md text-sm font-medium text-white bg-zinc-600 hover:bg-zinc-700 transition-colors"
          >
            {liveSync ? 'Link…' : 'Browse…'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 sm:p-4">
      {/* Was a fixed 800x600, which overflowed every phone. The desktop size is
          now the cap rather than the floor. */}
      <div className="bg-[#1a1a1e] border border-zinc-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden w-full h-full sm:w-[800px] sm:h-[600px] sm:max-w-full sm:max-h-full">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-200">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:bg-zinc-700/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Tabs run across the top on a narrow screen — a 192px sidebar would
              leave almost nothing for the panel itself. */}
          <div className="w-full sm:w-48 border-b sm:border-b-0 sm:border-r border-zinc-700/50 p-3 sm:p-4 shrink-0">
            <nav className="flex sm:block gap-2 sm:gap-0 sm:space-y-2 overflow-x-auto">
              <button onClick={() => setActiveTab('linking')} className={`w-full flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'linking' ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Link size={16} /><span>File Linking</span>
              </button>
              <button onClick={() => setActiveTab('layout')} className={`w-full flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'layout' ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Smartphone size={16} /><span>Layout</span>
              </button>
              <button onClick={() => setActiveTab('debug')} className={`w-full flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'debug' ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Bug size={16} /><span>Debug</span>
              </button>
            </nav>
          </div>
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'layout' && <LayoutSettings />}

            {activeTab === 'debug' && (
              <DebugSettings scripts={scripts} setScripts={setScripts} />
            )}

            {activeTab === 'linking' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-200">File Linking</h3>
                  {onReloadFromDisk && (
                    <button
                      type="button"
                      onClick={onReloadFromDisk}
                      title="Re-read all linked files from disk"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 transition-colors"
                    >
                      <RefreshCw size={13} />
                      <span>Reload from disk</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mb-2">Link files from your project to the script editor.</p>
                <p className={`text-xs mb-6 ${liveSync ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
                  {liveSync
                    ? 'Live sync enabled: linked files are re-read from disk on each simulation run and via "Reload from disk", so edits you make in VS Code are picked up.'
                    : 'Your browser lacks the File System Access API — files are read once on selection and external edits won\'t be detected. Use a Chromium-based browser (Chrome/Edge) for live sync.'}
                </p>
                <div className="space-y-6">
                  {renderFileLinkSelector('library')}
                  {renderFileLinkSelector('input')}
                  {renderFileLinkSelector('context')}
                  {renderFileLinkSelector('output')}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-zinc-700/50 flex justify-end shrink-0">
          <button onClick={handleSave} className="px-5 py-2 rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors">
            Save and Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LAYOUT_CHOICES: { value: LayoutMode; label: string; hint: string }[] = [
  { value: 'auto',    label: 'Automatic',      hint: 'Follow the screen size. Compact below 768px wide.' },
  { value: 'mobile',  label: 'Always compact', hint: 'Touch-sized controls and a stacked block list on every device.' },
  { value: 'desktop', label: 'Always full',    hint: 'The pan-and-zoom block canvas, even on a small screen.' },
];

/** The layout override. Separate component so it can use the store's hook. */
const LayoutSettings: React.FC = () => {
  const { mode, isCompact, viewportIsMobile, setMode } = useLayoutMode();

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-semibold text-zinc-200">Layout</h3>
      <p className="text-sm text-zinc-400">
        The block editor has two layouts. Compact stacks blocks in a full-width
        list with touch-sized controls; full uses the pan-and-zoom canvas, which
        needs a mouse.
      </p>

      <div className="space-y-2">
        {LAYOUT_CHOICES.map(choice => (
          <label
            key={choice.value}
            className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
              mode === choice.value
                ? 'border-purple-500/50 bg-purple-600/10'
                : 'border-zinc-700/50 hover:bg-zinc-800/50'
            }`}
          >
            <input
              type="radio"
              name="layout-mode"
              value={choice.value}
              checked={mode === choice.value}
              onChange={() => setMode(choice.value)}
              className="mt-1 accent-purple-500"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-200">{choice.label}</span>
              <span className="block text-xs text-zinc-500">{choice.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-zinc-500">
        Currently showing the <strong className="text-zinc-300">{isCompact ? 'compact' : 'full'}</strong> layout
        {mode === 'auto' && ` (this screen reads as ${viewportIsMobile ? 'small' : 'wide'})`}.
      </p>
    </div>
  );
};

/**
 * The debug harness toggle.
 *
 * Separate component so it can use hooks, and so the destructive-looking bit
 * (overwriting script slots) is contained in one readable place.
 */
const DebugSettings: React.FC<{
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
}> = ({ scripts, setScripts }) => {
  const rpg = useRpgDebug(scripts, setScripts);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const onToggle = async (next: boolean) => {
    setResult(await rpg.toggle(next));
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-semibold text-zinc-200">Debug</h3>

      <div className="rounded-md border border-zinc-700/50 p-3 space-y-3">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rpg.enabled}
            disabled={rpg.busy || !rpg.available}
            onChange={e => void onToggle(e.target.checked)}
            className="mt-1 accent-purple-500"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-200">
              Load the RPG script suite
              {rpg.busy && <Loader2 size={12} className="inline ml-2 animate-spin" />}
            </span>
            <span className="block text-xs text-zinc-500">
              Fills the script slots with the suite from <code>Mock Script Test/</code> — levels,
              XP, health, combat — so the engine runs against real scripts instead of empty ones.
            </span>
          </span>
        </label>

        {!rpg.available && (
          <p className="text-xs text-amber-400/80">
            No fixture files found. Expected <code>Mock Script Test/*.js</code> in the repo.
          </p>
        )}

        <p className="text-xs text-zinc-500">
          Turning this on saves whatever is in the slots first, and turning it off puts it back.
          Nothing you have written is lost by flipping the switch.
        </p>

        {result && (
          <p className={`text-xs ${result.ok ? 'text-emerald-400/90' : 'text-amber-400/90'}`}>
            {result.message}
          </p>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Internal flag: <code className="text-zinc-500">{String(rpg.enabled)}</code>
      </p>
    </div>
  );
};

export default SettingsView;
