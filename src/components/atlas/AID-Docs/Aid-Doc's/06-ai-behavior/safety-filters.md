# Safety Filters

> AI Dungeon implements content safety settings that filter AI generation based on maturity level preferences.

## Overview

AI Dungeon provides content safety settings that affect what the AI will generate. These settings help players control the maturity level of their experience and ensure compliance with platform content policies.

## Safety Levels

AI Dungeon offers three safety levels:

### Safe

Most restrictive setting:
- Family-friendly content
- No violence, adult themes, or mature language
- Suitable for all ages

### Moderate

Balanced setting:
- Some mature themes allowed
- Violence in context of story
- No explicit adult content

### Mature

Least restrictive setting:
- Adult themes permitted
- Violence and mature content allowed
- Still subject to platform content policies

**Note**: Even Mature mode has limits based on AI Dungeon's terms of service and content policies.

## Accessing Safety Settings

1. Open Adventure settings
2. Navigate to safety/content settings
3. Select desired level

Settings may also be configured at the account level.

## How Filtering Works

Content filtering operates at multiple levels:

### Input Filtering

Player input may be checked for policy violations before processing.

### Output Filtering

AI responses are evaluated and may be:
- Allowed unchanged
- Modified to remove problematic content
- Blocked entirely with a warning

### HiveAI Integration

AI Dungeon uses HiveAI for content classification:
- Automated content scoring
- Category detection
- Policy enforcement

## Scenario Considerations

### NSFW Flag

Scenario creators should flag content appropriately:
- Toggle "Flagged NSFW" for mature content
- NSFW scenarios hidden from safe searches
- Required for compliance with community guidelines

### Player Control

Players can set their own safety preferences:
- May be more restrictive than scenario setting
- Host settings apply to multiplayer guests

## Content Policies

Regardless of safety settings, certain content is prohibited:
- Violations of Terms of Service
- Illegal content
- Content involving minors inappropriately
- Other policy violations

See AI Dungeon's Terms of Service and Community Guidelines for complete details.

## Filter Messages

When content is filtered, you may see:
- "The AI doesn't know what to say"
- "Content filtered for safety"
- Request to modify input
- Other warning messages

## Troubleshooting

### Legitimate Content Being Blocked

- Check your safety level settings
- Consider if the AI misunderstood context
- Rephrase the request
- Use Story Mode for direct input

### Unexpected Content Getting Through

- Review and report if problematic
- Filters aren't perfect
- Use Retry or Edit to remove unwanted content

### Multiplayer Considerations

- Host's settings apply to all players
- Guests operate under host's safety level
- Communicate about content preferences

## Related Documentation

- [Plot Components Overview](../05-plot-components/plot-components-overview.md)
- [Multiplayer Overview](../09-multiplayer/multiplayer-overview.md)

## Source References

- https://help.aidungeon.com/faq/what-are-the-ai-safety-settings
- https://help.aidungeon.com/faq/what-triggers-the-ai-filter
- https://help.aidungeon.com/faq/what-content-is-not-allowed-on-ai-dungeon
