import React from 'react';
import { KnowledgeBase } from '@/types';
import { PLOT_EXAMPLES, SAMPLE_KB } from '@/constants';
import { Lock, Sparkles, Eraser, Cpu } from 'lucide-react';

type PlotField = 'aiInstructions' | 'plotEssentials' | 'storySummary' | 'memoryBank' | 'authorsNote';

interface PlotEssentialsProps {
  knowledgeBase: KnowledgeBase;
  onChange: (field: keyof KnowledgeBase, value: string) => void;
}

interface SectionMeta {
  field: PlotField;
  label: string;
  /** Real AID script-API reference, or a note when there's no script access. */
  scriptRef: string;
  description: string;
  accent: string; // tailwind text color
  focusBorder: string; // tailwind focus border color
  locked?: boolean; // AI Instructions — not script-manipulable
  engineManaged?: boolean; // Memory Bank — auto-populated in real AID
}

// Canonical AID context-assembly order (02-context/context-assembly-order.md):
// AI Instructions → Plot Essentials → Story Summary → Memory Bank → Author's Note.
// (Story Cards are a separate, trigger-activated feature and live elsewhere.)
const SECTIONS: SectionMeta[] = [
  {
    field: 'aiInstructions',
    label: 'AI Instructions',
    scriptRef: 'no script access',
    description: 'Behavioral/system directives (perspective, tone, rules). Sent at the very start of context.',
    accent: 'text-blue-400',
    focusBorder: 'focus:border-blue-500',
    locked: true,
  },
  {
    field: 'plotEssentials',
    label: 'Plot Essentials',
    scriptRef: 'state.memory.context',
    description: 'Key static story facts (characters, setting, active threads). Put critical facts first and last.',
    accent: 'text-purple-400',
    focusBorder: 'focus:border-purple-500',
  },
  {
    field: 'storySummary',
    label: 'Story Summary',
    scriptRef: 'auto / manual summary',
    description: 'Running overview of the plot so far. Auto-summarized every few actions in AI Dungeon.',
    accent: 'text-orange-400',
    focusBorder: 'focus:border-orange-500',
  },
  {
    field: 'memoryBank',
    label: 'Memory Bank',
    scriptRef: 'engine-managed',
    description: 'Semantically-retrieved memories. Auto-populated by the engine in AI Dungeon — editable here for testing.',
    accent: 'text-teal-400',
    focusBorder: 'focus:border-teal-500',
    engineManaged: true,
  },
  {
    field: 'authorsNote',
    label: "Author's Note",
    scriptRef: 'state.memory.authorsNote',
    description: 'Short-term tone/style/pacing for the current scene. Keep to keywords or 1–4 brief sentences.',
    accent: 'text-gray-300',
    focusBorder: 'focus:border-gray-500',
  },
];

const PlotEssentials: React.FC<PlotEssentialsProps> = ({ knowledgeBase, onChange }) => {
  const loadExample = () => {
    (Object.keys(PLOT_EXAMPLES) as PlotField[]).forEach(field => {
      onChange(field, SAMPLE_KB[field] as string);
    });
  };

  const clearAll = () => {
    (Object.keys(PLOT_EXAMPLES) as PlotField[]).forEach(field => onChange(field, ''));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      <div className="h-12 flex items-center justify-between px-6 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Plot Components</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadExample}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-purple-300 bg-purple-600/15 hover:bg-purple-600/25 transition-colors"
          >
            <Sparkles size={12} />
            <span>Load Example</span>
          </button>
          <button
            onClick={clearAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Eraser size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {SECTIONS.map(section => (
          <div key={section.field} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${section.accent}`}>{section.label}</span>
                {section.locked && (
                  <span className="flex items-center space-x-1 text-[8px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                    <Lock size={9} />
                    <span>SCRIPT-LOCKED</span>
                  </span>
                )}
                {section.engineManaged && (
                  <span className="flex items-center space-x-1 text-[8px] font-mono text-teal-400/80 bg-teal-500/10 border border-teal-500/20 rounded px-1.5 py-0.5">
                    <Cpu size={9} />
                    <span>ENGINE-MANAGED</span>
                  </span>
                )}
              </div>
              <span className="text-[8px] font-mono text-gray-600">{section.scriptRef}</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">{section.description}</p>
            {section.locked && (
              <p className="text-[9px] text-amber-400/70 italic">
                Scripts cannot manipulate AI Instructions (matches AI Dungeon). Editable here, but never altered at runtime by modifiers.
              </p>
            )}
            <textarea
              value={knowledgeBase[section.field]}
              onChange={(e) => onChange(section.field, e.target.value)}
              placeholder={PLOT_EXAMPLES[section.field]}
              className={`w-full h-28 bg-[#111] border border-white/5 rounded-lg p-4 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 placeholder:italic outline-none resize-none ${section.focusBorder}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlotEssentials;
