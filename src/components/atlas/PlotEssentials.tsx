import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { KnowledgeBase, StoryCard } from '@/types';

interface PlotEssentialsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
}

const STORY_CARD_TYPES: StoryCard['type'][] = [
  'Character',
  'Location',
  'Faction',
  'Class',
  'Custom',
  'Race',
];

const createStoryCard = (): StoryCard => ({
  id: `card-${Date.now()}`,
  title: 'New Story Card',
  content: '',
  keywords: [],
  type: 'Custom',
  notes: '',
});

const PlotEssentials: React.FC<PlotEssentialsProps> = ({ knowledgeBase, setKnowledgeBase }) => {
  const updateField = (field: keyof KnowledgeBase, value: string) => {
    setKnowledgeBase(prev => ({ ...prev, [field]: value }));
  };

  const updateStoryCard = (cardId: string, updates: Partial<StoryCard>) => {
    setKnowledgeBase(prev => ({
      ...prev,
      storyCards: prev.storyCards.map(card =>
        card.id === cardId ? { ...card, ...updates } : card
      ),
    }));
  };

  const addStoryCard = () => {
    setKnowledgeBase(prev => ({
      ...prev,
      storyCards: [...prev.storyCards, createStoryCard()],
    }));
  };

  const removeStoryCard = (cardId: string) => {
    setKnowledgeBase(prev => ({
      ...prev,
      storyCards: prev.storyCards.filter(card => card.id !== cardId),
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-y-auto custom-scrollbar p-6 space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Instructions</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.aiInstructions</span>
          </div>
          <textarea
            value={knowledgeBase.aiInstructions}
            onChange={(e) => updateField('aiInstructions', e.target.value)}
            className="w-full h-36 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-blue-200 font-mono focus:border-blue-500 outline-none resize-none"
            placeholder="Define the voice, rules, and guardrails for the simulation."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-[0.2em]">Plot Essentials</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.plotEssentials</span>
          </div>
          <textarea
            value={knowledgeBase.plotEssentials}
            onChange={(e) => updateField('plotEssentials', e.target.value)}
            className="w-full h-36 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-gray-200 focus:border-purple-500 outline-none resize-none"
            placeholder="Capture the current objective, stakes, factions, or scene framing."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em]">Story Summary</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.storySummary</span>
          </div>
          <textarea
            value={knowledgeBase.storySummary}
            onChange={(e) => updateField('storySummary', e.target.value)}
            className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-orange-200 italic focus:border-orange-500 outline-none resize-none"
            placeholder="Summarize where the story currently stands."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Author&apos;s Note</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.authorsNote</span>
          </div>
          <textarea
            value={knowledgeBase.authorsNote}
            onChange={(e) => updateField('authorsNote', e.target.value)}
            className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-gray-300 focus:border-gray-500 outline-none resize-none"
            placeholder="Add tone, pacing, or scene-specific nudges."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">Memory Bank</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.memoryBank</span>
          </div>
          <textarea
            value={knowledgeBase.memoryBank}
            onChange={(e) => updateField('memoryBank', e.target.value)}
            className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-emerald-200 focus:border-emerald-500 outline-none resize-none"
            placeholder="Store persistent facts the simulation should remember."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.2em]">Recent History</span>
            <span className="text-[8px] font-mono text-gray-600">KnowledgeBase.recentHistory</span>
          </div>
          <textarea
            value={knowledgeBase.recentHistory}
            onChange={(e) => updateField('recentHistory', e.target.value)}
            className="w-full h-32 bg-[#111] border border-white/5 rounded-lg p-4 text-sm text-cyan-200 focus:border-cyan-500 outline-none resize-none"
            placeholder="Track the latest user inputs and outputs for continuity."
          />
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-pink-400 tracking-[0.2em]">Story Cards</span>
            <p className="text-xs text-zinc-500 mt-1">Structured lore, characters, locations, and hooks used by the simulation context.</p>
          </div>
          <button
            type="button"
            onClick={addStoryCard}
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-md bg-pink-500/15 text-pink-300 hover:bg-pink-500/25 transition-colors text-sm"
          >
            <Plus size={14} />
            <span>Add Card</span>
          </button>
        </div>

        <div className="space-y-4">
          {knowledgeBase.storyCards.map(card => (
            <div key={card.id} className="border border-white/5 rounded-xl bg-[#111] p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={card.title}
                  onChange={(e) => updateStoryCard(card.id, { title: e.target.value })}
                  className="flex-1 bg-black/30 border border-white/5 rounded-md px-3 py-2 text-zinc-100 focus:outline-none focus:border-pink-500"
                  placeholder="Story card title"
                />
                <select
                  value={card.type}
                  onChange={(e) => updateStoryCard(card.id, { type: e.target.value as StoryCard['type'] })}
                  className="bg-black/30 border border-white/5 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-pink-500"
                >
                  {STORY_CARD_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeStoryCard(card.id)}
                  className="p-2 rounded-md text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  title="Remove card"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <input
                type="text"
                value={card.keywords.join(', ')}
                onChange={(e) => updateStoryCard(card.id, {
                  keywords: e.target.value
                    .split(',')
                    .map(keyword => keyword.trim())
                    .filter(Boolean),
                })}
                className="w-full bg-black/30 border border-white/5 rounded-md px-3 py-2 text-zinc-300 focus:outline-none focus:border-pink-500"
                placeholder="Keywords, comma separated"
              />

              <textarea
                value={card.content}
                onChange={(e) => updateStoryCard(card.id, { content: e.target.value })}
                className="w-full h-28 bg-black/30 border border-white/5 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-pink-500 resize-none"
                placeholder="What should the simulation know about this card?"
              />

              <textarea
                value={card.notes}
                onChange={(e) => updateStoryCard(card.id, { notes: e.target.value })}
                className="w-full h-20 bg-black/30 border border-white/5 rounded-md p-3 text-sm text-zinc-400 focus:outline-none focus:border-pink-500 resize-none"
                placeholder="Optional notes or usage hints"
              />
            </div>
          ))}

          {knowledgeBase.storyCards.length === 0 && (
            <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-zinc-500">
              Add a story card to give the simulation reusable world lore.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PlotEssentials;
