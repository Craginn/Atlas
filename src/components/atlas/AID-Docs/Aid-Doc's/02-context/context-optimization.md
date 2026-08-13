# Context Optimization

> Strategies and techniques for maximizing the effectiveness of your available context space.

## Overview

Effective context optimization ensures the AI has access to the right information at the right time. With limited context space, every token matters. This guide provides strategies for making the most of your context allocation.

## Core Principles

### 1. Information Density

Pack more meaning into fewer tokens:
- Use concise, direct language
- Avoid redundant phrasing
- Focus on facts over prose
- Eliminate filler words

**Instead of**: "The character named John is a brave and courageous knight who serves the kingdom."
**Use**: "John: brave knight, serves the kingdom."

### 2. Right Place, Right Time

Match information to the appropriate element:

| Information Type | Best Location |
|-----------------|---------------|
| Always-relevant facts | Plot Essentials |
| Behavioral rules | AI Instructions |
| Conditional lore | Story Cards |
| Current tone/style | Author's Note |
| Historical context | Memory System |

### 3. Avoid Redundancy

Don't repeat information across multiple elements:
- If it's in Plot Essentials, don't also put it in Story Cards
- If a character is well-established in history, reduce their Story Card
- Trust the Memory System to retrieve relevant past content

## Element-Specific Strategies

### AI Instructions

**Keep Focused**: Limit to actual behavioral directives
**Avoid Plot**: Don't include story content—that's for Plot Essentials
**Be Direct**: "Write in third person" not "You should try to write in third person if possible"

### Plot Essentials

**Essential Only**: Only include information the AI should always know
**Update Regularly**: Remove outdated information as story evolves
**Structure for Clarity**: Use consistent formatting the AI can parse

**Example Structure**:
```
Setting: Fantasy kingdom of Larion
Protagonist: Elara, elven ranger, seeking lost artifact
Key Relationship: Traveling with Marcus, human mage, childhood friend
Current Goal: Reach the Crystal Caves before the full moon
```

### Story Cards

**Specific Triggers**: Use character names, location names, unique terms
**Avoid Common Words**: Don't trigger on "the" or "a"
**Moderate Length**: Long cards crowd out history

**Trigger Design Tips**:
- "dragon" will trigger on "dragons" too
- "Red Dragon" is more specific than "dragon"
- Use multiple triggers for variations: "Eldoria,Eldorian,the capital"

### Author's Note

**Short and Sweet**: 3-4 sentences maximum
**Current Focus**: What's happening now, not always
**Style Tags**: Genre, tone, pacing descriptors

**Example**:
```
Dark fantasy. Tense dialogue. The villain has the upper hand. Build suspense.
```

### Memory Bank & Story Summary

**Let It Work**: Trust Auto Summarization for most cases
**Edit When Needed**: Correct errors, emphasize important events
**Don't Fight It**: The system is designed to handle long-form memory

## Scenario Design Patterns

### Light Touch Approach

Minimal upfront content:
- Brief AI Instructions
- Essential-only Plot Essentials
- Few Story Cards
- Rely on history and memories

Best for: Open-ended adventures, player-driven narratives

### Rich World Approach

Detailed world-building:
- Comprehensive Story Card library
- Interconnected triggers
- Moderate Plot Essentials
- Structured AI Instructions

Best for: Detailed scenarios, consistent lore

### Script-Enhanced Approach

Dynamic content management:
- Scripts create Story Cards as needed
- Context modifier injects relevant content
- State-based information management

Best for: Game-like scenarios, complex systems

## Common Mistakes

### Overloading Plot Essentials

**Problem**: 1000+ token Plot Essentials leaves little room for history
**Solution**: Move conditional information to Story Cards

### Trigger Spam

**Problem**: Story Cards triggered on every action, crowding out history
**Solution**: Use more specific triggers, reduce card count

### Ignoring the Memory System

**Problem**: Manually maintaining Story Summary, fighting Auto Summarization
**Solution**: Enable Memory Bank, let the system work

### Redundant Story Cards

**Problem**: Multiple cards with overlapping content
**Solution**: Consolidate cards, use trigger networks

## Advanced Techniques

### Trigger Networks

Design Story Cards to reference each other:
- Location card mentions character names → triggers character cards
- Character card mentions locations → triggers location cards
- Creates cascading context for related information

### Conditional Density

Vary content density based on context needs:
- Dense summaries for background characters
- More detail for currently active characters
- Use script to swap detail levels

### Context-Aware Scripts

Use scripts to monitor and adjust:
- Check `info.maxChars` and `text.length` in onModelContext
- Adjust injected content based on available space
- Prioritize most relevant additions

## Related Documentation

- [Context Assembly Order](context-assembly-order.md)
- [Allocation Rules](allocation-rules.md)
- [Context Viewer](context-viewer.md)
- [Story Cards Best Practices](../04-story-cards/card-best-practices.md)

## Source References

- https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
- https://help.aidungeon.com/faq/story-cards
- https://help.aidungeon.com/faq/plot-components
