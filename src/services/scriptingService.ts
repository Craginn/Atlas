import { runOfflineSimulation } from './offlineSimulationService';
import { WorldState, Script, SimulationMode, SimulationResult, KnowledgeBase, ScriptStateTrace, AiCallTrace, StoryCard, HistoryEntry } from '../types';

// The sandbox's `storyCards` global follows AID's script-facing schema (keys as a
// comma-joined string, entry, description, plus id/timestamps/useForCharacterCreation).
// The app's Knowledge Base cards use the editor shape (keywords[]/content/notes), so
// map them into the AID shape when seeding a run's world state.
export const toAidStoryCard = (c: StoryCard) => {
  const now = new Date().toISOString();
  return {
    id: c.id,
    keys: Array.isArray(c.keywords) ? c.keywords.join(',') : (c.keywords ?? ''),
    entry: c.content ?? '',
    type: c.type ?? 'Custom',
    title: c.title ?? '',
    description: c.notes ?? '',
    createdAt: now,
    updatedAt: now,
    useForCharacterCreation: false,
  };
};

const CARD_TYPES: StoryCard['type'][] = ['Character', 'Location', 'Faction', 'Class', 'Custom', 'Race'];

/**
 * The inverse of toAidStoryCard: sandbox shape back to the editor's.
 *
 * A script calling addStoryCard writes into `worldState.storyCards` in the AID
 * shape. Without this the card exists in state but can never reach the Story
 * Cards view, which reads the Knowledge Base.
 */
export const fromAidStoryCard = (c: {
  id?: string; keys?: string; entry?: string; type?: string; title?: string; description?: string;
}): StoryCard => ({
  id: c.id ?? Math.random().toString(36).slice(2),
  title: c.title ?? '',
  content: c.entry ?? '',
  // `keys` is AID's comma-joined string. Blank segments are dropped so a
  // trailing comma doesn't become an empty keyword.
  keywords: (c.keys ?? '').split(',').map(k => k.trim()).filter(Boolean),
  // Scripts pass arbitrary strings for type; anything off the editor's union
  // would corrupt the card, so unrecognized values fall back to Custom.
  type: CARD_TYPES.includes(c.type as StoryCard['type']) ? (c.type as StoryCard['type']) : 'Custom',
  notes: c.description ?? '',
});

/**
 * Fold cards a script created back into the Knowledge Base.
 *
 * Merges rather than replaces, keyed on id: the sandbox seeds its array from the
 * Knowledge Base only on the first run, so a wholesale replace would silently
 * revert any card the user edited in the Story Cards view afterwards. Existing
 * cards are therefore left exactly as the user has them, and only genuinely new
 * ones are appended.
 */
export const mergeScriptStoryCards = (
  existing: StoryCard[],
  fromState: unknown,
  // Ids the script actually created or modified this run. Cards NOT in this set are
  // treated as stale sandbox copies and left exactly as the user has them (so a
  // hand-edit in the Story Cards view is never reverted). When omitted, no existing
  // card is updated — only genuinely new ones are appended (the original behavior).
  changedIds?: Iterable<string>,
): StoryCard[] => {
  if (!Array.isArray(fromState)) return existing;
  const changed = new Set(changedIds ?? []);
  const known = new Map(existing.map(c => [c.id, c] as const));

  // Apply script updates in place (by id), so a card whose `> settings` a script
  // rewrote via updateStoryCard shows its new content in the view.
  let updatedAny = false;
  const next = existing.map(card => {
    if (!changed.has(card.id)) return card;
    const src = (fromState as Array<Record<string, unknown>>).find(
      c => c && typeof c === 'object' && String((c as { id?: unknown }).id ?? '') === card.id,
    );
    if (!src) return card;
    const merged = fromAidStoryCard(src as Parameters<typeof fromAidStoryCard>[0]);
    if (JSON.stringify(merged) === JSON.stringify(card)) return card;
    updatedAny = true;
    return merged;
  });

  const added = fromState
    .filter(c => c && typeof c === 'object' && !known.has(String((c as { id?: unknown }).id ?? '')))
    .map(c => fromAidStoryCard(c as Parameters<typeof fromAidStoryCard>[0]));

  if (!updatedAny && added.length === 0) return existing;
  return [...next, ...added];
};

