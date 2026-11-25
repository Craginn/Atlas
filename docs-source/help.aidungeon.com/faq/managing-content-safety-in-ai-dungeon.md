---
title: "Managing content safety in AI Dungeon"
source: https://help.aidungeon.com/faq/managing-content-safety-in-ai-dungeon
scraped: 2026-11-25
---

# Managing content safety in AI Dungeon

As part of the AI Dungeon Phoenix release, we overhauled our AI Safety Setting feature. We previously offered “Safe Mode” within AI Dungeon, but over time saw increased user feedback that this feature wasn’t providing the expected amount of control players wanted over their experiences. Players sometimes encountered uncomfortable situations with the AI, even when Safe Mode was turned on.

As we considered this feedback and reexamined this feature, we realized that determining the safety of AI-generated content and protecting our players from potentially harmful material is a very difficult problem to solve, and frankly it’s one we haven’t done well on in the past.

We started looking for a technology partner who specializes in content safety and could provide a better solution than we have. We identified HiveAI as that solution, and have implemented their AI-based scoring technology within AI Dungeon to give players better control over their experience and help them feel safe when interacting with the AI.

When players interact with the AI, the model outputs will be sent to Hive for a safety score. If the AI-generated output doesn’t meet the threshold set by the player, we will either provide a different generation or let the user know there was an issue. This is also in place for Scenario Images and some Scenario Content. [Learn more about what gets filtered here →](https://help.aidungeon.com/faq/what-triggers-the-ai-filter)

As with any partnership, we've taken time to evaluate Hive’s product and terms of service to ensure our players' privacy and security is protected. Hive is well-established in the machine learning field and their product is utilized by many top brands and companies. None of the data we send to Hive will be stored, looked at, or used in any way to train their models. All API requests are encrypted, processed by Hive’s internal servers, and then immediately deleted. Their use of our players’ content is only to generate a safety score during gameplay. We’re really excited that Hive is becoming an integral part of AI Dungeon and helping us protect our players!

> **Our new AI Safety Setting has three levels: Safe, Moderate, and Mature.**

These correspond roughly with familiar movie ratings. The Safe setting is similar to PG, Moderate is closer to PG-13, and Mature is R, which is the same as our current mature 18+ setting. These levels let players dictate what kind of content the AI can generate, and we can change and adjust them as we receive feedback.

Along with this update, we also improved the safety settings for Discover and Search. Content will be rated at Everyone, Teen, Mature, or Unrated (which is for explicit content).

We’ve intentionally set up this setting to operate independently of the AI Safety Settings, since we know some players like to create their own NSFW content, but prefer not to see other people’s NSFW content when browsing.

> The AI Safety Setting and Search Filter both default to Safe and Teen respectively, and players can change those themselves.

Ultimately, our updated AI Safety Setting and Safe Search Filter are just more ways players get to customize and control their individual AI Dungeon experience. They provide additional safety controls for those who want them, while still offering flexibility for those who don’t.

[Read more about how our content moderation works →](https://help.aidungeon.com/faq/how-does-content-moderation-work)
