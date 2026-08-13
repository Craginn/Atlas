# Context Assembly Cheatsheet

> Visual reference for how AI Dungeon assembles context.

## Assembly Order

```
┌─────────────────────────────────────┐
│     1. AI INSTRUCTIONS              │  ← Behavioral rules
├─────────────────────────────────────┤
│     2. PLOT ESSENTIALS              │  ← Key story facts
├─────────────────────────────────────┤
│     3. STORY CARDS (triggered)      │  ← "World Lore:" prefixed
├─────────────────────────────────────┤
│     4. STORY SUMMARY                │  ← Plot overview
├─────────────────────────────────────┤
│     5. MEMORY BANK                  │  ← Retrieved memories
├─────────────────────────────────────┤
│     6. HISTORY                      │  ← Recent actions
├─────────────────────────────────────┤
│     7. AUTHOR'S NOTE                │  ← Tone/style
├─────────────────────────────────────┤
│     8. LAST ACTION                  │  ← Most recent input
├─────────────────────────────────────┤
│     9. FRONT MEMORY                 │  ← Script-injected
├─────────────────────────────────────┤
│    10. BUFFER TOKENS                │  ← Response space
└─────────────────────────────────────┘
        ↓
    [AI GENERATES RESPONSE]
```

## Allocation Split

```
Total Context
├── Required Elements (up to 70%)
│   ├── Front Memory (always full)
│   ├── Last Action (always full)
│   ├── Author's Note (high priority)
│   ├── Plot Essentials (high priority)
│   ├── AI Instructions (medium priority)
│   └── Story Summary (lower priority)
│
└── Dynamic Elements (~30%)
    ├── Story Cards (~25% of dynamic)
    ├── History (~50% of dynamic)
    └── Memory Bank (~25% of dynamic)
```

## Priority When Trimming

**Never Trimmed**:
1. Front Memory
2. Last Action

**Trimmed If Needed** (in order):
3. Author's Note
4. Plot Essentials
5. AI Instructions
6. Story Summary

**Flexible Allocation**:
- Story Cards
- History
- Memory Bank

## Story Card Trigger Evaluation

```
Available Tokens for Cards    Actions Checked
─────────────────────────────────────────────
< 500 tokens                  4 actions
500 tokens                    5 actions
600 tokens                    6 actions
...                           ...
900 tokens                    9 actions

Formula: max(4, tokens ÷ 100)
```

## Memory Creation Timeline

```
Action 1-4  │ Adventure starts
Action 5-7  │ Building history
Action 8    │ Memory 1 created (actions 1-4)
Action 9-11 │ More actions
Action 12   │ Memory 2 created (actions 5-8)
...         │ New memory every 4 actions
```

## Context Influence by Position

```
BEGINNING ──────────────────────────── END

[AI Instructions]  [History...]  [Author's Note] [Last] [Front]
      │                              │             │      │
      │                              │             │      └─ STRONGEST
      │                              │             └─ Very Strong
      │                              └─ Strong (for tone)
      └─ Sets foundation
```

## Script Hook Timing

```
Player Input
    │
    ▼
┌─────────────┐
│  onInput    │ ← Modify input, stop generation
└─────────────┘
    │
    ▼
Context Assembly
    │
    ▼
┌───────────────────┐
│  onModelContext   │ ← Modify full context
└───────────────────┘
    │
    ▼
AI Generation
    │
    ▼
┌─────────────┐
│  onOutput   │ ← Modify AI response
└─────────────┘
    │
    ▼
Display to Player
```

## Related Documentation

- [Quick Reference](quick-reference.md)
- [Context Assembly Order](../02-context/context-assembly-order.md)
- [Allocation Rules](../02-context/allocation-rules.md)
