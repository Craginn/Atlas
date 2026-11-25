---
title: "What is Plot Essentials?"
source: https://help.aidungeon.com/faq/plot-essentials
scraped: 2026-11-25
---

# All About Plot Essentials

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/81f10d54-47f5-41f2-967b-cefe32bfd73f/pencil.svg)

`Plot Essentials` (formerly called “Memory”) is a feature that lets you give the AI important story details that it should always consider when generating the next part of your Adventure.

AI models have limited context lengths, which is the amount of information the AI can process when generating its next output. Because of this, older parts of your story text are eventually pushed out of the context, and it can often feel like the AI is “forgetting” important story details since they weren’t sent to the AI.

To get around this limitation, you can use tools like Plot Essentials to keep the AI informed about the most important aspects of your game. You could include information about unique or relevant parts of your character and their immediate companions, the story’s setting, or any other overarching story points that aren’t always mentioned but are always relevant.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/73af209c-c47a-4f68-8dbf-2e8e0412bcd6/Untitled.png?width=1600)

## How to Add Plot Essentials

This feature functions like other [Plot Components](https://help.aidungeon.com/faq/plot-components), so you can add Plot Essentials from the Scenario or Adventure levels with the `+ Add Plot Component` button.

![You can add Plot Essentials to a Scenario or Adventure.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/e6765df7-3fbf-4461-820c-0cd2845bd288/plot-components.png?width=1600)

You can add Plot Essentials to a Scenario or Adventure.

Like other Plot Components—such as [AI Instructions](https://help.aidungeon.com/faq/ai-instructions) or [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note)—Plot Essentials are **not** required to create a Scenario or play an Adventure, but having good essentials can help keep the AI on track, which leads to more coherent and consistent gameplay.

## How to Use Plot Essentials

-   Try to keep Plot Essentials **as dense and concise as possible**: fit as many relevant details as you can in as little space as you can.
-   Don’t worry about details that aren’t important at the moment: only focus on things you want the AI to be able to reference right now.

-   Note: information in Plot Essentials will prime the AI to bring up those details again, so only mention things you _want_ the AI to potentially bring up in future outputs.

-   Focus on story-relevant and action-relevant details: things that are relevant to both the story itself and to things that might actually drive the action forward. Examples include:

-   Information about your character—like their personality, means, goals, companions, what they’re known for, and what they’re up against—is great here, because that’s something the AI can and should always reference.
-   Information about the local area or settings—such as the landscape, politics, weather, interesting cultural quirks, etc.—is also good, because it gives the AI something to bring up in more detailed descriptions.
-   Physical descriptions are only relevant if they’re going to come up—like a character being strong or having a specific item. Over-description of physical features may lead to repetition.
-   If you include any past events that may have happened, make sure they are explicitly in past tense and labeled as the past. Otherwise, the AI may try to bring them back in the present. In general, just exercise caution when mentioning the past.
-   Details that only matter when a specific word or topic has been brought up, or details that are important but not 24/7 important, are usually better as [Story Card](https://help.aidungeon.com/faq/story-cards) entries.

-   The AI tends to ignores negatives: instead of saying something is “not” the case, use a word like “avoid”.
-   To keep the word-association strong, keep individual topics to their own line, without other details being mentioned, and use the name of the subject a few times.

-   `“Bob drives a red car that is rather beat up. He doesn’t know why he still drives it. Bob thinks that people who drive blue cars are stupid.”`

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/c3865dbf-d90b-49b8-9200-4be45f1092df/warning.svg)

Remember: Plot Essentials is part of the total context. Longer Plot Essentials will take up more [tokens](https://help.aidungeon.com/faq/what-are-tokens) and should be used sparingly if you have limited context. You can use the Context Viewer to see how many tokens your Plot Essentials are taking up in the context.

## Plot Essentials versus Other Plot Components

Here is a short breakdown of each [Plot Component](https://help.aidungeon.com/faq/plot-components) plus [Story Cards](https://help.aidungeon.com/faq/story-cards):

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Plot Component/Feature</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px;background:var(--color-color-default)"><div class="notion-table__cell"><span class="notion-semantic-string">How to Use It</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">AI Instructions</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI a set of instructions about how to generate responses.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Story Summary</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI a summary of your story to help it remember broader plot details. <a class="notion-link link" href="https://help.aidungeon.com/faq/the-memory-system">Works with the new Memory System.</a></span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Plot Essentials</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI some key details about your story that it should always remember.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Author’s Note</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI short guidance about your story’s theme and setting.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Third Person</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Change “You” in Do and Say actions to your character’s name. Mostly recommended for Multiplayer games.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Story Cards</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI some broader world-building details that are only included when keywords are used.</span></div></td></tr></tbody></table>

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/799515ae-5ce5-407c-bfc8-5813b82b089a/search.svg)

Information in AI Instructions, Story Summary, Plot Essentials, and Author’s Note will always be included in the context. Story Cards are added to the context when keywords are triggered. You can see how many tokens each element takes up through the Context Viewer. Ultimately, there aren’t strict guidelines about what information needs to be in each Plot Component. **We highly recommend playing around with all of them to see what works best for you!**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b92f6085-c518-444a-b404-e7a6dd419694/ic_round-discord.svg)

Remember: you can always get more information on this, or any subject, by asking in [our official Discord server](https://aidungeon.com/discord).
