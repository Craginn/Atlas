// AID-Docs index. The markdown is bundled at build time as raw text so the Docs
// tab reads from one source rather than globbing the folder itself.
//
// This lived under services/agent until the in-app agent was removed; it was
// the only part of that directory not tied to the agent.
const rawDocs = import.meta.glob('../../components/atlas/AID-Docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface DocEntry {
  /** Full relative path from the AID-Docs root, e.g. "01-scripting/api/hooks-overview.md". */
  key: string;
  /** Top-level folder (or "root"), used to group the nav. */
  section: string;
  /** Display name (filename without extension). */
  title: string;
  content: string;
}

const PREFIX = "../../components/atlas/AID-Docs/Aid-Doc's/";
const BARE = '../../components/atlas/AID-Docs/';

export const DOCS: DocEntry[] = Object.entries(rawDocs)
  .map(([path, content]) => {
    const rel = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path.replace(BARE, '');
    const parts = rel.split('/');
    const section = parts.length > 1 ? parts[0] : 'root';
    const file = parts[parts.length - 1].replace(/\.md$/, '');
    return { key: rel, section, title: file, content };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

export interface DocHit {
  key: string;
  title: string;
  /** The matching passage, not the whole file — keeps agent context small. */
  excerpt: string;
  score: number;
}

/**
 * Keyword retrieval over the docs. Scores a file by how many query terms it
 * contains (title matches weigh more), then returns the densest passage rather
 * than the full document so several hits fit in one tool result.
 */
export function searchDocs(query: string, limit = 4): DocHit[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9_.]+/)
    .filter(t => t.length > 2);
  if (terms.length === 0) return [];

  const hits: DocHit[] = [];
  for (const doc of DOCS) {
    const haystack = doc.content.toLowerCase();
    const title = doc.key.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 5;
      const occurrences = haystack.split(term).length - 1;
      score += Math.min(occurrences, 10);
    }
    if (score > 0) hits.push({ key: doc.key, title: doc.title, excerpt: excerptFor(doc.content, terms), score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Pull the ~40-line window around the first term match. */
function excerptFor(content: string, terms: string[]): string {
  const lines = content.split('\n');
  const idx = lines.findIndex(line => {
    const lower = line.toLowerCase();
    return terms.some(t => lower.includes(t));
  });
  if (idx === -1) return lines.slice(0, 40).join('\n');
  const start = Math.max(0, idx - 8);
  return lines.slice(start, start + 40).join('\n');
}