/**
 * How many trailing history entries AID's context window carries.
 *
 * The full `history` array is bounded by HISTORY_LIMIT for cost reasons, but the
 * context AID actually assembles is a much shorter tail than that.
 */
const CONTEXT_HISTORY_TURNS = 8;

/**
 * Pick the Story Cards AID would inject this turn.
 *
 * AID triggers a card when one of its keys appears in the recent text, so match
 * against the same window that goes into the context rather than the whole
 * story. Matching is case-insensitive and substring-based, as on the platform —
 * a key of `sword` fires on "broadsword".
 */
export const selectTriggeredCards = (cards: StoryCard[], recentText: string): StoryCard[] => {
  const haystack = recentText.toLowerCase();
  if (!haystack.trim()) return [];
  return cards.filter(card =>
    (card.keywords ?? []).some(key => {
      const k = key.trim().toLowerCase();
      return k.length > 0 && haystack.includes(k);
    })
  );
};

/**
 * Runtime `state.memory` fields that participate in context assembly.
 *
 * A script feeds three context slots through `state.memory`, and each *overrides*
 * the corresponding Plot Components UI field when set (AID-Docs
 * 02-context/context-assembly-order.md lists the UI and the script write as
 * alternate sources for the same slot):
 *   - `context`     → Plot Essentials
 *   - `authorsNote` → Author's Note
 *   - `frontMemory` → Front Memory (script-only; no UI field exists for it)
 */
export interface MemoryContext {
  context?: unknown;
  authorsNote?: unknown;
  frontMemory?: unknown;
}

/** Coerce a possibly-non-string memory/KB field to a trimmed-safe string. */
const asText = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Build the context the Context Modifier receives — the thing AID "hands the model".
 *
 * Generation is always simulated here (no real model call ever happens), so the
 * whole value of this string is fidelity: it is what the Context hook rewrites and
 * what the AI Call trace shows as `contextSent`. It is assembled after the Input
 * hook so it can include the action that hook produced.
 *
 * Layout follows AID's documented assembly order (AID-Docs
 * 02-context/context-assembly-order.md): AI Instructions, Plot Essentials, Story
 * Cards (each prefixed "World Lore:"), Story Summary, Memory Bank, History,
 * Author's Note, Last Action, Front Memory. AID concatenates these blocks with
 * newlines rather than labelled headings — the one documented literal is the
 * "World Lore:" card prefix — so we join with blank lines and invent no section
 * headers a script might mis-parse. Empty sections drop out entirely.
 *
 * `memory` carries the runtime `state.memory` at assembly time: `context` and
 * `authorsNote` override their UI counterparts, and `frontMemory` is the
 * script-only slot pinned to the very end, where AID gives it maximum influence.
 */
export const assembleContext = (
  knowledgeBase: KnowledgeBase | undefined,
  history: unknown,
  action: string,
  memory?: MemoryContext,
): { context: string; triggeredCards: StoryCard[] } => {
  const entries: HistoryEntry[] = Array.isArray(history) ? (history as HistoryEntry[]) : [];
  const recent = entries.slice(-CONTEXT_HISTORY_TURNS);
  const recentText = [...recent.map(e => e?.text ?? ''), action].join('\n');

  const triggeredCards = selectTriggeredCards(knowledgeBase?.storyCards ?? [], recentText);

  // A script write to state.memory wins over the UI field for the same slot.
  const plotEssentials = asText(memory?.context) || asText(knowledgeBase?.plotEssentials);
  const authorsNote = asText(memory?.authorsNote) || asText(knowledgeBase?.authorsNote);
  const frontMemory = asText(memory?.frontMemory);

  const sections = [
    asText(knowledgeBase?.aiInstructions),
    plotEssentials,
    triggeredCards.map(c => `World Lore: ${asText(c.content)}`).join('\n'),
    asText(knowledgeBase?.storySummary),
    asText(knowledgeBase?.memoryBank),
    recent.map(e => asText(e?.text)).filter(t => t.trim()).join('\n'),
    authorsNote,
    action,
    frontMemory,
  ].filter(s => s.trim().length > 0);

  return {
    context: sections.join('\n\n'),
    triggeredCards,
  };
};

