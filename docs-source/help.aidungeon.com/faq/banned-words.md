---
title: "What happened to Banned Words?"
source: https://help.aidungeon.com/faq/banned-words
scraped: 2026-11-25
---

# About Banned Words

We’ve deprecated the Banned Words feature in AI Dungeon. This change is being driven by both technology advancements (such as new models not supporting logit biases) and to improve the user experience in AI Dungeon. We believe the new [“AI Instructions” Plot Component](https://help.aidungeon.com/faq/ai-instructions) feature and improvements to our AI Safety systems will more directly address the player needs that Banned Words was built to solve.

This article will cover two topics: 1) how to control the AI to have the AI Dungeon experience you want and 2) why Banned Words was removed.

## Instruct the AI to Avoid Topics and Words

In the past, players used Banned Words to avoid having the AI generate certain words or topics. Examples include:

-   Avoiding cliche writing phrases
-   Blocking topics they weren’t comfortable with, such as witchcraft or sexual content
-   Maintaining story consistency, like preventing the AI from mentioning modern technology in a historical fantasy story

This can be done more effectively through [AI Instructions](https://help.aidungeon.com/faq/ai-instructions) and [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note). Each of these can be added and edited from the Adventure or Scenario settings under the “Plot” tab through the `+ Add Plot Component` button.

### AI Instructions

AI models can accept instructions that impact how they behave. For instance, we use model instructions to guide the AI to respond in a text adventure format. These are some instructions we’ve used:

```none
You are an AI dungeon master that provides any kind of roleplaying game content. Instructions:
- Be specific, descriptive, and creative.
- Avoid repetition and avoid summarization. 
- Generally use second person (like this: 'He looks at you.'). But use third person if that's what the story seems to follow. 
```

Model instructions are one of the first things sent to the AI. For some models, they are formatted in a unique way to ensure the AI follows the directions they contain. So, you can use the model instructions to solve some of the issues described above. For instance, you might add lines like:

-   Use unique phrasing and language. Avoid common phrases and cliche tropes.
-   Keep the story centered on topics and themes that would be appropriate for a younger audience
-   This is a historical fantasy. Only use technology, tools, settings, and locations that would have been present during the Middle Ages. Swords, knights, castles, etc.

One thing to pay attention to is that the AI doesn’t always respond well to “don’t talk about this” sorts of instructions. Think of AI language models like a probability machine. If you say “don’t think about the blue banana”, it might have a hard time forgetting about blue bananas. **It’s better to instruct with what you want it to stick to, like the examples above.**

### Authorʻs Note

In addition to AI Instructions, using the Authorʻs Note component can help you steer the AI in the direction youʻd like. Authorʻs Note is inserted near the bottom of the context, which means it can have an outsized influence on how the AI generates the story. **Our recommendation is to keep Authorʻs Note short, no more than 3 or 4 sentences, and only focus on the key instructions you want the AI to follow.**

If AI Instructions is like talking to a customer support rep, Authorʻs Note is “Can I speak to the manager?” **Try to address most issues in AI Instructions, and use Authorʻs Note only when the AI Instructions isnʻt accomplishing what you need.**

You can use Authorʻs Note in a similar way to the AI Instructions. Just remember to keep it brief and only focus on the most important instructions for the AI.

## Why Banned Words was Removed

To better understand why Banned Words was removed, let's explain how the feature worked and why this implementation of Banned Words made it ineffective in solving the problems players were trying to use it for.

### Some Technical Background

The way that Large Language Models (LLMs) work is they calculate the statistical likelihood of the next word or phrase in a sequence. In some ways, LLMs function like extremely sophisticated auto-complete engines.

So, if we take a hypothetical sentence fragment like: “I’m afraid of the…”, a language model would predict the next most likely word based on previous words preceding this (is this part of a horror story? or a child saying what their worst fears are?) as well as predictions based on a broader set of writing that the model was trained on. Multiple responses are scored and ranked: dark (5%), monster (3%), possibility of failure (1%), etc. Then, the model will choose a response (not always the top-scoring response; this is where Temperature, which is a randomness setting, plays in).

There’s another layer of complexity to this which is that LLMs aren’t actually calculating the probability of words, but “tokens”. Tokens are words, fragments of words, or even short phrases. To make the LLM more efficient, language is broken up into tokens which reduces the overall number of phrases the AI needs to be aware of.

What logit bias does is change the scoring of specific tokens, and deprioritizes them. It may not completely remove the likelihood of the tokens from showing up, but it reduces the chances significantly.

### Why Logit Bias Isn’t a Good Solution

The problem is that since logit bias is based on tokens, it doesn’t work the way players expect. For instance, if you wanted to block the word “car”, “car” might be a token, but “Car “ capitalized with a space could be a different token, meaning that could still be allowed resulting in outputs containing the word car. Since “car” is a token that’s part of other words, it could result in words like “cartoon,” “carry,” and “scar” might also be deprioritized, which is an unintended and undesirable consequence from trying to ban “car”.

Most AI Dungeon players don’t understand how tokens work, and even fewer take the time to analyze every possible token that would cover the topics they want to avoid. Because of this, players would expect certain subjects to be avoided, only to be frustrated when they still showed up (since they didn’t correctly call out the correct tokens to block).

Additionally, newer models are no longer supporting logit bias. This means that banned words had zero effect on outputs for newer models.

This is why we feel AI Instructions are a better solution. It allows control over the output without negative consequences. Because instructions are based on actual language and not tokens, players will see better alignment between what they want and what the AI produces. Newer AI models are also being trained to respond well to instructions, making AI Instructions a more modern solution to the problem.
