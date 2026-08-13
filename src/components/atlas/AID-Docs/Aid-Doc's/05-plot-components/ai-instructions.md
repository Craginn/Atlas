# AI Instructions

> AI Instructions provide behavioral directives that tell the AI how to generate responses throughout an adventure.

## Overview

AI Instructions occupy the very beginning of the context and function like system prompts in other AI applications. They tell the AI how to behave, what style to use, and what rules to follow. This component shapes the AI's approach to every response.

## Model Defaults and Custom Instructions

Every AI model in AI Dungeon includes its own default system instructions, tuned specifically for that model's strengths, limitations, and behavior patterns.

**When custom AI Instructions are provided, they replace these defaults rather than layering on top of them.** This has important implications:

- Missing or vague rules can introduce new problems
- Custom instructions persist across model changes, even when different models interpret them differently
- Switching models may require revising instructions for model-specific quirks

Because of this, AI Instructions are optional. For many users and scenarios, leaving them empty and relying on model defaults is not only valid, but often the most stable and effective choice. Custom instructions are best introduced in response to specific, recurring issues.

## Position in Context

AI Instructions appear at the very beginning of context, before all other content. This position establishes foundational rules before the AI sees any story content.

## What to Include

### Writing Perspective

Specify the narrative voice:
- "Write in second person present tense"
- "Use third person limited perspective"
- "Maintain first person narrative throughout"

### Tone and Style

Guide the writing quality:
- "Write in a literary style with rich descriptions"
- "Keep responses concise and action-focused"
- "Use dark, atmospheric prose"

### Content Boundaries

Indicate what to avoid or include:
- "Avoid modern references in this medieval setting"
- "Focus on character dialogue and interactions"
- "Include sensory details in scene descriptions"

### Behavioral Rules

Define how the AI should act:
- "Never control the player character's dialogue"
- "Allow player actions to fail when appropriate"
- "Maintain consequences from earlier events"

### Genre-Specific Guidelines

Establish genre conventions:
- "Follow mystery genre conventions—provide clues, not solutions"
- "Respect fantasy tropes but subvert when interesting"

## Best Practices

### Be Direct

Use clear, imperative statements:
- GOOD: "Write in second person"
- LESS GOOD: "You should try to write in second person if possible"

### Keep Focused

Include only actual behavioral directives:
- Don't put story content here (use Plot Essentials)
- Don't put current scene info (use Author's Note)
- Only include rules that apply to the entire adventure

### Prioritize

The AI may not follow all instructions perfectly. Put the most important directives first and last (strongest attention positions).

### Avoid Contradiction

Ensure instructions don't conflict:
- Don't say both "be concise" and "write rich descriptions"
- Choose a consistent approach

### Test and Iterate

Try your instructions:
- Play test the scenario
- See if the AI follows directives
- Adjust wording if needed

## Examples

### Fantasy Adventure

```
Write as a masterful fantasy storyteller in second person present tense. 
Create vivid descriptions of locations and characters. Allow player 
actions to have real consequences, including failure. Never speak for 
the player character. Maintain consistency with established world lore.
```

### Mystery Scenario

```
Write as a noir mystery narrator. Use atmospheric descriptions and 
tense pacing. Provide clues naturally through the narrative but never 
reveal solutions. Allow the player to draw conclusions. Maintain 
internal story logic regarding evidence and alibis.
```

### Casual Play

```
Write engaging, entertaining adventure content. Balance action, 
dialogue, and description. Keep responses focused and avoid 
excessive tangents. Be responsive to player creativity.
```

## AI Instructions vs. Author's Note

| AI Instructions | Author's Note |
|-----------------|---------------|
| Beginning of context | Near end of context |
| Permanent rules | Scene-specific guidance |
| Behavioral directives | Tone/style for current scene |
| Rarely changed | Updated as story progresses |

Use both: AI Instructions for overall rules, Author's Note for current scene.

## AI Instructions vs. Banned Words

Banned Words has been deprecated. AI Instructions replaces this functionality:

- Instead of banning words, instruct the AI to avoid them
- "Never use the word 'suddenly'" is more effective than keyword blocking
- Works better across different AI models

## Script Access

Scripts can influence AI Instructions indirectly through the context modifier hook (`onModelContext`). There's no direct state property for AI Instructions like there is for Plot Essentials.

## Related Documentation

- [Plot Components Overview](plot-components-overview.md)
- [Author's Note](authors-note.md)
- [Context Assembly Order](../02-context/context-assembly-order.md)

## Source References

- https://help.aidungeon.com/faq/ai-instructions
- https://help.aidungeon.com/faq/plot-components
- https://www.reddit.com/r/AIDungeon/comments/1q9hot4/ai_instructions_guide_function_design_and_examples/ (u/ppp47634)
