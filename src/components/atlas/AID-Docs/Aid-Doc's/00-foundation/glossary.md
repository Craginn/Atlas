# Glossary

> Official terminology reference for AI Dungeon platform concepts, features, and technical terms.

## A

### Action
A single turn in an adventure, consisting of either player input or AI output. Actions have a type (do, say, story, see, continue, start) and text content. See [How AI Dungeon Works](how-ai-dungeon-works.md).

### Adventure
An individual playthrough or story session in AI Dungeon. Contains the complete history of actions, configured Story Cards, Plot Components, and settings. Adventures are created from Scenarios or from scratch.

### AI Instructions
A Plot Component that provides behavioral directives to the AI. Positioned at the beginning of context. Used to control writing style, content restrictions, and AI behavior patterns. See [AI Instructions](../05-plot-components/ai-instructions.md).

### Author's Note
A Plot Component positioned near the end of context, just before the most recent AI response. Provides short-term guidance about tone, style, genre, or immediate narrative direction. See [Author's Note](../05-plot-components/authors-note.md).

### Auto Summarization
A Memory System feature that automatically creates and updates the Story Summary by summarizing adventure actions. Creates a new memory every 4 actions, starting at action 8. See [Auto Summarization](../03-memory-system/auto-summarization.md).

## B

### Buffer Tokens
Reserved space at the absolute end of context for the AI's response generation. Ensures the model has room to generate output tokens without exceeding context limits. The buffer size is calculated based on the Response Length setting. See [Context Assembly Order](../02-context/context-assembly-order.md).

## C

### Context
The assembled text sent to the AI model for each generation. Includes Required Elements, Dynamic Elements, and adventure history. Limited by the context window size. See [Context Assembly Order](../02-context/context-assembly-order.md).

### Context Length
The maximum number of tokens that can be included in context. Determined by subscription tier and model capabilities. See [Context Window Explained](context-window-explained.md).

### Context Viewer
A debugging tool showing what elements are currently in context, their token counts, and which Story Cards and memories are active. See [Context Viewer](../02-context/context-viewer.md).

### Context Window
The maximum amount of text an AI model can process at once, measured in tokens. Information outside the context window is not available to the AI for that generation. See [Context Window Explained](context-window-explained.md).

### Credits
Currency used for premium features like image generation and extended context on certain models.

## D

### Do Mode
An input mode where player text is treated as character actions. Automatically prepends "You" and converts first-person pronouns to second-person.

### Dynamic Elements
Context components with flexible allocation: Story Cards, History, and Memory Bank. Fill the space remaining after Required Elements. See [Dynamic Elements](../02-context/dynamic-elements.md).

## E

### Entry
The main content field of a Story Card. Contains the information sent to the AI when the card is triggered. Prefaced with "World Lore:" in context. See [Card Anatomy](../04-story-cards/card-anatomy.md).

## F

### Front Memory
A scripting feature that adds text to the very end of context, after the most recent player input. Only accessible via scripts (state.memory.frontMemory).

## H

### History
The sequence of past actions in an adventure. Included in context from most recent backward until space is exhausted.

### Hook
A script execution point in the generation pipeline. Three hooks exist: onInput, onModelContext, and onOutput. See [Hooks Overview](../01-scripting/api/hooks-overview.md).

## I

### info Object
A read-only scripting object containing adventure metadata: actionCount, characters, maxChars, memoryLength, contextTokens.

## M

### Memory Bank
A Memory System component that stores and retrieves memories using semantic similarity. Memories are ranked by relevance to the current action. See [Memory Bank](../03-memory-system/memory-bank.md).

### Memory System
The combination of Auto Summarization and Memory Bank features that help the AI remember important details across long adventures. See [Memory System Overview](../03-memory-system/memory-system-overview.md).

### Multiplayer
A game mode where multiple players participate in the same adventure simultaneously. Players use join codes to connect, and the host controls AI settings. See [Multiplayer Overview](../09-multiplayer/multiplayer-overview.md).

## N

### Notes
A Story Card field visible in the UI but not sent to the AI. Used for creator notes or, in Character Creator scenarios, as the description shown to players.

## O

### onInput Hook
Script execution point that processes player input before AI generation. Can modify input or stop the generation cycle.

### onModelContext Hook
Script execution point that can modify the assembled context before it's sent to the AI.

### onOutput Hook
Script execution point that processes AI output before it's displayed to players.

## P

### Placeholder
A dynamic content marker in scenarios using ${syntax}. Prompts players for input during adventure setup. Supports default values and multiple-choice options.

### Plot Components
Persistent text elements that shape AI behavior: AI Instructions, Story Summary, Plot Essentials, Author's Note, and Third Person mode. See [Plot Components Overview](../05-plot-components/plot-components-overview.md).

### Plot Essentials
A Plot Component (formerly "Memory") containing key story details that should always be in context. Positioned at the beginning of context. See [Plot Essentials](../05-plot-components/plot-essentials.md).

### Prompt
The initial text of a Scenario that becomes the first action of an Adventure. Sets up the starting situation.

## R

### Required Elements
Context components with priority inclusion: AI Instructions, Plot Essentials, Story Summary, Author's Note, Front Memory, Last Action. Capped at 70% of context. See [Required Elements](../02-context/required-elements.md).

### Response Length
The maximum number of tokens the AI will generate for a single response.

## S

### Say Mode
An input mode for character dialogue. Text is formatted as quoted speech.

### Scenario
A template for starting new Adventures. Contains initial prompt, Story Cards, Plot Components, optional scripts, and configuration settings. See [Scenario Structure](../07-scenarios/scenario-structure.md).

### Scenario Options
Nested sub-scenarios that create branching setup flows. Players select from options to determine their adventure's starting configuration. See [Scenario Options](../07-scenarios/scenario-options.md).

### See Mode
An input mode for image generation. Players describe a scene, and the AI generates an image. See [See Mode Overview](../08-image-generation/see-mode-overview.md).

### state Object
A persistent scripting object for storing custom data across turns. Contains state.memory (context, authorsNote, frontMemory) and state.message. See [State Object](../01-scripting/api/state-object.md).

### stop Flag
A boolean in scripts that, when true, halts the generation cycle. Useful for command processing without AI generation.

### Story Cards
Triggered information packets that provide context when specific keywords appear. Contain Type, Name, Entry, Triggers, and Notes fields. See [Story Cards Overview](../04-story-cards/story-cards-overview.md).

### Story Mode
An input mode for direct narrative writing. Text appears exactly as typed without automatic formatting.

### Story Summary
A Plot Component containing a running summary of the adventure's plot. Can be manually written or automatically updated by Auto Summarization. See [Story Summary Component](../03-memory-system/story-summary-component.md).

## T

### Temperature
A generation parameter controlling randomness. Higher values produce more varied/creative output; lower values produce more consistent/predictable output. See [Generation Parameters](../06-ai-behavior/generation-parameters.md).

### Third Person Mode
A Plot Component that replaces "You" with character names in Do and Say actions. Converts second-person pronouns (you/your/yours) to third-person (he/she/they and corresponding possessives) based on the character. Primarily used for multiplayer. See [Third Person Mode](../05-plot-components/third-person-mode.md).

### Top-K
A generation parameter limiting the AI's choices to the K most likely tokens. See [Sampling Parameters](../06-ai-behavior/sampling-parameters.md).

### Top-P
A generation parameter filtering tokens based on cumulative probability threshold. Also called nucleus sampling. See [Sampling Parameters](../06-ai-behavior/sampling-parameters.md).

### Triggers
Keywords in a Story Card that cause its Entry to be added to context when they appear in recent actions. See [Trigger System](../04-story-cards/trigger-system.md).

### Type
A Story Card field categorizing the card: Character, Class, Race, Location, Faction, or Custom. Used for Character Creator scenarios and AI-assisted generation.

## U

### Unlisted
A visibility setting where content is published but not searchable. Only accessible via direct link.

## V

### Visibility
Publication status of Adventures and Scenarios: Private, Unlisted, or Published (public).

## W

### Wayfarer
Latitude's open-source adventure roleplay models, fine-tuned for challenging narratives with genuine stakes and consequences.

### worldEntries
Legacy API name for Story Cards. The scripting functions addWorldEntry, updateWorldEntry, and removeWorldEntry still work for backward compatibility but are deprecated in favor of addStoryCard, updateStoryCard, and removeStoryCard. See [Legacy Compatibility](../01-scripting/reference/legacy-compatibility.md).

## Related Documentation

- [Platform Overview](platform-overview.md)
- [Scripting API Reference](../reference/scripting-api-reference.md)
- [Context Assembly Order](../02-context/context-assembly-order.md)

## Source References

- https://help.aidungeon.com/faq/how-do-i-know-what-everything-means-in-ai-dungeon
- https://help.aidungeon.com/table-of-contents
