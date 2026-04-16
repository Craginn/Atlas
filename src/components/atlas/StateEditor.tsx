import React, { useState, useEffect } from 'react';
import { WorldState, Character } from '@/types';
import { Database, Code, GitCommit, ArrowRight, Plus, Minus, FileJson, Hash, MapPin, User, Archive, Info } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-json';
import '@/styles/prism-custom-theme.css';

interface Delta {
  path: string;
  from: any;
  to: any;
  type: 'modified' | 'added' | 'removed';
}

const calculateDeltas = (oldState: WorldState | null, newState: WorldState): Delta[] => {
  // Handle null oldState by treating all properties as "added"
  const baselineState: WorldState = oldState || {};
  const deltas: Delta[] = [];

  // Collect all unique keys from both old and new state
  const allKeys = new Set([...Object.keys(baselineState), ...Object.keys(newState)]);

  allKeys.forEach(key => {
    const oldValue = baselineState[key as keyof WorldState];
    const newValue = newState[key as keyof WorldState];

    // Skip if both are the same
    if (oldValue === newValue) return;

    // Shallow string comparison for primitives
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

    // Handle special cases for specific properties
    if (key === 'attributes' && typeof oldValue === 'object' && typeof newValue === 'object') {
      // Handle attributes as nested deltas
      const oldAttrs = (oldValue as any) || {};
      const newAttrs = (newValue as any) || {};
      const attrKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);
      
      attrKeys.forEach(attrKey => {
        if (oldAttrs[attrKey] !== newAttrs[attrKey]) {
          if (!(attrKey in oldAttrs)) {
            deltas.push({ path: `attributes.${attrKey}`, from: undefined, to: newAttrs[attrKey], type: 'added' });
          } else if (!(attrKey in newAttrs)) {
            deltas.push({ path: `attributes.${attrKey}`, from: oldAttrs[attrKey], to: undefined, type: 'removed' });
          } else {
            deltas.push({ path: `attributes.${attrKey}`, from: oldAttrs[attrKey], to: newAttrs[attrKey], type: 'modified' });
          }
        }
      });
      return;
    }

    if (key === 'inventory' && Array.isArray(oldValue) && Array.isArray(newValue)) {
      // Handle inventory as set differences
      const oldSet = new Set(oldValue as string[]);
      const newSet = new Set(newValue as string[]);
      
      (newValue as string[]).forEach(item => {
        if (!oldSet.has(item)) {
          deltas.push({ path: 'inventory', from: null, to: item, type: 'added' });
        }
      });
      (oldValue as string[]).forEach(item => {
        if (!newSet.has(item)) {
          deltas.push({ path: 'inventory', from: item, to: null, type: 'removed' });
        }
      });
      return;
    }

    if (key === 'characters' && Array.isArray(oldValue) && Array.isArray(newValue)) {
      // Handle characters as keyed objects
      const oldChars = (oldValue as any[]).reduce((acc, c) => ({ ...acc, [c.name]: c }), {} as Record<string, any>);
      const newChars = (newValue as any[]).reduce((acc, c) => ({ ...acc, [c.name]: c }), {} as Record<string, any>);
      const charNames = new Set([...Object.keys(oldChars), ...Object.keys(newChars)]);
      
      charNames.forEach(name => {
        const oldChar = oldChars[name];
        const newChar = newChars[name];
        
        if (!oldChar) {
          deltas.push({ path: 'characters', from: null, to: newChar, type: 'added' });
        } else if (!newChar) {
          deltas.push({ path: 'characters', from: oldChar, to: null, type: 'removed' });
        } else {
          Object.keys(newChar).forEach(charKey => {
            if (oldChar[charKey] !== newChar[charKey]) {
              deltas.push({ path: `characters.${name}.${charKey}`, from: oldChar[charKey], to: newChar[charKey], type: 'modified' });
            }
          });
        }
      });
      return;
    }

    // Default handling: treat as top-level property modification
    if (!(key in baselineState)) {
      deltas.push({ path: key, from: undefined, to: newValue, type: 'added' });
    } else if (!(key in newState)) {
      deltas.push({ path: key, from: oldValue, to: undefined, type: 'removed' });
    } else {
      deltas.push({ path: key, from: oldValue, to: newValue, type: 'modified' });
    }
  });

  return deltas;
};

const ValueRenderer = ({ value }: { value: any }) => {
  if (value === null || value === undefined) return <span className="text-zinc-600 italic">null</span>;
  if (typeof value === 'object') return <span className="text-zinc-500 text-opacity-80">{JSON.stringify(value)}</span>;
  return <span className="text-zinc-300">{JSON.stringify(value)}</span>;
};

