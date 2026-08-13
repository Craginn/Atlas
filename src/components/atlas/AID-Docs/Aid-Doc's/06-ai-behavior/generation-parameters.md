# Generation Parameters

> AI Dungeon's Advanced Settings allow players to customize how AI models generate responses through various parameters.

## Overview

Generation parameters control the AI's output characteristics. These settings affect creativity, consistency, length, and other aspects of generated text. Understanding these parameters helps you tune the AI for your preferred experience.

## Accessing Advanced Settings

1. Open an Adventure
2. Access settings sidebar (gear icon)
3. Navigate to AI Models section
4. Find Advanced Settings

Advanced Settings are available to all players (expanded in the Renaissance update).

## Core Parameters

### Context Length

**What It Does**: Maximum tokens sent to the AI model

**Range**: Varies by tier and model

**Recommendation**: Set to maximum for your tier

**Why**: More context means the AI has more story information to work with

**Note**: Some models have lower context limits regardless of tier setting

### Response Length

**What It Does**: Maximum tokens the AI generates per response

**Default**: Varies (typically around 150)

**Range**: Varies by model

**Considerations**:
- Higher = longer responses, more reading
- Lower = shorter, more punchy responses
- Response length counts toward context for next turn
- Personal preference varies

### Temperature

**What It Does**: Controls randomness/creativity of output

**Default**: 0.8

**Range**: 0.0 to 2.0 (typically)

**Effects**:
- Lower (0.4-0.6): More predictable, coherent, conservative
- Medium (0.7-0.9): Balanced creativity and coherence
- Higher (1.0+): More varied, creative, potentially chaotic

**Use Cases**:
- Lower temperature for grounded, realistic stories
- Higher temperature for wild, creative adventures
- Adjust based on how "surprising" you want the AI to be

## Sampling Parameters

### Top-K

**What It Does**: Limits choices to K most likely tokens

**Availability**: Some models only

**Effect**: Excludes unlikely tokens from consideration

**Example**: Top-K = 20 means only the 20 most probable next words are considered

**Use Case**: Reduce randomness while maintaining some variety

### Top-P (Nucleus Sampling)

**What It Does**: Selects tokens until cumulative probability reaches P

**Default**: Typically 0.85-0.95

**Effect**: Dynamic token limiting based on probability distribution

**Example**: Top-P = 0.9 includes tokens until 90% cumulative probability is reached

**Recommendations**:
- Too low: Repetitive, boring output
- Too high: Incoherent, grammatically poor output
- 0.5-0.95 works for most use cases

## Repetition Control Parameters

### Repetition Penalty

**What It Does**: Reduces probability of repeating tokens

**Availability**: Some models only

**Default**: 0 or 1.0 (no penalty)

**Caution**: High values penalize common words too (articles, pronouns)

**Recommendation**: Use sparingly; even 1.05 can be too high for some models

### Presence Penalty

**What It Does**: Fixed penalty for tokens that appeared at least once

**Availability**: Some models only

**Effect**: Discourages reusing any previously used word

### Frequency Penalty

**What It Does**: Penalty proportional to token appearance frequency

**Availability**: Some models only

**Effect**: Penalizes frequently repeated words more than occasionally repeated ones

### Count Penalty

**What It Does**: Similar to frequency penalty, proportional to appearance count

**Availability**: Some models only

## Guidelines for Adjustment

### Start with Defaults

The default values have been tested and work well for most users. Only adjust if you have a specific reason.

### Change One Parameter at a Time

When experimenting:
- Adjust one setting
- Play several turns
- Assess the effect
- Adjust further or try a different parameter

### No "Best" Values

Optimal settings depend on:
- Your preferred play style
- The model you're using
- The type of story you want
- Personal taste

### Model Variation

Different models respond differently to the same settings:
- What works for one model may not work for another
- Experiment when switching models
- Some parameters aren't available on all models

## Common Adjustments

### AI Too Random/Chaotic

- Lower temperature (try 0.6-0.7)
- Lower Top-P (try 0.8)
- Add repetition penalty cautiously

### AI Too Boring/Repetitive

- Raise temperature (try 0.9-1.0)
- Raise Top-P (try 0.95)
- Reduce repetition penalties

### Responses Too Short

- Increase Response Length
- May also need to adjust AI Instructions to encourage detail

### AI Keeps Repeating Phrases

- Enable Repetition Penalty (gently, 1.02-1.05)
- Check if Author's Note or Plot Essentials contain repeated phrases
- Regenerate with higher temperature

## Related Documentation

- [Sampling Parameters](sampling-parameters.md)
- [Repetition Control](repetition-control.md)
- [Response Shaping](response-shaping.md)

## Source References

- https://help.aidungeon.com/faq/what-are-advanced-settings
- https://help.aidungeon.com/faq/how-are-ai-responses-generated
