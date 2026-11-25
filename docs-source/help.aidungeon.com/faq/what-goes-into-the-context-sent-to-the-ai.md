---
title: "What goes into the Context sent to the AI?"
source: https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai
scraped: 2026-11-25
---

# What goes into the Context sent to the AI?

![icon](https://app.notion.com/icons/light-bulb_gray.svg)

Check out [this article](https://help.aidungeon.com/how-do-i-manage-context) to learn how to manage your context effectively!

Context is the data sent to the AI language models that is considered when generating your next action in AI Dungeon. The context in AI Dungeon is comprised of many elements, and this article will help describe how those elements are combined to create the context for each AI call.

If you don’t have enough Context in your adventure for all of your Plot Essentials, Story Cards, etc., then some components will automatically be cut off or removed.

When determining what to cut off when Context overfills, AIDungeon has two sections—`Required` and `Dynamic`.

`Required` elements include Instructions, Plot Essentials, Story Summary, Author’s Note, Front Memory (for Scripts), and the Last Action taken (or the last AI output, if the last action was a Continue action). In general, we attempt to include the full length of all Required Elements in the context when they are present.

If the sum of all tokens included in Required Elements exceeds 70% of the context size, we include the most important sections first, then trim or exclude other sections to fit within the 70% token limit. Front memory and Last action are always included in full. Until the limit is filled, we include (in priority order) Author’s Note, Plot Essentials, AI Instructions, and Story Summary. If a section doesn’t fit within the remaining tokens, we trim the end to fit. Any remaining elements of lower priority are not included at all.

`Dynamic` elements include Story Cards, Memory Bank, and Story History (a.k.a. your past actions). These require more flexible rules for how they are included.

Dynamic Elements will fill the remaining tokens in the context after accounting for the Required Elements. ~25% of those remaining tokens go to matching Story Cards, ~50% go to History (up to 75% if the Memory Bank is disabled), and ~25% go to the Memory Bank.

Story Cards are included based on how recently and frequently their triggers were used. Using these criteria, they are sorted and prioritized, and we include as many as will fit in the given space. When evaluating matches, we consider a **minimum** of 4 actions when looking at triggers. However, if more than 500 tokens are available for Story Cards, then we take the number of available tokens and divide it by 100. If there are 900 available tokens, we look at 9 recent actions for trigger matches. The number of included Story Cards depends on the relevance of matches and the length of each matched Story Card.

We attempt to use as much history from an adventure as we can. We start from the most recent action, which is always included no matter what, and add each previous action to the context, until the available context space is filled or we’ve included the entire history. Generally, this is ~50% of tokens available after Required Elements (or 75% if the Memory Bank is Disabled).

Memory Bank then uses the remaining tokens after History; generally, ~25% of tokens that remain after Required Elements have been included. Memory Bank retrieves memories from the Memory Bank that are ranked based on relevance to the most recent action. We add as many matching memories as we can that will fit within the tokens available for Memory Bank.

Once we’ve determined what to include in the context, it’s assembled in the following order and sent to the AI model for the next action generation:

1.  Instructions (sent as a system prompt)
2.  Plot Essentials
3.  Story Cards
4.  Story Summary
5.  Memory Bank
6.  History
7.  Author's Note
8.  Last Action
9.  Front Memory

If you’re curious, all of that context is sent like this, with objects in {curly brackets} being what you have in those fields.

```none
{Plot Essentials}
World Lore:
{Story Card Description 1}

{Story Card Description 1}

{Story Card 3}

Story Summary:
{Story Summary}

Memories:
{Memory 1}
{Memory 2}
{Memory 3}

Recent Story:
{Action 1}
> {User Input ('Do'/'Say') 1}
{Action 2}
> {User Input 2}
{Action 3}

[Author's note: {AuthorsNote}]
> {Last User Input} /OR/ {Last Action}
{Front Memory (for Scripting)}
```