// AID accepts several return shapes from a modifier and coerces them: `{ text }`,
// `{ text, stop }`, or a bare string (real scenario scripts do return bare strings —
// a Context Modifier ending in `return text` is valid there). Reading `.text` off a
// string yields undefined, which silently discarded the whole hook's work, so
// normalize every shape to one place before the pipeline consumes it.
export const normalizeModifierResult = (
  result: { text?: string; stop?: boolean } | string | null | undefined
): { text?: string; stop?: boolean } => {
  if (typeof result === 'string') return { text: result };
  if (result && typeof result === 'object') {
    return {
      text: typeof result.text === 'string' ? result.text : undefined,
      stop: result.stop === true,
    };
  }
  // undefined/null: the hook returned nothing. Not an error in AID — the text
  // simply passes through unchanged — so report no text rather than ''.
  return {};
};

/** The action kinds a player can submit. `start`/`continue` are engine-authored. */
export type PlayerActionType = 'do' | 'say' | 'story';

/**
 * Wrap a player's raw input the way AID does before any hook sees it.
 *
 * The Input Modifier does NOT receive what the player typed — it receives the
 * formatted action. A player typing `kira` on a Do turn hands the hook
 * `"\n> You kira.\n"`. Atlas passed the raw string, so engines that parse the
 * `> You ` prefix (to strip commands, detect Say vs Do, etc.) saw nothing to
 * parse and silently took the wrong branch.
 *
 * The trailing period is AID's: it terminates an action that the player didn't
 * punctuate themselves. Input already ending in terminal punctuation is left
 * alone, so `kira!` does not become `kira!.`.
 */
export const formatPlayerAction = (input: string, type: PlayerActionType = 'do'): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const terminated = /[.!?…]["')\]]?$/.test(trimmed) ? trimmed : `${trimmed}.`;

  switch (type) {
    case 'say':
      return `\n> You say "${terminated}"\n`;
    case 'story':
      // Story is narration the player inserts directly — no `> You` framing.
      return `\n${terminated}\n`;
    case 'do':
    default:
      return `\n> You ${terminated}\n`;
  }
};

/**
 * How many turns of `history` to retain.
 *
 * AID exposes a bounded window, and this array lives inside the world state that
 * is structured-cloned into the worker on every hook — letting it grow without
 * limit would make each turn progressively more expensive to run.
 */
const HISTORY_LIMIT = 40;

/**
 * Append a completed turn to AID's `history`.
 *
 * Nothing wrote to `history` before this, so the global was permanently `[]` and
 * any script reading it (e.g. `history[history.length - 1]?.text`) silently got
 * `undefined`. Entries use AID's `{ text, type, rawText }` shape: `rawText` is
 * what the player typed, `text` is the action after the Input Modifier rewrote it.
 *
 * The player action and the resulting output are separate entries, matching AID,
 * where each is its own action in the story.
 */
export const appendHistory = (
  existing: unknown,
  rawInput: string,
  modifiedInput: string,
  output: string,
  actionType: PlayerActionType = 'do',
): HistoryEntry[] => {
  const history: HistoryEntry[] = Array.isArray(existing) ? [...(existing as HistoryEntry[])] : [];

  // This turn's number: one past the highest already recorded. The player action
  // and the output it produces share it, so the State Editor can pin both to the
  // same turn. Derived from the entries rather than counted, so it survives the
  // rolling-window trim dropping older turns off the front.
  const turn = history.reduce((max, e) => Math.max(max, e.turn ?? 0), 0) + 1;

  // The very first action of a scenario is AID's `start` — that is the opening,
  // which Atlas sends as the first turn's input. Everything after carries the
  // kind the player picked on the Do/Say/Story selector.
  if (rawInput.trim() || history.length === 0) {
    history.push({
      text: modifiedInput,
      type: history.length === 0 ? 'start' : actionType,
      rawText: rawInput,
      turn,
    });
  }
  // Whatever the player ends up seeing is the continuation, whether it came from
  // a real generation or a script seizing the Output.
  if (output) {
    history.push({ text: output, type: 'continue', rawText: output, turn });
  }

  return history.length > HISTORY_LIMIT ? history.slice(-HISTORY_LIMIT) : history;
};

