# Response Shaping

> Techniques for influencing AI response characteristics beyond sampling parameters, including context strategies and prompt design.

## Overview

While sampling parameters (temperature, Top-P, etc.) affect token selection mechanics, response shaping encompasses broader strategies for guiding AI output. This includes context design, prompt engineering, and effective use of Plot Components.

## Response Length Control

### Via Settings

Set Response Length in Advanced Settings:
- Higher values: Longer, more detailed responses
- Lower values: Shorter, punchier responses

### Via Context

Guide response length through Author's Note:
- "Detailed descriptions, longer paragraphs"
- "Concise responses, focus on action"
- "Brief dialogue exchanges"

### Via AI Instructions

Set expectations in AI Instructions:
- "Write medium-length paragraphs with descriptive detail"
- "Keep responses focused and avoid tangents"

## Style and Tone

### Author's Note for Current Tone

Update Author's Note to match the current scene:
- "Tense. Short sentences. Danger imminent."
- "Relaxed pace. Character interactions. Humor."
- "Gothic atmosphere. Oppressive. Creeping dread."

### AI Instructions for Overall Style

Set baseline style in AI Instructions:
- "Write in a literary style with rich prose"
- "Use a casual, conversational tone"
- "Maintain a formal, historical voice"

### Genre Tags

Use genre terminology the AI recognizes:
- "Dark fantasy", "Space opera", "Noir mystery"
- "Romantic comedy", "Cosmic horror", "Cyberpunk"

## Content Focus

### Guiding What to Include

In Author's Note:
- "Focus on dialogue between Marcus and Elena"
- "Describe the environment in detail"
- "Emphasize the character's internal thoughts"

### Guiding What to Avoid

In AI Instructions:
- "Never control the player character's dialogue"
- "Avoid breaking the fourth wall"
- "Don't introduce new major characters without player prompting"

## Pacing Control

### Fast Pacing

```
Author's Note: Action scene. Quick cuts. Short sentences. 
Physical conflict. Tension.
```

### Slow Pacing

```
Author's Note: Quiet moment. Introspection. Sensory details. 
Let the scene breathe. Character development.
```

### Transitions

Update Author's Note when pace should change. The AI follows the current guidance.

## Perspective Management

### Second Person (Default)

Standard AI Dungeon: "You walk into the tavern."

### Third Person

Enable Third Person mode for "Marcus walks into the tavern."

### First Person

Use Story Mode and AI Instructions: "Write in first person perspective."

## Dialog vs. Description Balance

Guide emphasis:
- "Dialogue-heavy scene, let characters talk"
- "Action and description, minimal dialogue"
- "Balance dialogue with narrative prose"

## Consistency Techniques

### Reinforce in Context

Put important style notes in multiple places:
- AI Instructions for permanence
- Author's Note for current emphasis
- Plot Essentials for story-relevant details

### Story Cards for Characters

Character-specific style notes:
- "Lord Varen speaks in formal, archaic English"
- "Marcus uses humor to deflect tension"

### Trust the Context

The AI learns from your story's existing tone. Established patterns tend to continue.

## Troubleshooting

### Responses Too Generic

- Add more specific guidance in Author's Note
- Use genre tags
- Include style examples in AI Instructions

### Tone Keeps Shifting

- Make Author's Note more explicit
- Check for conflicting guidance
- Establish clearer AI Instructions

### AI Ignores Style Guidance

- Move guidance to Author's Note (stronger position)
- Use more direct language
- Ensure guidance isn't buried in long text

## Related Documentation

- [Generation Parameters](generation-parameters.md)
- [Author's Note](../05-plot-components/authors-note.md)
- [AI Instructions](../05-plot-components/ai-instructions.md)

## Source References

- https://help.aidungeon.com/faq/what-are-advanced-settings
- https://help.aidungeon.com/faq/plot-components
