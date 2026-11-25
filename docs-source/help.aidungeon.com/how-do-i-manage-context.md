---
title: "How do I manage my Context?"
source: https://help.aidungeon.com/how-do-i-manage-context
scraped: 2026-11-25
---

# How do I manage my context?

This guide is intended for players who are struggling with their story becoming incoherent over time, losing important details, forgetting plot elements, or otherwise just not having enough context space to fit all components.

This guide assumes that you have a basic understanding of the various [Plot Components](https://help.aidungeon.com/faq/plot-components), though a deep understanding is not required.

![icon](https://app.notion.com/icons/graduate_gray.svg)

If you would like to learn the basics of Plot Components, you can find a [Beginner’s Guide here](https://help.aidungeon.com/new-player-guide)!

## What is Context?

How much “context” you have determines how much of your story the model can use in one response. This includes your past actions and the AI responses, but it also includes your Plot Essentials, Story Cards, and Memory Bank—everything uses context, so it’s important that every part of your adventure is optimized to not use it unnecessarily.

Context is counted in tokens. For instance, if your model has 4k tokens of context, it means you can have up to 4k tokens worth of recent actions, AI Instructions, Plot Essentials, Story Cards, and so on.

[Read more about tokens here →](https://help.aidungeon.com/faq/what-are-tokens)

For this guide, we will estimate that your tokens are _characters/4_, so for every 4 characters, you get 1 token.

Some models have more context than others. The more context, the more expensive the model is to run, so typically smaller models will have much more context available than the larger ones. Higher [subscription tiers](https://help.aidungeon.com/memberships-benefits) can give you more context with your models, or access to other models with more context.

## Where to View your Context

Context can be found by pressing on the last response and selecting “View Context.”

If you have refreshed or erased recently, this button will be greyed out. Simply take any action, including continue, to be able to click the button.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/41b8abdf-964c-47b8-a910-4b52723b70a8/img-2026-02-05-18-32-39-removebg-preview.png?width=1600)

## Healthy Context vs. Unhealthy Context

Generally speaking, you want most of your Context to be used by your Adventure text, which is the pink bar on your Context Viewer. This is because your Adventure text has raw, easily understandable information that is imperative for the AI to know, and it’s the easiest way to ensure your story stays on track.

As an example, if you entered a room five actions ago, but you only have enough context for the AI to see your last two actions, it’s not going to matter how many Story Cards you have describing the room—the AI can’t see back far enough to know that you’re there. It might try to have you enter the room again, or put you in a completely different place.

Below is an example of Healthy (left) and Unhealthy (right) context. When context is healthy, all components are fairly balanced and take up only as much room as is needed. When context is unhealthy, one component soars above the rest in usage, and takes away useful space that could be used to keep the story coherent.

![Healthy context](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b52207f2-9993-40a1-a08a-e9b2f3b6c864/2k_healthy.png?width=1600)

Healthy context

![Unhealthy context](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/6d5c7b3f-4aea-49c0-aea4-b227ae45c4f1/2k_unhealthy.png?width=1600)

Unhealthy context

This is just an example, and it’s not to say that you can’t ever have one component be bigger than the others. You may have a lot of Story Cards which take up a fair bit of room, but feel that they are all necessary to have in your story, and that’s completely fine. You don’t have to delete them! Instead, you can keep reading to learn how to trim them and make them more efficient.

## How can I use less Context?

You can employ a few different strategies to make your Context usage more efficient, depending on which Component is eating up the most space.

In general, you can always just try to reword things. Use more direct language, cut out filler words, or anything that would reduce the overall size of the text.

> **Please note that these tips are just tips****.**

You may find that what is listed here doesn’t work for you, and that’s okay. It’s important to test yourself, learn what you like, and make up your own rules as you go. Such is the beauty of AI Dungeon!

![icon](https://app.notion.com/icons/light-bulb_gray.svg)

If you want to learn more about any specific Plot Component, click its name to be taken to its dedicated explanation page. (You may even find some more tips for optimization there!)

### **[AI Instructions](https://help.aidungeon.com/faq/ai-instructions)****:**

Here are a few tips for managing your AI Instructions:

-   **Look for lines that serve similar or the same purposes**, such as two lines telling the AI to not speak for the main character, and remove one or combine them into one line.

-   While it can be tempting to add multiple lines for one problem—especially if that problem is annoying—typically if one line doesn’t work, two of the same lines won’t either.

-   **Look for any lines that you feel like aren’t doing anything productive**. Sometimes this can be a shot in the dark, and you might end up removing something that was quietly working, but remember that all changes are reversible in case you accidentally do something you don’t like. **Always make sure to save a backup of your instructions just in case!**
-   **Cut down on any bulky wording**.

For example, this line is 168 characters:

`- Ensure characters act and speak like how their personality is defined. Speech should never feel generic, trope-y, or like it's interrupting the natural narrative flow`

But, it could be trimmed down to 57 characters:

`- NPCs act lifelike and speak befitting their personality`

Now, you’ve cut out over half the bulk, but still retained most of the actual purpose of the line.

Doing this may cause your instruction to lose some effectiveness, or it could cause it to be even more effective. It all depends on how you word it!

In any case, always test and explore! See what feels right for you, what instructions you can go without, and what instructions you feel are integral. Don’t be afraid to go out of your comfort zone and experiment!

### **[Plot Essentials](https://help.aidungeon.com/faq/plot-essentials)****:**

Unless you have a lot of Context, you generally want to keep Plot Essentials to a minimum, because it is always in context, unlike Story Cards which need to be triggered. Keep it focused to information about your Player Character or other characters that will always be in the scene, or world details that need to always be known.

Some tips for managing your Plot Essentials:

-   **Check to see if there is anything that can be moved to a Story Card instead**. You can generally ask yourself: Is this information always relevant? Would this work better if it only triggered sometimes?
-   **Keep descriptions to a minimum.** It can be important to give the AI a good description of your character, especially if that is important to you, but try to have your description be as short as possible to accomplish your goals.

### **[Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note)****[:](https://help.aidungeon.com/faq/what-is-the-authors-note)**

Author’s Note should stay as concise as possible, unless you know what you’re doing. It is the last instructions the AI sees before it writes, which makes it extremely powerful for guiding the direction of the story. However, it also must be balanced in length—the Author’s Note is placed right between your past actions and your recent action. Too long, and your model might have trouble continuing or staying coherent.

Some tips for managing your Author’s Note:

-   **Condense rules into styles or themes**. If you’re telling the AI to slow down and not rush scenes in the Author’s Note, you could try something like `Style: Slow-paced` instead. Likewise, if you have a _lot_ of styles and themes listed, there may be an instruction that encompasses all of them.
-   **Only use as many instructions as strictly necessary.** Author’s Note can be a potent place to put instructions, but it is easy to let it get out of control and end up with a very large component. Try to trim any rules or instructions that don’t directly contribute to your story.

### **[Story Cards](https://help.aidungeon.com/faq/story-cards)****:**

Story Cards as a category do not take up a specific amount of Tokens, they instead occupy up to 25% of the context not being used for other Plot Components. Thus, they can easily end up taking up a lot of space if left unchecked, and often end up fighting with each other for limited context.

Some tips for managing your Story Cards:

-   **Check your triggers**. If your triggers are too broad, then you’ll find cards triggering all over the place, taking up more context than intended.

-   It may seem like a good idea to trigger the character Emily on `Em`, just in case you call her by her nickname, but that will also make her card trigger on things like Empire, Gems, Seem, Stem, Them… the list goes on.
-   Trigger words take spaces into account, so `format,them,like,this` the vast majority of the time.
-   Triggers are not case-sensitive and will trigger even if they’re in the middle of other words.

-   **Let the AI fill in the blanks**. If you want to describe every inch of a character’s appearance, then you absolutely can; however, don’t be afraid to be a little more loose with your descriptions. Does the AI need to know that her girly pink socks reach her knees, or can it just know she has pink socks? It depends on what is important to you and your story.
-   **Delete unnecessary information**. The AI is actually pretty good about knowing things that already exist, especially if those things are commonplace in media. You don’t have to tell it what a Lightsaber is—but you probably need to tell it about your special, personalized Lightsaber that you got from your mentor.

![icon](https://app.notion.com/icons/subtitles_gray.svg)

When in doubt about what an AI knows, ask it! Make a new Custom Quickstart game with the AI you want to play with, change the Instructions to tell it to answer all your questions, and then ask it what it knows.

_Hey AI, do you know what a Jabberwocky is? Tell me everything you know about Jabberwockies._

## What takes Priority?

If you don’t have enough Context in your adventure for all of your Plot Essentials, Story Cards, etc., then some components will automatically be cut off or removed.

When determining what to cut off when Context overfills, AIDungeon has two sections—`Required` and `Dynamic`.

`Required` elements include Instructions, Plot Essentials, Story Summary, Author’s Note, Front Memory (for Scripts), and the Last Action taken (or the last AI output, if the last action was a Continue action).

`Dynamic` elements include Story Cards, Memory Bank, and Story History (a.k.a. your past actions).

If Context has overfilled, AIDungeon first attempts to cut back on the Dynamic elements. The most common thing seen when going over Context limit is Story Cards being omitted, and then Adventure History.

If cutting the Dynamic elements is still not enough (or there are no Dynamic elements to cut), and the user is still over their Context limit, then the Required elements are reduced, in order of least to most priority.

If reducing one still leaves the user over Context, then the next will also be reduced, so on so forth, until the User is within their allotted context.

1.  **Story Summary** is the lowest priority component. If Context is still full, Story Summary will be the first component to be cut off or completely omitted.
2.  **AI Instructions** are second to reduce.
3.  **Plot Essentials** are third to reduce.
4.  **Author’s Note** is 4th to reduce.
5.  **Front Memory** and **Last Action** are never reduced—they are always fully required and will never be truncated.

[Click here to read more in depth about this system →](https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai)
