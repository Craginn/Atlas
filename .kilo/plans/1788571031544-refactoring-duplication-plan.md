# Refactoring Plan: Code Duplication & Architectural Consistency

## High-Priority

### 1. CARD_TYPES array duplication
- **Where:** `src/services/scriptingService.ts:23` and `src/components/atlas/StoryCardsView.tsx:12`
- **Canonical source:** `StoryCard['type']` in `src/types.ts:27`

**Proposed destination:** Export `CARD_TYPES` from `src/constants.ts` (or directly from `src/types.ts`).

**Steps:**
1. In `src/types.ts`, add: `export const CARD_TYPES: readonly StoryCard['type'][] = ['Character', 'Location', 'Faction', 'Class', 'Custom', 'Race'] as const;`
2. In `src/services/scriptingService.ts`, replace the local `CARD_TYPES` with an import from `@/types`.
3. In `src/components/atlas/StoryCardsView.tsx`, replace the local `CARD_TYPES` with an import from `@/types`.

**Impact:** Single source of truth. Adding a new card type now requires one change, not three. Eliminates the subtle order mismatch (`'Custom'` at index 4 vs index 5).

---

### 2. Story-card shape mapping duplication
- **Where:** `fromAidStoryCard` (`src/services/scriptingService.ts:32-45`) and `toKnowledgeBaseCards` (`src/services/blocks/runBlocks.ts:187-198`)
- **Relationship:** Both map AID sandbox shape → `StoryCard`.

**Proposed destination:** Keep `fromAidStoryCard` as the canonical mapper in `scriptingService.ts`. Make `toKnowledgeBaseCards` delegate to it.

**Steps:**
1. In `src/services/blocks/runBlocks.ts`, replace the inline map with `fromAidStoryCard`:
   ```ts
   import { fromAidStoryCard } from '../scriptingService';
   // ...
   export function toKnowledgeBaseCards(cards: AidCard[]): StoryCard[] {
     return cards.map(fromAidStoryCard);
   }
   ```
2. Verify `BlockCanvas.tsx:447` still receives `StoryCard[]`.

**Impact:** Guarantees that any future field addition (e.g., new `StoryCard` property) is mapped in one place. Eliminates drift between the two inverse mappings.

---

### 3. seedWorldState logic duplication
- **Where:** `src/services/blocks/runBlocks.ts:56-62` (named function) and `src/services/scriptingService.ts:345-347` (inline in `simulateStep`)

**Proposed destination:** Extract the "seed storyCards from KB if absent" step into a shared helper in `scriptingService.ts`.

**Steps:**
1. In `src/services/scriptingService.ts`, add:
   ```ts
   export const seedStoryCards = (state: WorldState, kb?: KnowledgeBase): WorldState => {
     if (kb?.storyCards && !state.storyCards) {
       return { ...state, storyCards: kb.storyCards.map(toAidStoryCard) };
     }
     return state;
   };
   ```
2. In `src/services/scriptingService.ts:345-347`, replace the inline block with `currentState = seedStoryCards(currentState, knowledgeBase);`.
3. In `src/services/blocks/runBlocks.ts:56-62`, replace `seedWorldState` with a thin wrapper that deep-clones first (preserving existing behavior) then delegates:
   ```ts
   function seedWorldState(worldState: WorldState, kb?: KnowledgeBase): WorldState {
     const clone = JSON.parse(JSON.stringify(worldState ?? {}));
     return seedStoryCards(clone, kb);
   }
   ```

**Impact:** The seeding rule ("only seed when storyCards is absent") lives in one place. The block-canvas-specific deep-clone stays in `runBlocks.ts` where it belongs.

---

### 4. TabButton component duplication
- **Where:** `src/components/atlas/HeimdallPanel.tsx:13-23` and `src/components/atlas/StateEditor.tsx:423-435`

**Proposed destination:** `src/components/atlas/TabButton.tsx`

