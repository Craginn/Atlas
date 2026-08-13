# Author's Note

> Author's Note provides short-term narrative guidance positioned near the end of context for maximum influence on the next AI response.

## Overview

Author's Note is placed near the end of context, just before the most recent action. This position gives it strong influence on the immediate next generation. Use Author's Note for current scene guidance, tone, and style—information that changes as the story progresses.

## Position in Context

Author's Note appears directly before the latest player input:
- After older actions in history
- Immediately before the previous action
- Near the end = high influence

The system automatically wraps Author's Note content in square brackets: `[Author's Note: +content+]`

This "recency effect" means Author's Note strongly shapes the next response.

## How Brackets Work

The square brackets around Author's Notes are not hard-coded control tokens—their effect is emergent and depends on learned patterns. The model has learned to treat short, bracketed "author-like" notes as meta guidance rather than story text.

**Important considerations**:
- If an Author's Note becomes too long, the "outside the story" signal weakens
- The AI may treat very long notes as narrative rather than guidance
- Using square brackets heavily elsewhere (Plot Essentials, Story Cards) can weaken their effectiveness as meta-text signals by reducing contrast

## Recommended Length

Keep Author's Note short: ideally keywords or 1-4 brief sentences.

**Why Short**:
- Longer notes may be trimmed
- Brevity preserves the "meta guidance" signal
- Concise guidance is more effective
- Leaves space for other content
- Very long notes risk being treated as narrative text

## What to Include

### Current Scene Tone

```
Tense confrontation. The villain has the upper hand. Build suspense.
```

### Genre Cues

```
Dark fantasy. Gothic horror elements. Creeping dread.
```

### Pacing Guidance

```
Action scene. Fast-paced, short sentences. Physical conflict.
```

### Style Notes

```
Descriptive prose. Sensory details. Atmospheric writing.
```

### Temporary Focus

```
Focus on the dialogue between Marcus and Elena. Their tension is key.
```

## Format Conventions

Author's Note often uses abbreviated, tag-like formatting:

```
[Genre: dark fantasy; Tone: ominous; Focus: the approaching storm]
```

Or natural sentences:

```
This scene is a quiet moment of reflection. Emphasize the character's internal conflict and uncertainty about the path ahead.
```

Both work. Use what feels natural for your scenario.

## When to Update

Update Author's Note as the story changes:
- Scene transitions
- Tone shifts
- Pacing changes
- New focus elements

Unlike AI Instructions (which stay constant), Author's Note should evolve with the narrative.

## Author's Note vs. AI Instructions

| Author's Note | AI Instructions |
|---------------|-----------------|
| Near end of context | Beginning of context |
| Current scene | Entire adventure |
| Frequently updated | Rarely changed |
| Tone/style focus | Behavioral rules |

**Use Together**: AI Instructions for overall rules, Author's Note for current scene.

## Script Access

Scripts can set Author's Note via:
```
state.memory.authorsNote = "Tense standoff. Dialogue-focused.";
```

Changes take effect on the next generation (not the current turn if set in onOutput).

## Common Patterns

### Scene-Based Updates

Change Author's Note at each scene:
- Entering a dungeon → "Dark, dangerous. Tension. Unknown threats."
- Tavern scene → "Relaxed atmosphere. Character interactions. Humor."
- Battle → "Action. Fast pace. Consequences."

### Mood Guidance

Use emotional keywords:
- "Melancholy", "Hopeful", "Desperate", "Triumphant"
- The AI interprets these to shape prose

### Avoid Overloading

Don't try to control everything:
- Pick 2-3 key elements to emphasize
- Trust the AI to fill in details
- Less is often more

## Troubleshooting

### AI Ignores Author's Note

- Is it too long? (Try shorter)
- Is it conflicting with AI Instructions?
- Is the guidance too vague?

### Tone Doesn't Match

- Be more specific about what you want
- Use genre terms the AI recognizes
- Include example adjectives

### Note Keeps Getting Overridden

- Check if scripts are modifying it
- Ensure you're editing the right Adventure
- Verify changes are saved

## Related Documentation

- [Plot Components Overview](plot-components-overview.md)
- [AI Instructions](ai-instructions.md)
- [Context Assembly Order](../02-context/context-assembly-order.md)

## Source References

- https://help.aidungeon.com/faq/what-is-the-authors-note
- https://help.aidungeon.com/faq/plot-components
- https://www.reddit.com/r/AIDungeon/comments/1q9c197/authors_note_guide_reinforcing_key_elements_and/ (u/ppp47634)
