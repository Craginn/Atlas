# Error Reporting & Debugging — Technical Plan

## Problem Summary

| # | Symptom | Root File | Root Cause |
|---|---------|-----------|------------|
| 1 | Line 2200 reported for error at line 135 | `offlineSimulationService.ts:216` | Stack-trace regex (`/userscript\.js:(\d+)/`) matches a frame whose line number is in the *evaluated* code space, then a hardcoded `-1` (wrapper) and `-lineOffset` (Library) correction is applied. Any shift in the generated worker string — extra wrapper lines, different Node/V8 stack format, a Library whose line count doesn't match what was passed — silently produces the wrong number. |
| 2 | Multiple modifier errors collapsed to a single "line 1" event | `types.ts:165` + `scriptingService.ts:509` | `scriptErrors` is typed `{ hook, message }[]` — no `line` field. Caught-and-swallowed errors (detected by scanning logs for `ERROR:`) lose their line context at collection time. `Index.tsx:421-422` then shows only `scriptErrors[0]` in the Sentinel summary. |
| 3 | No per-line visual error markers in the editor | `CodeBuffer.tsx:79-152` | The red error bar shows `validation.errors[0].line` but there are no gutter markers, no inline highlights, and no runtime-error decoration. Runtime errors from `executionError` are never wired to the editor at all. |

---

## Design Decisions

### D1 — Replace stack-trace regex with inline line-counter instrumentation
**Chosen approach.** Rather than parsing V8's stack (which is format-fragile and offset-dependent), instrument the worker code with a `_ln` counter that is assigned to the current line number *before* each user-code statement runs. If that statement throws, `_ln` still holds the correct hook-relative line when the catch block reads it.

The worker body becomes:

```js
var _ln = 0, _caught = null;
try {
  // library preamble lines (unchanged) …

  _ln = 1;
  <user line 1>
  _ln = 2;
  <user line 2>
  …
} catch (err) {
  _caught = err;
  // use _ln (hook-relative, no offset math needed)
}
```

`_ln` is the 1-based line within the hook's own script — no `lineOffset` subtraction, no `-1` wrapper correction, no stack regex. The library preamble lines run *before* the `_ln = 1` assignment, so errors in Library code set `_ln` to a number higher than the hook's own line count, which we clamp to `'unknown'`.

*Rejected alternative:* Parse the stack but match the *first* `userscript.js` frame (deepest user frame). This is still format-dependent and doesn't fix the fundamental offset-math fragility.

### D2 — Enrich `scriptErrors` with `line` and `scriptId`
Change the shape from `{ hook, message }[]` to `{ hook, scriptId, line: string, message }[]`. Populate `line` from the `ERROR:` log prefix (console shim already includes it: `ERROR: [hook] line N: msg`). This lets every UI layer show the exact line without a second parsing pass.

### D3 — Show all caught errors in the Sentinel summary
`Index.tsx:421-422` currently emits only `scriptErrors[0]`. Replace with a multi-line summary: `"3 caught errors: Input Modifier line 12 — …; Output Modifier line 45 — …"`. HeimdallPanel already iterates all entries; this just fixes the one-line summary.

### D4 — Add runtime-error line decorations to CodeBuffer
CodeMirror 6's `DecorationSet` + `EditorView.decorations` supports both gutter markers (red dot) and inline background highlights per-line. Pass a `runtimeErrors: { line: number; message: string }[]` prop into `CodeBuffer`. Compute a `DecorationSet` in a `useEffect` and dispatch it via `view.dispatch({ effects: EditorView.decorations.set(newSet) })`.

`AILogicEditor` computes a per-script map of runtime errors from the simulation result and passes the active script's errors to `CodeBuffer`.

---

## Task List

### Task 1 — Instrument the worker code (`offlineSimulationService.ts`)

**File:** `src/services/offlineSimulationService.ts`

1. Replace the stack-trace parsing block (lines 213–221) with a `_ln`-based extractor.
2. Rewrite the `workerCode` template string so that after the Library preamble, before the user's `execCode`, the body reads:
   ```js
   var _ln = 0, _caught = null;
   try {
   ```
3. Transform `execCode` by prepending `_ln = N;` (1-based) before each top-level line:
   ```js
   const instrumented = execCode
     .split('\n')
     .map((line, i) => `  _ln = ${i + 1};\n${line}`)
     .join('\n');
   ```
