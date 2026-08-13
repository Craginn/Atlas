# Platform Overview

> AI Dungeon is an AI-powered interactive storytelling platform where players collaborate with large language models to create open-ended text adventures.

## Overview

AI Dungeon is developed by Latitude and represents one of the pioneering applications of large language models (LLMs) for interactive entertainment. Unlike traditional text adventure games with pre-scripted responses, AI Dungeon uses generative AI to produce dynamic, contextually-aware narrative content in real-time based on player input.

The platform operates on a fundamental principle: players provide actions or dialogue, and the AI generates story continuations that respond to those inputs. This creates an effectively infinite possibility space for storytelling, limited only by the player's imagination and the AI's capabilities.

AI Dungeon supports both single-player and multiplayer experiences, with players able to create and share custom scenarios that serve as starting points for adventures.

## Core Gameplay Loop

The basic interaction cycle in AI Dungeon follows this pattern:

1. **Player Input**: The player submits an action using one of four input modes
2. **Context Assembly**: The system compiles relevant information (history, Story Cards, Plot Components, memories) into a context window
3. **AI Generation**: The context is sent to a language model which generates the next story segment
4. **Output Display**: The AI's response is shown to the player
5. **Repeat**: The player responds, continuing the cycle

## Input Modes

AI Dungeon provides four primary input modes for players:

### Do Mode
Actions performed by the player's character. The system automatically prepends "You" and converts first-person pronouns to second-person. Example: typing "open the door" becomes "You open the door."

### Say Mode
Dialogue spoken by the player's character. The input is formatted as quoted speech. Example: typing "Hello there" becomes 'You say "Hello there."'

### Story Mode
Direct narrative input where the player writes story text exactly as they want it to appear. No automatic formatting is applied. This mode allows players to describe events, settings, or other characters' actions.

### See Mode
Image generation mode. Players describe a scene or subject, and the AI generates an image. This mode consumes credits and supports multiple image generation models.

## Platform Components

### Adventures
An Adventure is an individual playthrough or story session. Adventures contain the full history of actions and AI responses, along with any Story Cards, Plot Components, and settings configured for that session. Adventures can be saved, continued, and shared.

### Scenarios
A Scenario is a template for starting new Adventures. Scenarios define the initial prompt, pre-configured Story Cards, Plot Components, and optionally scripts. When a player "plays" a Scenario, a new Adventure is created based on that template.

### Story Cards
Story Cards are triggered information packets that provide context to the AI when specific keywords appear in the narrative. They allow creators to define characters, locations, items, and lore that the AI can reference dynamically.

### Plot Components
Plot Components are persistent text elements that shape AI behavior throughout an Adventure. They include AI Instructions, Plot Essentials, Story Summary, Author's Note, and Third Person mode settings.

### Scripts
JavaScript code that can modify player input, AI context, or AI output. Scripts enable advanced functionality like stat tracking, command parsing, and automated Story Card management.

## Model-Agnostic Design

AI Dungeon follows a model-agnostic philosophy, supporting multiple language models from various providers. This includes:

- In-house fine-tuned models (Wayfarer, Muse, Nova, etc.)
- Third-party models (Hermes, DeepSeek, etc.)
- Dynamic model selection based on context needs

This approach ensures platform resilience and allows players to choose models that best suit their storytelling preferences.

## Related Documentation

- [How AI Dungeon Works](how-ai-dungeon-works.md)
- [Context Window Explained](context-window-explained.md)
- [Glossary](glossary.md)

## Source References

- https://help.aidungeon.com/faq/the-basics
- https://help.aidungeon.com/faq/how-does-ai-dungeon-even-work
- https://help.aidungeon.com/faq/do-mode
- https://help.aidungeon.com/faq/say-mode
- https://help.aidungeon.com/faq/story-mode
- https://help.aidungeon.com/faq/see-mode
