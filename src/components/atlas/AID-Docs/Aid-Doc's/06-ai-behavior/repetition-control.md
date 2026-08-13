# Repetition Control

> Repetition penalties discourage the AI from reusing words and phrases, helping prevent loops and monotonous output.

## Overview

AI models sometimes fall into repetitive patterns, reusing the same words, phrases, or sentence structures. Repetition control parameters penalize repeated tokens to encourage variety. However, these penalties must be used carefully—they also affect legitimately repeated words.

## The Repetition Problem

Why AI repeats:
- High-probability patterns in training data
- Context that strongly suggests certain words
- Lack of diversity in sampling settings
- Feedback loops where repetition reinforces itself

Signs of repetition problems:
- Same phrases appearing multiple times
- Sentence structures repeating
- Character always using the same expressions
- Loop-like behavior

## Penalty Types

### Repetition Penalty

**What It Does**: Reduces probability of any token that has appeared before

**How It Works**: Multiplies probability of repeated tokens by a penalty factor

**Default**: 0 or 1.0 (no penalty)

**Typical Values**: 1.01 - 1.10

**Caution**: High values affect common words like "the", "a", "is", causing ungrammatical output

### Presence Penalty

**What It Does**: Applies a fixed penalty to tokens that appeared at least once

**How It Works**: Subtracts a fixed value from log-probability

**Effect**: Binary—appears or doesn't, not how often

**Use Case**: Discourage reuse of specific words regardless of frequency

### Frequency Penalty

**What It Does**: Penalty proportional to how often a token appeared

**How It Works**: Higher penalty for tokens used many times

**Effect**: Gradual—occasional reuse less penalized than heavy reuse

**Use Case**: Allow some repetition but discourage excessive use

### Count Penalty

**What It Does**: Similar to frequency penalty, based on raw count

**Note**: May be model-specific in exact implementation

## Availability

Not all penalty types are available on all models. Check Advanced Settings for your selected model.

## Using Repetition Penalties

### Start Conservative

- Begin with no penalty (default)
- Add penalty only if you observe repetition issues
- Small adjustments: 1.02, 1.05

### Effects of Over-Penalization

Too much penalty causes:
- Ungrammatical sentences (missing articles, pronouns)
- Unusual word choices to avoid "used" words
- Incoherent or stilted prose
- Names being avoided after first mention

### Better Alternatives

Before using penalties, try:
- Adjusting temperature (higher = more variety)
- Modifying Top-P (higher = more options)
- Editing Author's Note to encourage variety
- Regenerating problematic outputs

### When to Use Penalties

- Persistent loops that regeneration doesn't fix
- Specific word/phrase overuse
- Model-specific repetition tendencies
- After other approaches have failed

## Penalty Interactions

Penalties stack:
- Repetition + Presence + Frequency all apply
- Combined effects can be stronger than intended
- Use only what's necessary

## Model Considerations

Different models have different baseline repetition tendencies:
- Some models rarely repeat without penalty
- Others need gentle correction
- Fine-tuned models may have different sweet spots

Latitude's fine-tuned models (Wayfarer, etc.) may have built-in repetition handling that makes external penalties less necessary.

## Troubleshooting

### Output Still Repeating

- Increase penalty (carefully)
- Check if repetition is in your context (Plot Essentials, Story Cards)
- Try regenerating
- Raise temperature

### Output Becoming Ungrammatical

- Reduce penalty (possibly to 0)
- You've likely over-penalized
- Common words need to repeat

### Weird Word Choices

- Penalty forcing avoidance of normal words
- Reduce or remove penalty
- Accept some repetition as natural

## Related Documentation

- [Generation Parameters](generation-parameters.md)
- [Sampling Parameters](sampling-parameters.md)

## Source References

- https://help.aidungeon.com/faq/what-are-advanced-settings
