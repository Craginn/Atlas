---
title: "New Player Guide"
source: https://help.aidungeon.com/new-player-guide
scraped: 2026-11-25
---

# New Player Guide

Welcome to AI Dungeon! The following is a general overview of the basic concepts of the tools provided by AI Dungeon to improve your Adventure experience. One of the best ways to learn is by merely playing, so you may just want to read the Action Types section and then try it out for yourself! If you wish to further improve your experience, keep reading—there are numerous tips, tricks, and resources provided to enhance your overall experience, along with links to more advanced resources if you wish to explore them in more detail. However you decide to approach playing and learning, all ways are valid!

## Action Types

Actions are the method by which you send prompts to the AI, which then generates a response and helps you craft your Adventure. Which action type you choose (Do, Say, or Story) will depend on what you want to happen in your Adventure:

![image](https://file.notion.com/f/f/6cd5a73c-9af8-4da4-9fef-c8ea3e73ad44/ac2cb725-7f80-4a20-9d37-148005ff6d0e/Actions_Gif.gif?table=block&id=361105b8-a632-8087-9222-e8a2f29277d9&spaceId=6cd5a73c-9af8-4da4-9fef-c8ea3e73ad44&expirationTimestamp=1793923200000&signature=kILtI-B-OaY_oXzwhxhbDVS2MeN3PuEtZsPUJQsZYlk)

### Do Action

Take actions (which can include saying things).

Most of the time, it will add “You” to the front of anything you type and convert text to second person. (ex: I → You)

Advanced Formatting Details:

\\n> You (prompt text goes here).\\n Any use of first person will be converted to second person by default unless it is inside of double quotes (“”).

### Say Action

Say something. This is the most straightforward action type.

It will be formatted as follows: You say “Prompt”

Advanced Formatting Details:

\\n> You say “(prompt text goes here)”\\n

### Story Action

Extremely free form. You can type what you want with minimal formatting taking place.

Adds a single space in front of the prompt.

Advanced Formatting Details:

Story does not add new lines or > which may affect how some of our fine-tuned models respond to it.

### See Action

AI will attempt to generate an image of what you describe. If left blank, it will attempt to generate a prompt based on your recent actions, Story Cards, and Plot Essentials. This does not impact the narrative and is just for you to enjoy.

If left empty, the AI will attempt to generate an image based on recent context.

Advanced Formatting Details:

1\. If a specific prompt is provided, it uses that as the prompt.

2\. If the prompt is left empty, it converts the previous story text into a prompt.

3\. If it is unable to be converted to a prompt, it uses the last action directly as the prompt.

## Context

Context is essentially how much the AI can remember. The more tokens of context that you have, the more the AI will be able to keep track of at the same time. In general, you can think of context like this:

-   2,000 Tokens: Maintaining a cohesive story will take some effort. You may want to manage specific information to make sure the AI remembers key details.
-   4,000 Tokens: The story will start to feel more cohesive but you may still want to manage some information, especially in longer Adventures.
-   8,000 Tokens: This is where it starts to feel comfortable and intervention is rarely needed to remain cohesive, even in most longer Adventures.
-   16,000 Tokens: This is enough context to store over 100 actions worth of raw text. You will almost never need to think about it.
-   32,000 Tokens: This is enough to store well over 200 actions worth of raw text. Entirely unnecessary, but quite nice.

## Which Model Should You Use?

Pretty much all of the models have a use case, but there are many that stand out for various reasons, including personal preference and specific playstyles. Models on AI Dungeon can broadly be broken into two categories: Small and Large.

Here you can find a detailed breakdown of our [AI Models and their Differences](https://help.aidungeon.com/ai-model-differences).

## Plot Components

This is a broad strokes way of thinking about Plot Components, but there are many unique ways to use each of them beyond what is described here:

-   AI Instructions (AIN): Programming the brain of an author.
-   Author's Note (AN): Providing feedback based on what type of story and writing style you want from that author.
-   Plot Essentials (PE): Short term memory, always in context.
-   Story Cards (SC): Long term memory, not always in context.

You can find the Plot Components like this:

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/ba4c2e68-2b43-4c17-afc5-f6e64bfa6a77/Plot_Components_PC.gif?width=710)

## Memory Bank

The Memory Bank is a system designed to help extend the value of your context by creating condensed packets of information that summarize chunks of your story, then selects the most relevant memories to put into context at any given time.

You can find it here if you want to view or edit them:

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4421e75f-e731-4043-bd23-9cdd7b47118a/Guide_Accessing_Memories.gif?width=672)

## Scripts

These are an advanced way to alter your AI Dungeon experience. Their effects range from generating Story Cards to simulating dice rolls. Scripts can be added to a Scenario by the creator of the Scenario, or found on **[Discover](https://play.aidungeon.com/discover)** to save and add to an ongoing adventure.

Here you can find a list of popular [Scripts and how to Install them](https://help.aidungeon.com/what-are-scripts-and-how-do-you-install-them).

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/3cbdc7a5-b2a3-4c68-b47a-9097be68b2b8/guide_accessing_scripting.gif?width=802)

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/274fed89-dc5a-4e34-b6e8-0536e4e8348f/add-adventure-script.gif?width=697)
