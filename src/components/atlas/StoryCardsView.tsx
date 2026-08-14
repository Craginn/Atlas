import React, { useMemo, useState } from 'react';
import { StoryCard } from '@/types';
import { simulateTriggers } from '@/services/storyCardService';
import { Layers, Plus, Trash2, Zap, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface StoryCardsViewProps {
  cards: StoryCard[];
  setCards: (cards: StoryCard[]) => void;
}

const CARD_TYPES: StoryCard['type'][] = ['Character', 'Location', 'Faction', 'Class', 'Race', 'Custom'];

const newCard = (): StoryCard => ({
  id: `sc_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
  title: '',
  content: '',
  keywords: [],
  type: 'Character',
  notes: '',
});

// A short sample so the section isn't empty during testing.
const SAMPLE_CARD: StoryCard = {
  id: 'sc_sample',
  title: 'Sir Marcus',
  content:
    'Sir Marcus is a veteran knight of the Silver Order who served King Aldric for twenty years. He carries an enchanted longsword named Dawnbringer and is fiercely loyal but haunted by a past failure.',
  keywords: ['Marcus', 'Sir Marcus', 'the knight', 'Dawnbringer'],
  type: 'Character',
  notes: 'Main ally introduced in the tavern.',
};

const StoryCardsView: React.FC<StoryCardsViewProps> = ({ cards, setCards }) => {
  const [probe, setProbe] = useState('');
  const isMobile = useIsMobile();
  // On mobile the cards and the Trigger Simulator stack 50/50, leaving the card
  // list cramped. Let the simulator collapse to its header bar so the cards take
  // the full height. Desktop keeps it as a fixed side column — never collapsed.
  const [triggerCollapsed, setTriggerCollapsed] = useState(false);
  const collapsed = isMobile && triggerCollapsed;

  const update = (id: string, patch: Partial<StoryCard>) => {
    setCards(cards.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };
  const remove = (id: string) => setCards(cards.filter(c => c.id !== id));
  const add = () => setCards([...cards, newCard()]);
  const addSample = () => setCards([...cards, { ...SAMPLE_CARD, id: newCard().id }]);

  const { matches, worldLore } = useMemo(
    () => simulateTriggers(probe, cards),
    [probe, cards],
  );
  const activeIds = new Set(matches.map(m => m.card.id));

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#0a0a0a] text-zinc-300 overflow-hidden">
      {/* Cards column */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-zinc-800/50">
        <div className="h-12 flex items-center justify-between px-6 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center space-x-2">
            <Layers size={14} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Story Cards</span>
            <span className="text-[9px] font-mono text-zinc-600">{cards.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={addSample} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-600/15 hover:bg-emerald-600/25 transition-colors">
              <Sparkles size={12} /><span>Sample</span>
            </button>
            <button onClick={add} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-zinc-200 bg-zinc-700 hover:bg-zinc-600 transition-colors">
              <Plus size={12} /><span>New Card</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {cards.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-zinc-600">
              <div className="max-w-xs space-y-2">
                <Layers size={32} className="mx-auto" />
                <p className="text-sm">No Story Cards yet.</p>
                <p className="text-xs">Story Cards are trigger-activated world-lore. Add one, then test its triggers on the right.</p>
              </div>
            </div>
          )}

          {cards.map(card => {
            const active = activeIds.has(card.id);
            return (
              <div key={card.id} className={`rounded-xl border p-4 space-y-3 transition-colors ${active ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-zinc-800/60 bg-zinc-800/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <select
                      value={card.type}
                      onChange={(e) => update(card.id, { type: e.target.value as StoryCard['type'] })}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 focus:outline-none"
                    >
                      {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {active && (
                      <span className="flex items-center space-x-1 text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5">
                        <Zap size={9} /><span>TRIGGERED</span>
                      </span>
                    )}
                  </div>
                  <button onClick={() => remove(card.id)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Delete card">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Name <span className="text-zinc-700">(your reference — not sent to AI)</span></label>
                  <input
                    value={card.title}
                    onChange={(e) => update(card.id, { title: e.target.value })}
                    placeholder="e.g. Sir Marcus"
                    className="w-full bg-[#111] border border-white/5 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
                  />
                </div>

                 <div>
                   <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Entry <span className="text-emerald-500/60">(sent to AI as "World Lore:")</span></label>
                   <textarea
                     value={card.content}
                     onChange={(e) => update(card.id, { content: e.target.value })}
                     placeholder="Information-dense prose. Repeat the subject's name (the AI never sees Name). Put key facts first and last."
                     className="w-full h-48 bg-[#0a0a0a] border border-white/10 rounded p-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 placeholder:italic focus:border-emerald-500 outline-none resize-none"
                   />
                 </div>


                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Triggers <span className="text-zinc-700">(comma-separated; case-insensitive substring)</span></label>
                  <input
                    value={card.keywords.join(',')}
                    onChange={(e) => update(card.id, { keywords: e.target.value.split(',') })}
                    placeholder="Marcus,Sir Marcus,the knight,Dawnbringer"
                    className="w-full bg-[#111] border border-white/5 rounded px-3 py-1.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Notes <span className="text-zinc-700">(private — not sent to AI)</span></label>
                  <input
                    value={card.notes}
                    onChange={(e) => update(card.id, { notes: e.target.value })}
                    placeholder="Why you created this card, alternate versions, etc."
                    className="w-full bg-[#111] border border-white/5 rounded px-3 py-1.5 text-sm text-zinc-400 placeholder:text-zinc-600 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trigger simulator column — a stacked, collapsible row on mobile, fixed
          side column from md up. When collapsed on mobile it shrinks to just the
          header bar so the card list gets the full height. */}
      <div className={`w-full md:w-96 shrink-0 min-h-0 flex flex-col overflow-hidden ${
        collapsed ? 'flex-none' : 'flex-1 md:flex-none'
      }`}>
        <button
          type="button"
          onClick={() => { if (isMobile) setTriggerCollapsed(c => !c); }}
          aria-expanded={isMobile ? !triggerCollapsed : undefined}
          className="h-12 flex items-center px-6 border-b border-zinc-800/50 shrink-0 space-x-2 w-full text-left md:cursor-default"
        >
          <Zap size={14} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Trigger Simulator</span>
          {isMobile && (collapsed
            ? <ChevronUp size={16} className="ml-auto text-zinc-400" />
            : <ChevronDown size={16} className="ml-auto text-zinc-400" />)}
        </button>
        {!collapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Paste recent narrative text (player input or AI output). Cards whose triggers appear are activated and
            their entries are grouped into a single <span className="text-emerald-400">World Lore:</span> block — exactly how AI Dungeon assembles context.
          </p>
          <textarea
            value={probe}
            onChange={(e) => setProbe(e.target.value)}
            placeholder="e.g. Marcus drew Dawnbringer as the shadows closed in…"
            className="w-full h-32 bg-[#111] border border-zinc-800 rounded-lg p-3 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 placeholder:italic focus:border-amber-500 outline-none resize-none"
          />

          <div>
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Activated ({matches.length})
            </div>
            {matches.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No cards triggered by this text.</p>
            ) : (
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.card.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">{m.card.title || '(unnamed card)'}</span>
                      <span className="text-[8px] font-mono text-emerald-500/70 uppercase">{m.card.type}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.matchedKeywords.map((k, i) => (
                        <span key={i} className="text-[9px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">{JSON.stringify(k)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {worldLore && (
            <div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Assembled context block</div>
              <pre className="text-[11px] font-mono text-zinc-300 bg-black/50 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap break-words">{worldLore}</pre>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default StoryCardsView;
