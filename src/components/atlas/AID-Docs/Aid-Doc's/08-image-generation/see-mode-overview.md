# See Mode Overview

> See mode enables AI image generation within adventures, creating visual content based on text prompts.

## Overview

See mode is one of AI Dungeon's four input modes, alongside Do, Say, and Story. Instead of generating text, See mode creates images based on descriptions you provide. This adds a visual dimension to text adventures.

## Basic Usage

1. In an Adventure, open the action input
2. Select the mode selector (>)
3. Choose "See"
4. Type a description of what you want to see
5. Submit to generate an image

## Image Models

AI Dungeon supports multiple image generation models:

- **Stable Diffusion**: Base model
- **Stable Diffusion XL**: Higher quality
- **DALL-E 3**: OpenAI's image model
- **DALL-E 3 HD**: Higher quality DALL-E
- **FLUX models**: Newer generation (FLUX.1 pro, dev, schnell)

Model availability depends on your subscription tier.

## Credits

Image generation requires Credits:
- Each generation consumes Credits
- Credit amount varies by model
- Higher quality models cost more
- Credits are part of subscription or purchased separately

## Image Settings

Access settings in the Adventure settings sidebar under Image Generator:

### Image Source

Select which model to use for generation.

### Image Style

Text appended to all your prompts:
- Sets consistent style across images
- Default includes quality-enhancing terms
- Customize for your preferred aesthetic

### Steps

Number of diffusion steps:
- Higher = better quality, slower
- Lower = faster, potentially lower quality
- Default (50) works well for most cases

### CFG Scale

Classifier-free guidance scale:
- Higher = closer to prompt, less creative
- Lower = more creative, may drift from prompt
- Balance based on how literal you want results

### Sampler

Diffusion sampling method:
- Different samplers produce different looks
- KLMS is default
- Experiment to find preferences

## Image Options

After generation, clicking an image shows options:

- **Share**: Generate a shareable link
- **Download**: Save to your device
- **Delete**: Remove from Adventure
- **Retry Image**: Regenerate (costs Credits)
- **Edit Prompt**: Modify and regenerate

## Undo/Redo

Image actions work with Undo/Redo:
- Undo removes the image from history
- Redo restores it
- Like text actions, but for images

## Images in Story Flow

Images become part of your Adventure:
- Appear inline with text
- Saved with the Adventure
- Visible in playback

## Ownership

You own images you generate:
- AI Dungeon doesn't claim copyright
- Download and use as you wish
- Full rights to your generated content

## Limitations

- Requires Credits
- Quality depends on prompt skill
- Some subjects render poorly (hands, text)
- Model-specific limitations apply
- Content filters may affect some prompts

## Related Documentation

- [Image Settings](image-settings.md)
- [Prompt Techniques](prompt-techniques.md)

## Source References

- https://help.aidungeon.com/faq/see-mode
- https://help.aidungeon.com/faq/how-do-i-create-pictures-in-ai-dungeon