// The AID hooks, in fire order. The Library is deliberately NOT in this list: it
// is shared code that AID concatenates *before each hook*, not a hook of its own.
// The true execution order is therefore:
//   Library -> Input -> Library -> Context -> Library -> Output
// (the Input hook, and its preceding Library pass, only run on a player action).
const HOOK_ORDER = ['Input Modifier', 'Context Modifier', 'Output Modifier'];

const simulateStep = async (
  input: string,
  worldState: WorldState,
  scripts: Script[],
  // Retained for signature stability; the app is offline-only, so `local` is the
  // only value. Kept as a parameter so callers (and the trace log) still read cleanly.
  mode: SimulationMode = 'local',
  knowledgeBase?: KnowledgeBase,
  // Stands in for the model's reply. Authored by the user in the Director's AI
  // Call box; nothing is generated.
  simulatedAiResponse: string = '',
  // Which of AID's Do/Say/Story the player submitted. Decides how the raw input
  // is framed before any hook sees it, and the `type` the turn records in history.
  actionType: PlayerActionType = 'do',
  // The rolling history window, held outside the state object. Omit and a legacy
  // worldState.history is adopted for one run, then migrated off.
  history?: HistoryEntry[],
): Promise<SimulationResult> => {
  console.log(`--- Scripting Service: Starting simulation step in '${mode}' mode ---`);

  const executedScriptIds: string[] = [];
  let currentState = JSON.parse(JSON.stringify(worldState));

  // AID's `history` is engine-owned and lives outside `state`. Atlas used to keep
  // it on worldState, so every turn's text accumulated inside the object scripts
  // persist and the State Editor renders. It now travels on its own.
  //
  // Adopt a legacy in-state history once, then strip it, so existing saved states
  // migrate instead of silently starting empty.
  let currentHistory: HistoryEntry[] = Array.isArray(history)
    ? [...history]
    : (Array.isArray(currentState.history) ? currentState.history : []);
  delete currentState.history;
  // Expose the Knowledge Base's Story Cards to the sandbox so the AID `storyCards`
  // global reflects the user's real cards (the executor reads worldState.storyCards).
  if (knowledgeBase?.storyCards && !currentState.storyCards) {
    currentState.storyCards = knowledgeBase.storyCards.map(toAidStoryCard);
  }
  // Snapshot the cards the run starts with (id → serialized content) so we can tell
  // which ones a script actually created or MODIFIED this turn. The Knowledge Base
  // merge needs this: a script that updates an existing card (updateStoryCard, e.g.
  // a `> setting: value` write) must reach the Story Cards view, while cards the
  // script never touched stay exactly as the user hand-edited them.
  const initialCardSig = new Map<string, string>();
  for (const c of (Array.isArray(currentState.storyCards) ? currentState.storyCards : [])) {
    if (c && typeof c === 'object' && c.id != null) initialCardSig.set(String(c.id), JSON.stringify(c));
  }
  const heimdallLogs: (ScriptStateTrace & { logs: unknown[] })[] = [];
  const executedCode: { [scriptName: string]: string } = {};
  let reasoningLog: string | undefined = undefined;

  // The scenario opening is AID's `start` action and is NOT framed — it enters the
  // story as written. Only a player's own turn gets the `> You …` treatment, so
  // detect the opening the way AID does: it is the turn with no history behind it.
  const isOpening = currentHistory.length === 0;
  // What the hooks actually receive. Atlas used to pass the raw typed string here,
  // which is why engines parsing the `> You ` prefix never matched.
  let modifiedInput = isOpening ? input : formatPlayerAction(input, actionType);
  // Assembled lazily by ensureContext() below — it depends on the action the
  // Input Modifier produced, so it cannot be built before that hook has run.
  let modifiedContext = '';
  let contextAssembled = false;
  let triggeredCards: StoryCard[] = [];
  let modifiedOutput = '';

  // Assemble the context once, on first need. Called at the Context hook and
  // before the simulated AI call — so a real context exists when no Context
  // Modifier is active, which is the case that previously sent nothing at all.
  const ensureContext = () => {
    if (contextAssembled) return;
    // Pass the live state.memory so a script's Plot Essentials / Author's Note /
    // Front Memory writes (made in the Input hook, which runs first) reach the
    // assembled context instead of the stale UI values.
    const assembled = assembleContext(
      knowledgeBase, currentHistory, modifiedInput, currentState?.memory as MemoryContext,
    );
    modifiedContext = assembled.context;
    triggeredCards = assembled.triggeredCards;
    contextAssembled = true;
  };
  let stopped = false;
  // Set when a hook throws. Halts the pipeline (the engine stops) so later hooks
  // don't run against a half-applied state, and flags the run as failed for the UI.
  let executionError: { hook: string; line: string; message: string } | null = null;
  // Errors scripts reported via console.error but caught themselves (no throw).
  const scriptErrors: { hook: string; message: string }[] = [];
  let aiCall: AiCallTrace | undefined;
  let aiCallDone = false;
  // state.message is a player-facing toast, tracked separately from the AI Call
  // and the Output. It never becomes the generated/output text.
  let stateMessage = '';
  let messageAuthor: string | undefined;
  let stopAuthor: string | undefined;
  let stopText = '';
  // state.output is the Output-overwrite channel: a script that assigns it seizes the
  // final Output, ahead of any Output Modifier's return { text } (state.output wins).
  // null means untouched; '' is a legitimate value (a script blanking the Output).
  let outputOverride: string | null = null;
  let outputAuthor: string | undefined;
  // Whether anything actually authored the output this run, as distinct from it
  // merely being falsy. Lets '' survive as a real result (see finalOutput below).
  let outputProduced = false;

  // Reads state.message (the toast a script raised). `state` is the world state in
  // this sandbox, so a script writing state.message shows up here.
  const pendingMessage = (): string => {
    const m = currentState?.message;
    return typeof m === 'string' && m.trim() ? m : '';
  };

  {
    const activeScripts = scripts.filter(s => s.active && s.code && s.code.trim().length > 0);

    // The Library is shared code, not a hook: it never runs on its own, only
    // concatenated ahead of each hook (see HOOK_ORDER). Capture its code once.
    const libraryScript = activeScripts.find(s => s.name === 'Library');
    const libraryCode = libraryScript ? libraryScript.code : '';
    if (libraryScript) executedCode['Library'] = libraryScript.code;

    // The Input hook fires on every turn, not only when the player typed something.
    // AID runs onInput for the Opening (the scenario's first turn, before the player
    // has acted at all) and for Continue/Retry, both of which carry no new text — an
    // engine's setup work (character creation prompts, world seeding, state init)
    // lives in that hook and must still run. Empty `text` is a legitimate AID input,
    // so the hook receives '' rather than being skipped.

    // Build the hook run-list in fire order. Library is excluded — it runs before
    // each of these. Unknown-named scripts keep running, after the known hooks.
    const hookScripts = activeScripts
      .filter(s => s.name !== 'Library')
      .sort((a, b) => {
        const indexA = HOOK_ORDER.indexOf(a.name);
        const indexB = HOOK_ORDER.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    // The simulated AI call. Nothing is generated: the user-authored response stands
    // in for the model. This is the text the AI "returned" — the Output hook then
    // manipulates it into the final Output. state.message is NOT involved here.
    const runAiCall = () => {
      ensureContext();
      aiCall = {
        contextSent: modifiedContext,
        simulated: simulatedAiResponse,
        final: simulatedAiResponse,
        overridden: false,
      };
      modifiedOutput = simulatedAiResponse;
      aiCallDone = true;
      console.log('[ScriptingService] AI call (simulated).');
    };

    for (const script of hookScripts) {
        // The AI call sits between the Context and Output hooks, so the Output
        // Modifier receives the text the model "returned" (the user's stand-in reply).
        if (script.name === 'Output Modifier' && !aiCallDone) runAiCall();

        executedScriptIds.push(script.id);
        executedCode[script.name] = script.code;

        // Every hook is a modifier here (the Library was filtered out). It receives
        // the text for its stage: Input the player action, Context the assembled
        // context, Output the AI's returned text.
        let currentInput = modifiedInput;
        if (script.name === 'Context Modifier') {
            ensureContext();
            currentInput = modifiedContext;
        } else if (script.name === 'Output Modifier') {
            currentInput = modifiedOutput;
        }

        const stateBefore = JSON.parse(JSON.stringify(currentState));
        console.log(`[ScriptingService] Executing script: ${script.name}`);
        console.log(`[ScriptingService] State before:\n${JSON.stringify(stateBefore, null, 2)}`);

        // AID runs the Library ahead of every hook, in the hook's scope, so the
        // hook can call the library's functions. Concatenate it here. Skip the join
        // when there's no library so we don't shift reported error line numbers.
        const hasLibrary = libraryCode.trim().length > 0;
        const codeToExecute = hasLibrary ? libraryCode + '\n' + script.code : script.code;
        const { newState, logs: scriptLogs, result, error } = await runOfflineSimulation(codeToExecute, currentState, currentInput, true, script.name, currentHistory);
        // Make the "Library ran first" step visible in the trace/Code Logs.
        if (hasLibrary && Array.isArray(scriptLogs)) {
          scriptLogs.unshift(`[DEBUG] Library concatenated and executed before the ${script.name} hook.`);
        }
        // A script can catch its own exception and only console.error it (or log an
        // error and carry on). The hook doesn't throw, so executionError stays null
        // and the run looks healthy — the exact "silent crash" that hides bugs.
        // The console shim prefixes those with "ERROR:", so collect them here and
        // surface them as warnings.
        if (Array.isArray(scriptLogs)) {
          for (const entry of scriptLogs) {
            if (typeof entry === 'string' && entry.startsWith('ERROR:')) {
              scriptErrors.push({ hook: script.name, message: entry.slice('ERROR:'.length).trim() });
            }
          }
        }
        const stateAfter = JSON.parse(JSON.stringify(newState));
        
        console.log(`[ScriptingService] State after:\n${JSON.stringify(stateAfter, null, 2)}`);
        
        const stateChanged = JSON.stringify(stateBefore) !== JSON.stringify(stateAfter);
        console.log(`[ScriptingService] State changed: ${stateChanged}`);
        if (scriptLogs && scriptLogs.length > 0) {
          console.log(`[ScriptingService] Script logs: ${scriptLogs.join(' | ')}`);
        }

        heimdallLogs.push({
            scriptId: script.id,
            scriptName: script.name,
            before: stateBefore,
            after: stateAfter,
            logs: scriptLogs,
            stateChanged,
        });

        // Attribute a state.message write to the script that made it, so the UI can
        // name who took authority over the AI's text.
        if (stateAfter?.message && stateAfter.message !== stateBefore?.message) {
            messageAuthor = script.name;
        }

        // Attribute a state.output write likewise. A later writer wins (currentState
        // carries forward), and this override beats the modifier return { text } chain.
        //
        // Gated on state.overwrite: scripts following that convention consume
        // state.output in their Output hook and clear the flag, but leave
        // state.output itself populated. Reading it unguarded replayed a stale
        // command result over the next turn's narration. When a script never
        // defines state.overwrite at all, the flag can't be a signal, so the
        // original state.output-only behavior stands.
        const overwriteFlag = stateAfter?.overwrite;
        const overrideAuthorized = overwriteFlag === undefined || overwriteFlag === true;
        if (typeof stateAfter?.output === 'string' && stateAfter.output !== stateBefore?.output) {
            if (overrideAuthorized) {
                outputOverride = stateAfter.output;
                outputAuthor = script.name;
            }
            // Surface the convention either way: which hook wrote state.output, and
            // whether the flag let it through. Without this the only evidence a
            // queued message existed was it appearing in the narration later.
            if (Array.isArray(scriptLogs)) {
                scriptLogs.push(
                    `[DEBUG] ${script.name} set state.output (${JSON.stringify(stateAfter.output)}); ` +
                    `state.overwrite=${String(overwriteFlag)} → ${overrideAuthorized ? 'override applied' : 'override skipped'}.`
                );
            }
        }

        currentState = newState;

        // A hook threw: halt the pipeline (the engine stops) so no later hook runs
        // against a partially-applied state. The error is surfaced red in the UI.
        if (error) {
            executionError = error;
            stopped = true;
            stopAuthor = script.name;
            break;
        }

        const { text: returnedText, stop: stopFlag } = normalizeModifierResult(result);

        // Presence, not truthiness: '' is a legitimate return (an Output Modifier
        // blanking the text on player death), and dropping it left the hook's work
        // silently discarded.
        if (typeof returnedText === 'string') {
            if (script.name === 'Input Modifier') {
                modifiedInput = returnedText;
            } else if (script.name === 'Context Modifier') {
                modifiedContext = returnedText;
            } else if (script.name === 'Output Modifier') {
                modifiedOutput = returnedText;
                outputProduced = true;
            }
        }

        // AID stop flag: a script returning { stop: true } halts the pipeline.
        // stop cancels the action outright — it does not deliver text — so a script
        // that wants to speak without a generation uses the state.output channel.
        if (stopFlag) {
            stopped = true;
            stopAuthor = script.name;
            stopText = returnedText ?? '';
            break;
        }
    }

    if (executionError) {
      // A hook threw — no AI call, no output authority. The error surface handles it.
    } else if (stopped) {
      // A command halted before generation. Only its returned text (stopText) reaches
      // the Output box; if it returned no text (e.g. it just raised a state.message
      // prompt), the Output stays empty. state.message is captured separately below.
      aiCall = {
        contextSent: modifiedContext,
        simulated: simulatedAiResponse,
        final: stopText,
        overridden: Boolean(stopText),
        overriddenBy: stopText ? stopAuthor : undefined,
        reason: stopText ? 'stop' : undefined,
      };
      if (stopText) modifiedOutput = stopText;
    } else if (!aiCallDone) {
      // No Output Modifier is active, but the call still happens.
      runAiCall();
    }

    // A script that assigned state.output takes final authority over the Output,
    // ahead of any Output Modifier's return { text } (state.output beats return text).
    // A thrown hook forfeits this: it produced no trustworthy output.
    if (!executionError && outputOverride !== null) {
      modifiedOutput = outputOverride;
      outputProduced = true;
      aiCall = {
        contextSent: aiCall?.contextSent ?? modifiedContext,
        simulated: aiCall?.simulated ?? simulatedAiResponse,
        final: outputOverride,
        overridden: true,
        overriddenBy: outputAuthor,
        reason: 'output',
      };
    }

    // Capture the toast (if any) into its own channel — never the Output.
    stateMessage = pendingMessage();

    if (heimdallLogs.length > 0) {
      reasoningLog = JSON.stringify(heimdallLogs, null, 2);
    }
  }

  // Which story cards did the scripts create or modify this turn? (new id, or a
  // changed serialization vs the run's starting snapshot.) The KB merge uses this
  // to reflect script updates to existing cards without clobbering untouched ones.
  const changedStoryCardIds: string[] = [];
  for (const c of (Array.isArray(currentState.storyCards) ? currentState.storyCards : [])) {
    if (!c || typeof c !== 'object' || c.id == null) continue;
    const id = String(c.id);
    const prev = initialCardSig.get(id);
    if (prev === undefined || prev !== JSON.stringify(c)) changedStoryCardIds.push(id);
  }

  const outputMessage = executionError
    ? `Execution halted: ${executionError.hook} failed at line ${executionError.line}: ${executionError.message}`
    : stopped
    ? `Pipeline halted by script (stop). ${executedScriptIds.length} script(s) executed.`
    : `Local simulation complete. ${executedScriptIds.length} script(s) executed.`;
  console.log('[ScriptingService] Final currentState being returned:\n', JSON.stringify(currentState, null, 2));
  // outputMessage is a placeholder for "no hook produced output", so it must not
  // displace an output a hook deliberately produced — including ''. Falling back
  // on falsiness turned a death-clear into "Local simulation complete."
  const finalOutput = outputProduced ? modifiedOutput : (modifiedOutput || outputMessage);
  // Record the turn into AID's `history`. A failed run is not a turn that
  // happened, so a thrown hook records nothing.
  if (!executionError) {
    currentHistory = appendHistory(currentHistory, input, modifiedInput, finalOutput, actionType);
  }
  return {
    newState: currentState,
    newHistory: currentHistory,
    output: finalOutput,
    narration: finalOutput,
    reasoning: reasoningLog,
    executedCode,
    // The cards the assembled context actually injected, rather than a
    // hardcoded empty list.
    triggeredCards: triggeredCards.map(c => c.title),
    influenceLevel: 0,
    triggeredScriptIds: executedScriptIds,
    stateTrace: heimdallLogs,
    aiCall,
    executionError,
    scriptErrors,
    changedStoryCardIds,
    stateMessage,
    stateMessageAuthor: stateMessage ? messageAuthor : undefined,
  };
};

export const ScriptingService = { simulateStep };
