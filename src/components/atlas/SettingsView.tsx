import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Link } from 'lucide-react';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  fileLinkingConfig: {
    library: { path: string; content: string };
    input: { path: string; content: string };
    context: { path: string; content: string };
    output: { path: string; content: string };
  };
  onSave: (newPaths: Record<string, string>, newContents: Record<string, string>, newFiles: Record<string, File | null>) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen, onClose, apiKey, setApiKey, fileLinkingConfig, onSave
}) => {
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
    onSave(localPaths, finalContents, localFiles);
    onClose();
  };

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
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter file path or click browse"
          />
          <input type="file" ref={fileInputRefs[type]} onChange={(e) => handleFileChange(e, type)} className="hidden" accept=".js,.ts,.txt" />
          <button
            type="button"
            onClick={() => fileInputRefs[type].current?.click()}
            className="shrink-0 px-4 py-2 rounded-md text-sm font-medium text-white bg-zinc-600 hover:bg-zinc-700 transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1e] border border-zinc-700/50 rounded-lg shadow-2xl flex flex-col overflow-hidden" style={{ width: 800, height: 600 }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-700/50 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-200">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-400 hover:bg-zinc-700/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-zinc-700/50 p-4 shrink-0">
            <nav className="space-y-2">
              <button onClick={() => setActiveTab('api')} className={`w-full flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'api' ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Key size={16} /><span>API Key</span>
              </button>
              <button onClick={() => setActiveTab('linking')} className={`w-full flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'linking' ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                <Link size={16} /><span>File Linking</span>
              </button>
            </nav>
          </div>
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'api' && (
              <div className="max-w-md">
                <h3 className="text-lg font-semibold text-zinc-200 mb-4">Gemini API Key</h3>
                <label className="block text-sm font-medium text-zinc-400 mb-2">API Key</label>
                <input
                  type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-zinc-500 mt-2">Stored locally in your browser.</p>
              </div>
            )}
            {activeTab === 'linking' && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-200 mb-4">File Linking</h3>
                <p className="text-sm text-zinc-400 mb-6">Link files from your project to the script editor.</p>
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

export default SettingsView;
