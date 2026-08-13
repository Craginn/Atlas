# Image Settings

> Configure image generation parameters to control quality, style, and output characteristics.

## Overview

Image generation settings let you customize how See mode produces images. These settings affect quality, generation speed, and stylistic characteristics across all images in your Adventure.

## Accessing Settings

1. Open Adventure settings (gear icon)
2. Navigate to Gameplay section
3. Find Image Generator accordion
4. Adjust settings as desired

## Settings Reference

### Image Source

**What It Does**: Selects the image generation model

**Options**:
- Stable Diffusion
- Stable Diffusion XL
- DALL-E 3
- DALL-E 3 HD
- FLUX variants (if available)

**Considerations**:
- Different models have different strengths
- Quality and cost vary
- Some require higher tier subscriptions

### Image Style

**What It Does**: Text appended to every image prompt

**Default**: Includes quality-enhancing terms

**Use For**:
- Consistent style across all images
- Avoiding repetitive prompt additions
- Establishing aesthetic theme

**Example**:
```
digital art, highly detailed, fantasy illustration, dramatic lighting
```

Whatever you put here is added to every See prompt automatically.

### Steps

**What It Does**: Number of diffusion iterations

**Default**: 50

**Range**: Typically 20-100

**Effects**:
- Higher steps = more refined images
- Lower steps = faster generation
- Diminishing returns above ~75

**Recommendations**:
- 30-40 for quick previews
- 50 for balanced quality
- 75+ for maximum refinement

### CFG Scale (Classifier-Free Guidance)

**What It Does**: How closely output matches prompt

**Typical Range**: 5-15

**Effects**:
- Higher (10-15): Strict adherence to prompt
- Lower (5-8): More creative interpretation
- Very high (15+): May produce artifacts

**Recommendations**:
- 7-8 for balanced results
- 10+ when prompt accuracy is critical
- Lower when you want more variety

### Sampler

**What It Does**: Algorithm for the diffusion process

**Default**: KLMS

**Options**: Vary by model (Euler, DPM, DDIM, etc.)

**Effects**:
- Different visual characteristics
- Speed variations
- Quality differences

**Recommendation**: Try the same prompt with different samplers to see which you prefer.

## Per-Image vs. Global

These settings are global for your session:
- Apply to all See mode generations
- Change them before generating
- Can adjust between images

## Cost Considerations

Settings can affect Credit usage:
- Higher-quality models cost more
- More steps may cost more (model-dependent)
- Balance quality with budget

## Combining with Prompt

Your written prompt + Image Style = what the AI sees:

**Your prompt**: "A castle on a cliff"
**Image Style**: "digital art, fantasy, detailed"
**AI receives**: "A castle on a cliff, digital art, fantasy, detailed"

Keep this in mind when writing prompts—don't duplicate style terms.

## Troubleshooting

### Images Too Generic

- Write more specific prompts
- Adjust Image Style
- Try higher CFG Scale

### Images Look Wrong

- Check if Image Style conflicts with prompt
- Try different sampler
- Adjust CFG Scale

### Generation Slow

- Reduce Steps
- Use faster model/sampler
- Accept quality trade-off

## Related Documentation

- [See Mode Overview](see-mode-overview.md)
- [Prompt Techniques](prompt-techniques.md)

## Source References

- https://help.aidungeon.com/faq/see-mode
