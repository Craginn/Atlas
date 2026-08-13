# Sampling Parameters

> Temperature, Top-K, and Top-P control how the AI selects tokens during generation, affecting creativity and predictability.

## Overview

When generating text, AI models predict probability distributions over possible next tokens. Sampling parameters determine how tokens are selected from these distributions. Understanding sampling helps you tune the balance between creativity and coherence.

## How Token Selection Works

1. The AI calculates probability for every possible next token
2. Sampling parameters filter and adjust these probabilities
3. A token is randomly selected based on the adjusted distribution
4. The process repeats for each token generated

## Temperature

### What It Does

Temperature scales the probability distribution, affecting how "peaked" or "flat" it is.

### Mathematical Effect

- Lower temperature: Peaks become sharper (high-probability tokens dominate)
- Higher temperature: Distribution flattens (lower-probability tokens get more chance)
- Temperature = 1.0: Unmodified probabilities

### Practical Effects

| Temperature | Output Character |
|-------------|------------------|
| 0.2-0.4 | Very predictable, may feel robotic |
| 0.5-0.7 | Coherent but somewhat predictable |
| 0.7-0.9 | Balanced (default range) |
| 1.0-1.2 | Creative, occasional surprises |
| 1.3+ | Chaotic, potentially incoherent |

### Recommendations

**For Coherent Stories**: 0.6-0.8
**For Creative Stories**: 0.9-1.1
**For Grounded Realism**: 0.5-0.7
**For Experimental Play**: 1.0+

### Default

AI Dungeon default: 0.8

## Top-K Sampling

### What It Does

Limits selection to only the K most probable tokens, excluding everything else.

### How It Works

1. Sort all tokens by probability
2. Keep only the top K tokens
3. Renormalize probabilities among remaining tokens
4. Sample from this reduced set

### Effects

- Lower K: More focused, less random
- Higher K: More variety possible
- K = 1: Would be greedy (always most likely)

### Availability

Not all models support Top-K. Check if available in Advanced Settings.

### Typical Values

- K = 20-40: Balanced
- K = 10 or less: Very constrained
- K = 100+: Minimal effect

## Top-P (Nucleus) Sampling

### What It Does

Selects tokens until cumulative probability reaches threshold P.

### How It Works

1. Sort tokens by probability
2. Add tokens to consideration set until cumulative probability ≥ P
3. Sample from this set

### Difference from Top-K

- Top-K: Fixed number of tokens
- Top-P: Dynamic number based on probability distribution

If one token has 95% probability and P = 0.9, only that token is considered. If probabilities are spread evenly, many tokens qualify.

### Effects

- Lower P: Fewer tokens considered, more focused
- Higher P: More tokens considered, more variety
- P = 1.0: All tokens considered (no filtering)

### Recommendations

| Top-P | Result |
|-------|--------|
| 0.5 | Very focused, may be repetitive |
| 0.7-0.8 | Fairly focused |
| 0.85-0.95 | Balanced (common range) |
| 0.99-1.0 | Minimal filtering |

### Default

Typically around 0.9

## Combining Parameters

Temperature, Top-K, and Top-P can work together:

1. Top-K and Top-P filter the token set
2. Temperature adjusts relative probabilities
3. Selection happens from the filtered, adjusted distribution

### Common Combinations

**Conservative**: Low temperature (0.6), moderate Top-P (0.85)
**Balanced**: Default temperature (0.8), high Top-P (0.95)
**Creative**: Higher temperature (1.0), high Top-P (0.95)

## Troubleshooting

### Output Too Same-y

- Raise temperature
- Raise Top-P
- Ensure Top-K isn't too restrictive

### Output Incoherent/Weird

- Lower temperature
- Lower Top-P
- Ensure temperature isn't too high

### Grammatical Errors

- Temperature may be too high
- Top-P may include too many unlikely tokens
- Try more conservative settings

## Related Documentation

- [Generation Parameters](generation-parameters.md)
- [Repetition Control](repetition-control.md)

## Source References

- https://help.aidungeon.com/faq/what-are-advanced-settings
- https://help.aidungeon.com/faq/how-are-ai-responses-generated