const DeltaItem: React.FC<{ delta: Delta }> = ({ delta }) => {
  const icons: Record<string, React.ReactNode> = {
    'location': <MapPin size={12} />, 'narrativeContext': <FileJson size={12} />,
    'attributes': <Hash size={12} />, 'inventory': <Archive size={12} />, 'characters': <User size={12} />
  };
  const rootKey = delta.path.split('.')[0];
  const icon = icons[rootKey] || <Info size={12} />;

  return (
    <div className="flex items-start space-x-4 p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-lg text-[11px] font-mono">
      <div className="mt-0.5 p-1 rounded-md bg-blue-500/10 text-blue-400">{icon}</div>
      <div className="flex-1 flex flex-col space-y-1">
        <span className="text-blue-300/60 font-black tracking-wider">{delta.path}</span>
        <div className="flex items-center space-x-2">
          {delta.type === 'modified' && <>
            <ArrowRight size={10} className="text-zinc-600" />
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md line-through"><ValueRenderer value={delta.from} /></span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md"><ValueRenderer value={delta.to} /></span>
          </>}
          {delta.type === 'added' && <>
            <Plus size={10} className="text-emerald-500" />
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md"><ValueRenderer value={delta.to} /></span>
          </>}
          {delta.type === 'removed' && <>
            <Minus size={10} className="text-red-500" />
            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md"><ValueRenderer value={delta.from} /></span>
          </>}
        </div>
      </div>
    </div>
  );
};

const DeltaView: React.FC<{ oldState: WorldState | null; newState: WorldState }> = ({ oldState, newState }) => {
  const deltas = calculateDeltas(oldState, newState);

  if (deltas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black/40 text-zinc-600 space-y-4">
        <Info size={32} />
        <div className="max-w-xs">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {!oldState ? 'Awaiting State Change' : 'No State Changes Detected'}
          </h3>
          <p className="text-xs italic mt-1">{!oldState ? 'No previous state to compare.' : ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-black/40">
      <p className="text-[9px] font-mono text-zinc-500/50 mb-4 uppercase">Showing {deltas.length} change(s):</p>
      {deltas.map((delta, i) => <DeltaItem key={i} delta={delta} />)}
    </div>
  );
};

interface EditorProps {
  worldState: WorldState;
  setWorldState: (ws: WorldState) => void;
  previousWorldState: WorldState | null;
}

const StateEditor: React.FC<EditorProps> = ({ worldState, setWorldState, previousWorldState }) => {
  const [localText, setLocalText] = useState(JSON.stringify(worldState, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [activeTab, setActiveTab] = useState<'raw' | 'delta'>('raw');

  useEffect(() => {
    const currentString = JSON.stringify(worldState, null, 2);
    if (localText !== currentString) {
      setLocalText(currentString);
      setIsValid(true);
    }
  }, [worldState]);

  const handleStateChange = (newVal: string) => {
    setLocalText(newVal);
    try {
      const parsed = JSON.parse(newVal);
      setWorldState(parsed);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  const TabButton: React.FC<{ id: 'raw' | 'delta'; icon: React.ElementType; label: string }> = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${
        activeTab === id
          ? 'text-blue-400 border-blue-400 bg-blue-500/5'
          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/20'
      }`}
    >
      <Icon size={12} />
      <span>{label}</span>
    </button>
  );

  const lineCount = localText.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-zinc-800/50 overflow-hidden font-sans select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center space-x-2">
          <Database size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Project State</span>
        </div>
        {!isValid && <span className="text-[9px] text-red-400 font-mono">Invalid JSON</span>}
      </div>

      <div className="flex border-b border-zinc-800 bg-black/20">
        <TabButton id="raw" icon={Code} label="Raw State" />
        <TabButton id="delta" icon={GitCommit} label="State Deltas" />
      </div>

      {activeTab === 'raw' ? (
        <div className="flex-1 relative overflow-hidden flex bg-black/40">
          <div className="w-10 bg-zinc-900/30 text-right pr-2 pt-2.5 text-white text-xs font-mono select-none overflow-hidden">
            {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Editor
              value={localText}
              onValueChange={handleStateChange}
              highlight={code => highlight(code, languages.json, 'json')}
              padding={10}
              className="text-sm font-mono focus:outline-none min-h-full"
              style={{ fontFamily: '"Fira Code", monospace' }}
            />
          </div>
        </div>
      ) : (
        <DeltaView oldState={previousWorldState} newState={worldState} />
      )}
    </div>
  );
};

export default StateEditor;