4. Append a `} catch (_caught) { … }` block after the instrumented code that reads `_ln` and `_caught.message` to build the error object — identical shape to today, but `line` comes from `_ln` directly.
5. Errors originating in Library code (where `_ln` > hook line count) produce `line: 'unknown'`.
6. Remove the `err.stack.match(/userscript\.js:(\d+)/)` regex and all offset arithmetic (`-1`, `-lineOffset`). The `lineOffset` parameter can be removed from the worker message payload and function signature (it is no longer needed for line mapping).

**Affected lines:** 111–228 (worker template), 213–224 (catch block), 303 (postMessage payload).

---

### Task 2 — Enrich `scriptErrors` type and collection

**File:** `src/types.ts`

Change `scriptErrors` in `SimulationResult` (line 165):
```ts
// Before
scriptErrors?: { hook: string; message: string }[];
// After
scriptErrors?: { hook: string; scriptId: string; line: string; message: string }[];
```

**File:** `src/services/scriptingService.ts`

At the caught-error collection loop (lines 506–512), parse the `ERROR:` log prefix to extract `hook` and `line`:
```ts
// Console shim format: "ERROR: [hook] line N: message"
const errMatch = entry.slice('ERROR:'.length).trim().match(/^\[(.+?)\]\s*line\s*(\S+?)\s*:\s*(.+)$/);
if (errMatch) {
  scriptErrors.push({
    hook: errMatch[1],
    scriptId: script.id,
    line: errMatch[2],
    message: errMatch[3],
  });
}
```
The `scriptId` comes from the enclosing `script.id` (line 471).

---

### Task 3 — Update Sentinel summary message

**File:** `src/pages/Index.tsx` (lines 419–423)

Replace the single-error summary with a joined list:
```ts
message: result.executionError
  ? `${result.executionError.hook} failed at line ${result.executionError.line}: ${result.executionError.message}`
  : result.scriptErrors?.length
  ? `${result.scriptErrors.length} caught error(s): ${result.scriptErrors
      .map(e => `${e.hook} line ${e.line} — ${e.message}`)
      .join('; ')}`
  : `Simulation finished with ${triggered.length} scripts triggered.`,
```

---

### Task 4 — Add runtime-error decorations to CodeBuffer

**File:** `src/components/atlas/CodeBuffer.tsx`

1. Add imports:
   ```ts
   import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
   ```
2. Add `runtimeErrors` to `CodeBufferProps`:
   ```ts
   runtimeErrors?: { line: number; message: string }[];
   ```
3. In the component body, add a `useEffect` that builds a `DecorationSet` from `runtimeErrors` and dispatches it:
   ```ts
   useEffect(() => {
     const view = cmRef.current?.view;
     if (!view) return;
     const decs = runtimeErrors?.length
       ? DecorationSet.of(
           runtimeErrors.flatMap(e => {
             if (e.line < 1 || e.line > safeValue.split('\n').length) return [];
             const lineHandle = view.state.doc.line(e.line);
             return [
               Decoration.line({ class: 'cm-runtime-error-line' }).range(lineHandle.from, lineHandle.to),
               Decoration.widget({ widget: new GutterErrorWidget(e.line), side: 1 }).range(lineHandle.from),
             ];
           }),
           view.state.doc
         )
       : DecorationSet.empty;
     view.dispatch({ effects: EditorView.decorations.set(decs) });
   }, [runtimeErrors, safeValue]);
   ```
4. Add a lightweight gutter widget (inline class, no external dep):
   ```ts
   class GutterErrorWidget extends WidgetType {
     constructor(private line: number) { super(); }
     toDOM() {
       const el = document.createElement('div');
       el.className = 'cm-gutter-error-dot';
       el.title = `Runtime error at line ${this.line}`;
       el.textContent = '●';
       return el;
     }
     ignoreEvent() { return false; }
   }
   ```
5. Add CSS classes (via the existing theme or inline):
   - `.cm-runtime-error-line` → `background: rgba(220, 38, 38, 0.15);`
   - `.cm-gutter-error-dot` → `color: #ef4444; font-size: 10px; line-height: 1; padding-top: 4px;`

---

### Task 5 — Thread runtime errors through AILogicEditor → CodeBuffer

