import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Book, Search, FileText, ChevronLeft } from 'lucide-react';
import { DOCS, DocEntry } from '@/services/docs';
import { useIsMobile } from '@/hooks/use-mobile';

const DocsView: React.FC = () => {
  const [selected, setSelected] = useState<string>(DOCS[0]?.key ?? '');
  const [query, setQuery] = useState('');
  const isMobile = useIsMobile();
  // Phone screens can't fit list + article side by side, so they become one
  // master/detail stack: the list until you pick a doc, then the article.
  const [showList, setShowList] = useState(false);
  const listVisible = !isMobile || showList || !selected;

  const filtered = useMemo(() => {
    if (!query.trim()) return DOCS;
    const q = query.toLowerCase();
    return DOCS.filter(d => d.key.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, DocEntry[]>();
    for (const d of filtered) {
      if (!map.has(d.section)) map.set(d.section, []);
      map.get(d.section)!.push(d);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const active = DOCS.find(d => d.key === selected);

  return (
    <div className="flex h-full bg-[#09090b] text-zinc-300 overflow-hidden">
      {/* Sidebar — full width on mobile, fixed column from md up */}
      <div className={`${listVisible ? 'flex' : 'hidden'} w-full md:w-72 md:flex shrink-0 border-r border-zinc-800/50 flex-col`}>
        <div className="h-12 flex items-center px-4 space-x-2 border-b border-zinc-800/50 shrink-0">
          <Book size={14} className="text-purple-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AID Docs</span>
        </div>
        <div className="p-3 border-b border-zinc-800/50">
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5">
            <Search size={12} className="text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="bg-transparent text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
          {grouped.map(([section, docs]) => (
            <div key={section}>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-2 mb-1">{section}</div>
              {docs.map(d => (
                <button
                  key={d.key}
                  onClick={() => { setSelected(d.key); setShowList(false); }}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors ${
                    selected === d.key ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                  }`}
                >
                  <FileText size={11} className="shrink-0" />
                  <span className="truncate">{d.title}</span>
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="text-xs text-zinc-600 italic px-2">No docs match your search.</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`${listVisible && isMobile ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden min-w-0`}>
        {isMobile && active && (
          <button
            onClick={() => setShowList(true)}
            className="h-10 shrink-0 flex items-center gap-1 px-3 border-b border-zinc-800/50 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} />
            <span>All docs</span>
          </button>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
        {active ? (
          <article className="prose prose-invert prose-sm max-w-3xl mx-auto px-4 md:px-8 py-6">
            <ReactMarkdown>{active.content}</ReactMarkdown>
          </article>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <p className="text-sm">Select a document to read.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default DocsView;
