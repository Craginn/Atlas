---
title: "How are AI responses generated?"
source: https://help.aidungeon.com/faq/how-are-ai-responses-generated
scraped: 2026-11-25
---

# **How are AI responses generated?**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/d3761e10-7645-4592-a7f1-5cb6c9697f4e/fluent%3Abook-exclamation-mark-24-filled.svg)

**You don’t need to understand this to use AI Dungeon.** This article is intended to be a technical explanation, and may be a bit confusing for most people. We put this here to help users understand [Model Settings](https://help.aidungeon.com/faq/what-are-advanced-settings), experiment with the AI, and do more advanced Troubleshooting.

The process of generating an AI output is complicated but can be broken down into a few distinct steps:

### **Step 1: Interface sends the message.**

First, the Interface (the web or mobile app you’re using), sends the latest message you wrote to our server, then waits for the server to confirm that it’s received the message. This is why, sometimes, it can take a few moments for your message to leave the input field and appear as an action in the story above.

### **Step 2: Our server compiles it**

The server then compiles everything else that’s included with your story. Your AI Instructions (which are included as a system prompt to the AI you’re using), your [Plot Components](https://help.aidungeon.com/faq/plot-components), the [Story Cards](https://help.aidungeon.com/faq/story-cards) that were triggered, your [Memories](https://help.aidungeon.com/faq/the-memory-system?v=5b0e281118a24f18aeafaa5ac2332021), and all the recent story text that it can handle, including the action you just sent.

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

### **Step 3: The AI server Tokenizes the Text**

Before the AI can process your input, it needs to be turned into a numerical format the AI understands by a program called a “[Tokenizer](http://tiktokenizer.vercel.app)”, which converts the text into numerical values which represent words, parts of words, or phrases, known as “Tokens”. Once the Tokenizer is finished converting your message into tokens, those are passed into the AI model.

> **NOTE**: One token can be thought of as being, on average, 4 characters—but it depends heavily on the model. When you change the context and response length in the [Model Settings](https://help.aidungeon.com/faq/what-are-advanced-settings), the numbers you are setting are the total number of tokens used. This is why the actual amount of text the AI will see and respond with can sometimes seem “random”.

### **Step 4: The AI Does its Thing**

The AI takes the tokens it has been given, up to whatever amount of tokens you have it set to in [Model Settings](https://help.aidungeon.com/faq/what-are-advanced-settings), and puts them through a massive mathematical process called a Neural Net, a structure of tiny pieces of code with literally _billions_ of values called “weights”. These weights are what store the “knowledge” that the AI uses when generating text. The Neural Net basically steps through every Token it’s been given and creates a mathematical representation of what those tokens are, in the context of what sort of tokens might come next.

The Neural Net has data on the likelihood of the next token because it was created by analyzing a massive database containing **terrabytes** of publicly-available text, from novels, games, and other sources around the web.

Once the Neural Net has finished processing the tokens given to it, it produces its list of likely next words, along with the likelihood of them being the next one in the story, which it goes through with a statistical equation to select semi-randomly (or “sample”) a word from this list. This process can be greatly affected by your settings, like “Temperature”. This process is repeated until it has enough words to give an output, as determined by the _Output Length._

> **NOTE**: A simpler way of understanding it is like repeatedly using a giant, supercharged version of the predictive text keyboard used on phones… albeit one which can look back through over 16 text-messages worth of text, and requires a computer with quite a few times the resources of even a high-end gaming PC.

### **De-Tokenization, output, done!**

The AI server then turns the AI output back from numerical tokens into human-readable text, then sends it back to our server. On our server we do some more processing to make sure you get full sentences (unless _Raw Model Output_ is turned on in [Advanced Settings](https://help.aidungeon.com/faq/what-are-advanced-settings)), and rank the responses to try and determine which is the best response to return to you. The others are often stored as potential Retry options.

Our server puts it in a new action, and adds it to the end of your adventure’s story, then sends it to the app on your device, where the interface shows it as the next action. Then, you hit the send button, and the process begins anew.
