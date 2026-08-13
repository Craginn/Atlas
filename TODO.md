# Robust Log Viewer Updates - TODO

## Status: In Progress

### Breakdown of Approved Plan:
1. **[PENDING]** Create/update `src/components/atlas/RobustLogViewer.tsx`:
   - Import Collapsible components from shadcn/ui.
   - Add per-entry scrollable containers (`max-h-32 overflow-auto` or nested ScrollArea).
   - Wrap long entries (`>5 lines`) in Collapsible for nested collapse.
   - Add group-level max-height/overflow-auto for many entries.
   - Add toolbar toggles: Auto-scroll checkbox, Collapse long logs button.
   - Fix overflow-hidden → overflow-auto where needed.
   - Improve styles for horizontal scroll on code/JSON.

2. **[PENDING]** Update `src/components/atlas/HeimdallPanel.tsx`:
   - Pass custom props to RobustLogViewer for tabs (e.g., different initiallyCollapsed).

3. **[PENDING]** Test changes:
   - `npm run dev`
   - Trigger simulation in app to generate code logs.
   - Verify overflow scroll, collapse UX in Logs/Code Logs tabs.

4. **[PENDING]** Lint & validate:
   - `npm run lint`
   - Check no regressions.

5. **[DONE]** attempt_completion once verified.

**Next Step:** Implement #1 (RobustLogViewer edits).

