# Plan: Fix Identifier Redeclaration Error in RPG Script Suite

## Root Cause

The error occurs because `RPG ENGINE/Library.js` declares top-level `const` bindings (e.g. `const Say = '...'`, `const Response = '...'`, `const You = '...'`, etc.) at lines 2–16. When `scriptingService.ts` runs a hook, it concatenates the Library code with the hook code into a single string and wraps them in **one** IIFE function scope in `offlineSimulationService.ts:180-183`. Any `const`/`let` declaration in the hook that matches a Library identifier throws `SyntaxError: Identifier 'X' has already been declared`.

The error is currently reported as `line: 'unknown'` because `validateScriptSyntax` runs `new Function(code)` on the combined code, and V8's parser reports the error at line 1 (the Library's first declaration) with no line info in the message, defaulting to line 1. The `libraryLineCount` offset is calculated at `scriptingService.ts:495` but is never passed to `runOfflineSimulation`, so no line mapping back to the hook occurs.

## Goal

Turn a cryptic `line: unknown` syntax error into a precise, actionable diagnostic that tells the user exactly which Library identifier collides with their hook and where in their hook it happens.

## Tasks

### 1. Add Library-to-Hook Collision Detection in Validator

**File:** `src/services/offlineSimulationService.ts`

In `validateScriptSyntax`, add a new pre-check that:
- Parses the Library portion (everything before the hook's first line, or the whole code if no hookCode is passed) to extract top-level `const`/`let` declarations.
- Parses the hook portion to extract top-level `const`/`let` declarations.
- Reports any identifier that appears in both, producing a `LIBRARY_COLLISION` error with:
  - The hook's declaration line and column
  - The Library's declaration line and column
  - A clear message: `"Identifier 'Say' redeclared — Library already declares it at Library.js:2. Rename your variable or remove the const."`

This check must run **before** `new Function(code)` so it wins the "first error" slot.

### 2. Fix Line Mapping for Combined Code Errors

**File:** `src/services/scriptingService.ts`  
**File:** `src/services/offlineSimulationService.ts`

- Pass `libraryLineCount` through to `runOfflineSimulation` as a new parameter.
- In `runOfflineSimulation`, when reporting validation or runtime errors, subtract `libraryLineCount` from the error line to map it back to the hook's own editor line.
- For validation errors that originate in the Library (line <= libraryLineCount), clamp the reported line to `'unknown'` or report it as `'Library'` so the user knows the collision is in their hook, not the Library.

### 3. Add Targeted Unit Tests

**File:** `src/services/scriptingService.test.ts` or `src/services/offlineSimulationService.test.ts`

Add tests that:
- Submit a hook containing `const Say = 'foo'` with the Library active and assert the error type is `LIBRARY_COLLISION` (not generic `SYNTAX_ERROR`).
- Assert the error message names both the Library line and the hook line.
- Assert that a hook with no collisions still passes validation.
- Assert that `var Say` (which is allowed to redeclare) does NOT trigger a collision warning.

### 4. Document Best Practices (Troubleshooting Guide Content)

Once the engine-side fix is in place, document the three requested sections in a new guide file (or update the existing RPG docs):

#### 1. Diagnostic Methods
- Reproduce the error by running `/new player` or triggering the Input Modifier.
- Inspect the `[ERROR]` log: if the message is `Identifier 'X' has already been declared`, the collision is between your hook script and the Library.
- Compare your hook script's `const`/`let` declarations against `RPG ENGINE/Library.js` lines 2–16 to spot the collision without guessing.

#### 2. Isolation Techniques
- **Rename the identifier** in your hook to something unique (e.g. `mySay`, `hookSay`). The Library's constants are shared by design; hooks should reference them, not shadow them.
- **Use block scope**: wrap your hook logic in `{ ... }` to limit the scope of declarations, but note that `const`/`let` inside a block still collides with a same-named `const`/`let` in the outer function scope. Only `var` is function-scoped and redeclarable.
- **Avoid `const`/`let` on Library names**: if you need a local with the same semantic name, use `var` (allowed to redeclare in the same scope) or an object namespace pattern like `const ctx = { say: '...' }`.
- **Library-side fix (engine change)**: consider renaming Library constants to a prefixed namespace (e.g. `Lib_Say`) in a future major version to eliminate the shared surface.

#### 3. Debugging Workflow
- Step 1: Read the error. Note the identifier name (`Say`).
- Step 2: Open your Input Modifier script and search for `const Say` or `let Say`. This is the redeclaring site in your code.
- Step 3: Open `RPG ENGINE/Library.js` and confirm `const Say` exists at line 2.
- Step 4: Rename the variable in your hook, save, and re-run `/new player`.
- If the error persists with a different identifier name, repeat the process for the new name.

## Risks / Caveats

- Changing Library.js constant names is a **breaking change** for every existing custom script that references `Say`, `Response`, `You`, etc. Do not rename Library constants without a migration path or major-version bump.
- The engine fix (task 1–2) is additive: it only improves diagnostics and line mapping. It does not change execution behavior, so it is safe to ship.
- `var` redeclarations are intentionally not flagged as collisions because `var` is legal to redeclare in JS. Users using `var Say` in their hook will continue to work (and silently shadow the Library constant).

## Validation

- Run `npx vitest run src/services/offlineSimulationService.test.ts` (or create the test file if absent).
- Run `npx vitest run src/services/scriptingService.test.ts` to confirm existing tests pass.
- Manually verify: create a hook with `const Say = 'x'` and confirm the new `LIBRARY_COLLISION` error appears with both line numbers.
