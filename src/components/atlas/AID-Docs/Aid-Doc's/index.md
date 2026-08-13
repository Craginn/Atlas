# AI Dungeon Documentation

> Comprehensive RAG-optimized documentation for AI Dungeon platform features, scripting, and advanced usage.

## About This Documentation

This documentation is designed to serve as context for AI-assisted development, scenario creation, and advanced scripting on the AI Dungeon platform. Each document is self-contained with cross-references to related topics.

## Quick Access

- [Quick Reference](reference/quick-reference.md) - One-page overview
- [Context Assembly Cheatsheet](reference/context-assembly-cheatsheet.md) - Visual context guide
- [Scripting API Reference](reference/scripting-api-reference.md) - Complete API reference
- [Glossary](00-foundation/glossary.md) - Term definitions

## Documentation Structure

### 00-foundation/
Core concepts and platform overview.

- [Platform Overview](00-foundation/platform-overview.md)
- [How AI Dungeon Works](00-foundation/how-ai-dungeon-works.md)
- [Context Window Explained](00-foundation/context-window-explained.md)
- [Latitude Philosophy](00-foundation/latitude-philosophy.md)
- [Glossary](00-foundation/glossary.md)

### 01-scripting/
JavaScript scripting API and reference.

**API:**
- [Hooks Overview](01-scripting/api/hooks-overview.md)
- [Input Modifier](01-scripting/api/input-modifier.md)
- [Context Modifier](01-scripting/api/context-modifier.md)
- [Output Modifier](01-scripting/api/output-modifier.md)
- [State Object](01-scripting/api/state-object.md)
- [Info Object](01-scripting/api/info-object.md)
- [History Array](01-scripting/api/history-array.md)
- [Story Cards API](01-scripting/api/story-cards-api.md)

**Reference:**
- [Global Objects](01-scripting/reference/global-objects.md)
- [Legacy Compatibility](01-scripting/reference/legacy-compatibility.md)

### 02-context/
Context assembly, allocation, and optimization.

- [Context Assembly Order](02-context/context-assembly-order.md)
- [Required Elements](02-context/required-elements.md)
- [Dynamic Elements](02-context/dynamic-elements.md)
- [Allocation Rules](02-context/allocation-rules.md)
- [Context Viewer](02-context/context-viewer.md)
- [Context Optimization](02-context/context-optimization.md)

### 03-memory-system/
Automatic memory and summarization features.

- [Memory System Overview](03-memory-system/memory-system-overview.md)
- [Auto Summarization](03-memory-system/auto-summarization.md)
- [Memory Bank](03-memory-system/memory-bank.md)
- [Embeddings and Vectors](03-memory-system/embeddings-and-vectors.md)
- [Story Summary Component](03-memory-system/story-summary-component.md)

### 04-story-cards/
Triggered world-building information.

- [Story Cards Overview](04-story-cards/story-cards-overview.md)
- [Card Anatomy](04-story-cards/card-anatomy.md)
- [Trigger System](04-story-cards/trigger-system.md)
- [Card Generation](04-story-cards/card-generation.md)
- [Card Import/Export](04-story-cards/card-import-export.md)
- [Card Best Practices](04-story-cards/card-best-practices.md)

### 05-plot-components/
Persistent narrative guidance elements.

- [Plot Components Overview](05-plot-components/plot-components-overview.md)
- [AI Instructions](05-plot-components/ai-instructions.md)
- [Author's Note](05-plot-components/authors-note.md)
- [Plot Essentials](05-plot-components/plot-essentials.md)
- [Third Person Mode](05-plot-components/third-person-mode.md)

### 06-ai-behavior/
Generation parameters and AI control.

- [Generation Parameters](06-ai-behavior/generation-parameters.md)
- [Sampling Parameters](06-ai-behavior/sampling-parameters.md)
- [Repetition Control](06-ai-behavior/repetition-control.md)
- [Response Shaping](06-ai-behavior/response-shaping.md)
- [Safety Filters](06-ai-behavior/safety-filters.md)

### 07-scenarios/
Scenario creation and structure.

- [Scenario Structure](07-scenarios/scenario-structure.md)
- [Opening and Setup](07-scenarios/opening-and-setup.md)
- [Placeholders](07-scenarios/placeholders.md)
- [Character Creator](07-scenarios/character-creator.md)
- [Scenario Options](07-scenarios/scenario-options.md)
- [Publishing and Visibility](07-scenarios/publishing-visibility.md)
- [Scenario Best Practices](07-scenarios/scenario-best-practices.md)

### 08-image-generation/
See mode and image creation.

- [See Mode Overview](08-image-generation/see-mode-overview.md)
- [Image Settings](08-image-generation/image-settings.md)
- [Prompt Techniques](08-image-generation/prompt-techniques.md)

### 09-multiplayer/
Multiplayer features and host settings.

- [Multiplayer Overview](09-multiplayer/multiplayer-overview.md)
- [Host Settings](09-multiplayer/host-settings.md)

### 10-api/
GraphQL API overview.

- [GraphQL Overview](10-api/graphql-overview.md)
- [API Entities](10-api/api-entities.md)

### 11-release-history/
Platform release timeline.

- [Release Notes](11-release-history/release-notes.md)

### 12-graphql-schema/
Complete GraphQL schema from introspection, split by type category.

- `_index.json` - Schema metadata and type listings
- `scalars/` - 7 scalar types (Boolean, DateTime, Float, ID, Int, JSONObject, String)
- `enums/` - 6 enum types
- `objects/` - 221 object types (Action, Adventure, Scenario, WorldInfo, Query, Mutation, etc.)
- `input-objects/` - 59 input object types
- `interfaces/` - 7 interface types (Commentable, ContentDocument, MutationResponse, etc.)
- `unions/` - 1 union type (NarrationEvent)

### reference/
Quick lookup and cheatsheets.

- [Quick Reference](reference/quick-reference.md)
- [Context Assembly Cheatsheet](reference/context-assembly-cheatsheet.md)
- [Scripting API Reference](reference/scripting-api-reference.md)

### conjecture/
Speculative documentation derived from minified frontend source analysis. **Not authoritative.**

- [README](conjecture/README.md) - Methodology and confidence levels
- [Route Structure](conjecture/route-structure.md) - Application routes (high confidence)
- [Content Types](conjecture/content-types.md) - Content type enumerations
- [Voyage Platform](conjecture/voyage-platform.md) - Voyage as separate product
- [Technology Stack](conjecture/technology-stack.md) - Observable frameworks
- [Analytics Events](conjecture/analytics-events.md) - Tracked user events

## Source References

### Official Sources
- https://help.aidungeon.com - Official documentation
- https://aidungeon.com - Platform
- https://latitude.io - Developer blog

### Community Sources
- https://github.com/LewdLeah - Advanced modding
- https://huggingface.co/LatitudeGames - Model cards

## Document Statistics

- Total documents: 61 markdown + 302 schema JSON files
- Categories: 14
- Created for RAG context retrieval

## Usage Notes

This documentation is optimized for:
1. RAG (Retrieval-Augmented Generation) contexts
2. AI-assisted scenario development
3. Scripting reference
4. Advanced platform understanding

Each document is self-contained with cross-references and source citations.