**Steps:**
1. Create `src/components/atlas/TabButton.tsx`:
   ```tsx
   import React from 'react';
   interface TabButtonProps {
     label: string;
     icon: React.ElementType;
     active: boolean;
     onClick: () => void;
   }
   const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, active, onClick }) => (
     <button
       onClick={onClick}
       className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
         active ? 'bg-zinc-700/50 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
       }`}
     >
       <Icon size={14} />
       <span>{label}</span>
     </button>
   );
   export default TabButton;
   ```
2. In `HeimdallPanel.tsx`, remove the local `TabButton` and `import TabButton from './TabButton';`.
3. In `StateEditor.tsx`, remove the local `TabButton` and `import TabButton from './TabButton';`. The StateEditor version uses `id`/`activeTab` logic internally; extract that into the caller or adjust `TabButton` to accept an `active` boolean directly.

**Impact:** UI consistency. Any style change (padding, active state, hover) now requires one edit.

---

### 5. `<Director>` props duplication
- **Where:** `src/components/atlas/SimulationEngine.tsx:65-72` and `113-120`

**Proposed destination:** Build the props object once, before the `if (isMobile)` branch.

**Steps:**
1. In `SimulationEngine.tsx`, before `if (isMobile) {`, add:
   ```ts
   const directorProps = {
     onExecute,
     isProcessing,
     input,
     context,
     output,
     opening,
     result: lastResult?.output ?? '',
     setInput,
     setContext,
     setOutput,
     setOpening,
     misdirectedAnswer,
   };
   ```
2. Replace both `<Director ... />` JSX blocks with `<Director {...directorProps} />`.

**Impact:** Adding or renaming a Director prop now requires one place, not two. Eliminates mobile/desktop drift.

---

## Medium-Priority

### 6. Trigger matching core loop
- **Where:** `matchStoryCards` (`src/services/storyCardService.ts:28-40`) and `selectTriggeredCards` (`src/services/scriptingService.ts:108-117`)

**Proposed destination:** Make `selectTriggeredCards` a thin wrapper over `matchStoryCards` (or vice versa).

**Steps:**
1. In `src/services/scriptingService.ts`, replace `selectTriggeredCards` with:
   ```ts
   export const selectTriggeredCards = (cards: StoryCard[], recentText: string): StoryCard[] => {
     const matches = matchStoryCards(recentText, cards);
     return matches.map(m => m.card);
   };
   ```
2. Add the import: `import { matchStoryCards } from '@/services/storyCardService';`
3. Remove the duplicate substring logic.

**Impact:** Case-insensitive substring rules change once in `matchStoryCards`. `simulateTriggers` in `storyCardService.ts` and the scripting engine share identical matching semantics.

---

### 7. Module-level store boilerplate
- **Where:** `src/hooks/use-rpg-debug.tsx:17-24`, `src/hooks/use-layout-mode.tsx:29-45`, `src/services/terminal/tasks.ts:34-47`

**Proposed destination:** `src/hooks/use-module-store.ts` — a generic `createModuleStore` utility.

**Steps:**
1. Create `src/hooks/use-module-store.ts`:
   ```ts
   import { useSyncExternalStore, useCallback } from 'react';
   export function createModuleStore<T>(options: {
     initial: T;
     getServerSnapshot?: () => T;
     onChange?: (next: T) => void;
   }) {
     let value = options.initial;
     const listeners = new Set<() => void>();
     const getSnapshot = useCallback(() => value, []);
     const subscribe = useCallback((fn: () => void) => {
       listeners.add(fn);
       return () => listeners.delete(fn);
     }, []);
     const setValue = useCallback((next: T) => {
       value = next;
       options.onChange?.(next);
       listeners.forEach(fn => fn());
     }, [options]);
     const useStore = () => useSyncExternalStore(subscribe, getSnapshot, options.getServerSnapshot ?? getSnapshot);
     return { useStore, setValue, getValue: () => value };
   }
   ```
2. Refactor `useLayoutMode` to use `createModuleStore`.
3. Refactor `useRpgDebug` to use `createModuleStore`.
4. Refactor `tasks.ts` to use `createModuleStore` (or leave as-is if the store API is sufficiently different; `tasks.ts` exposes many specific functions rather than a single setter).

**Impact:** Reduces 20+ lines of identical boilerplate per store. Adding a new module-level store becomes a one-liner.

---

## Low-Priority / Architectural

### 8. Four-slot file-linking state initialization
- **Where:** `src/pages/Index.tsx:199-204` and `src/components/atlas/SettingsView.tsx:40-54`

**Proposed destination:** `src/utils/fileLinking.ts` — a typed factory for the four-slot record.

**Steps:**
1. Create `src/utils/fileLinking.ts`:
   ```ts
   export type SlotFile = { path: string; content: string };
   export type FileLinkingConfig = Record<'library' | 'input' | 'context' | 'output', SlotFile>;
   export const EMPTY_FILE_LINKING_CONFIG: FileLinkingConfig = {
     library: { path: 'Link File', content: '' },
     input: { path: 'Link File', content: '' },
     context: { path: 'Link File', content: '' },
     output: { path: 'Link File', content: '' },
   };
   export const EMPTY_LINKED_FILES: Record<'library' | 'input' | 'context' | 'output', File | null> = {
     library: null, input: null, context: null, output: null,
   };
   ```
2. In `Index.tsx`, replace the inline `useState` with `EMPTY_FILE_LINKING_CONFIG`.
3. In `SettingsView.tsx`, replace the inline `useState` initializers with `EMPTY_FILE_LINKING_CONFIG` and `EMPTY_LINKED_FILES`.

**Impact:** Adding/removing a script slot requires one type change. Both sites stay in sync.

---

### 9. LAYOUT_CHOICES vs LayoutMode type drift
- **Where:** `src/hooks/use-layout-mode.tsx` defines `type LayoutMode`, `src/components/atlas/SettingsView.tsx:230-234` re-declares the runtime array.

**Proposed destination:** Move `LAYOUT_CHOICES` into `use-layout-mode.tsx` and export it.

**Steps:**
1. In `src/hooks/use-layout-mode.tsx`, add:
   ```ts
   export const LAYOUT_CHOICES: { value: LayoutMode; label: string; hint: string }[] = [
     { value: 'auto', label: 'Automatic', hint: 'Follow the screen size.' },
     { value: 'mobile', label: 'Always compact', hint: 'Touch-sized controls.' },
     { value: 'desktop', label: 'Always full', hint: 'Pan-and-zoom canvas.' },
   ];
   ```
2. In `SettingsView.tsx`, remove the local `LAYOUT_CHOICES` and import it from `@/hooks/use-layout-mode`.

**Impact:** The runtime choices and the `LayoutMode` type are defined in the same file. A new layout mode cannot be added without touching both simultaneously.

---

## Rollout Order

1. High-priority items first (items 1–5), starting with type/constant extractions (1, 9) so later refactors can import them.
2. Medium-priority next (items 6–7), which depend on the constants already being stable.
3. Low-priority last (items 8–9), which are nice-to-have but carry low runtime risk.

## Validation

- Run `npx vitest run` after each priority tier.
- Spot-check `BlockCanvas.tsx:447` and `SimulationEngine.tsx` JSX after item 2 and 5.
- Verify `StoryCardsView.tsx` `<select>` still populates correctly after item 1.