**File:** `src/components/atlas/AILogicEditor.tsx`

1. Add `runtimeErrorsByScriptId: Record<string, { line: number; message: string }[]>` to `AILogicEditorProps`.
2. In the file explorer, keep the existing red-dot / red-icon for validation errors (`errorIds`). Add a second indicator (e.g., a pulsing dot or distinct icon) for runtime errors so the user can distinguish "won't parse" from "ran and crashed".
3. Pass `runtimeErrors={runtimeErrorsByScriptId[activeScript?.id] ?? []}` to `<CodeBuffer … />`.

**File:** `src/pages/Index.tsx` (around line 540)

Build the runtime-errors map after `simulateStep` resolves:
```ts
const runtimeErrorsByScriptId = useMemo(() => {
  const map: Record<string, { line: number; message: string }[]> = {};
  (lastSimData as LastSimData | undefined)?.stateTrace?.forEach(entry => {
    if (entry.logs) {
      entry.logs.forEach((log: string) => {
        const m = log.match(/^\[ERROR\]\s*(.+?)(?:,\s*line\s*(\d+))?:\s*(.+)$/);
        if (m) {
          const [, hook, line, message] = m;
          const script = scripts.find(s => s.name === hook);
          if (script) {
            if (!map[script.id]) map[script.id] = [];
            map[script.id].push({ line: line ? Number(line) : 0, message });
          }
        }
      });
    }
  });
  return map;
}, [lastSimData, scripts]);
```
Pass it: `<AILogicEditor … runtimeErrorsByScriptId={runtimeErrorsByScriptId} />`.

---

### Task 6 — Tests

**File:** `src/services/offlineSimulationService.test.ts`

Add a test that verifies line numbers are correct when a hook throws at a known line:
```ts
it('reports the correct hook-relative line number without stack-trace parsing', async () => {
  const code = `const modifier = (t) => {
    return { text: t };
  }; modifier(text);
  throw new Error('intentional');
  console.log('never reached');`;
  const result = await runOfflineSimulation(code, {}, '', true, 'Input Modifier', [], 0);
  expect(result.error?.line).toBe('4'); // throw is on line 4 of the hook
});
```

**File:** `src/services/scriptErrorSurfacing.test.ts`

Update or add a test asserting that `scriptErrors` entries carry a `line` field when the console error message includes one.

---

## Validation Steps

1. `npx vitest run` — all existing tests pass, new tests pass.
2. `npm run build` — no TypeScript errors from the new types/props.
3. Manual smoke test:
   - Create a modifier with a known `throw` on line 12 → confirm error banner shows "line 12" (not line 1 or 2200).
   - Create a modifier with `console.error('boom')` on line 50 → confirm caught-error banner shows "line 50" and the Sentinel summary includes it.
   - Cause a runtime error on a specific line → confirm CodeMirror highlights that line in red and shows a red dot in the gutter.
4. `npm run lint` — no new warnings.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `_ln` instrumentation shifts line numbers in user-facing stack traces during development | The `_ln` value is the ground truth shown to the user; raw stack traces are no longer parsed. Stack traces in dev tools still show the instrumented line numbers, but those are developer-facing only. |
| Multi-statement lines (ternaries, chained calls) produce only one `_ln` assignment | Acceptable — the line-level granularity is the same as what the editor shows. Statement-level granularity would require per-statement wrapping, which would bloat the worker code ~3×. |
| `RuntimeError` decorations persist after re-run if `runtimeErrors` prop is cleared | The `useEffect` dependency array includes `runtimeErrors`; when it becomes `[]`, the effect dispatches `DecorationSet.empty`. |
| Library code errors set `_ln` to a hook-line-count-overflow value | Clamp: if `_ln > hookCode.split('\n').length`, set `line: 'unknown'`. Library errors are silently attributed to the Library, not the hook. |
| `ERROR:` log format changes | The regex is anchored to `ERROR: [hook] line N: msg` — if the console shim format changes, the catch degrades gracefully (errors still collected, line becomes `'unknown'`). |

---

## Open Questions

None — all three issues have a clear implementation path with bounded scope. The only remaining decision is whether the `_ln` instrumentation or the stack-trace fix is preferred; the instrumentation approach is recommended because it eliminates the fragile regex entirely.
