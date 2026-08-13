# Latitude Philosophy

> Latitude designs AI Dungeon with a model-agnostic, vendor-diverse approach that prioritizes player freedom, creative expression, and platform resilience.

## Overview

Latitude is the company behind AI Dungeon. Their technical and design philosophy shapes how the platform evolves, what features are prioritized, and how the system architecture is structured. Understanding this philosophy provides insight into why AI Dungeon works the way it does.

## Model-Agnostic Design

Latitude maintains a model-agnostic approach, meaning AI Dungeon is not dependent on any single AI model or provider. This philosophy manifests in several ways:

### Multiple Model Options
Players can choose from numerous AI models, including:
- In-house fine-tuned models (Wayfarer, Muse, Nova, Hearthfire, Harbinger, Madness, Atlas, Raven)
- Third-party models (Hermes, DeepSeek)
- Dynamic routing options that select models automatically

### Vendor Diversity
AI Dungeon infrastructure spans multiple cloud providers and AI vendors. This:
- Reduces dependency on any single provider
- Provides resilience against outages
- Allows cost optimization across providers
- Enables rapid adoption of new models

### Platform-Level Features
Features like Plot Components, Story Cards, and the Memory System are implemented at the platform level, not dependent on specific model capabilities. This ensures consistent functionality across all model options.

## Custom Model Development

Latitude develops and open-sources custom models specifically tuned for interactive storytelling:

### Wayfarer Series
The Wayfarer models (Wayfarer-12B, Wayfarer-2-12B, Wayfarer-70B) were developed to address player feedback that modern AI models are "too nice." Key characteristics:
- Trained to allow failure, death, and real consequences
- Creates challenging, dangerous experiences with genuine stakes
- Counters the positivity bias common in aligned models
- Open-sourced on Hugging Face for community use

### Pegasus Series
Earlier fine-tuned models (Pegasus-8B, Pegasus-8x7B, Pegasus-70B) optimized for storytelling, released as part of the Pathfinder update.

## Player Freedom

AI Dungeon's core promise centers on player agency:

### Ultimate Freedom
Players can be who they want to be, go where they want to go, and do what they want to do. The AI responds to player choices rather than forcing predetermined paths.

### Meaningful Choices
The Memory System exists specifically to ensure that player choices matter beyond the immediate context window. Actions taken early in an adventure can influence events much later.

### Creator Tools
The platform provides extensive tools for creators:
- Scenario system for custom starting points
- Story Cards for world-building
- Plot Components for behavioral guidance
- Scripting for advanced functionality

## Open Development

Latitude practices elements of open development:

### Open-Source Models
Custom models like Wayfarer are released publicly on Hugging Face, allowing:
- Local deployment by enthusiasts
- Community research and improvement
- Transparency about model behavior

### Community Engagement
Active Discord community with direct developer interaction for feedback, bug reports, and feature requests.

### Public Documentation
Comprehensive documentation at help.aidungeon.com covering all platform features.

## Safety and Moderation

Latitude balances creative freedom with responsible AI use:

### Content Filters
Configurable safety settings (Safe, Moderate, Mature) using AI-based content classification.

### HiveAI Integration
External content moderation system that scores content for potential policy violations.

### User Controls
Players can configure their preferred content level, and hosts control settings for multiplayer games.

## Continuous Evolution

The platform evolves through named releases, each bringing significant new features:
- Phoenix, Renaissance, Pathfinder, Ember, Forge, Gauntlet, Saga, Rise, Aura

This release cadence allows for substantial feature additions while maintaining stability.

## Related Documentation

- [Platform Overview](platform-overview.md)
- [Release History](../11-release-history/release-notes.md)

## Source References

- https://latitude.io/news
- https://huggingface.co/LatitudeGames/Wayfarer-12B
- https://huggingface.co/LatitudeGames/Wayfarer-2-12B
- https://help.aidungeon.com/ai-model-differences
