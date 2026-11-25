---
title: "What is the Memory System?"
source: https://help.aidungeon.com/faq/the-memory-system
scraped: 2026-11-25
---

# All About the Memory System

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/6917f8cf-cd31-4a56-bd87-3df4ca048b81/diamond.svg)

The `Memory System` is a new feature that automatically stores and retrieves key information from your Adventure, helping keep the AI on track. `Auto Summarization` and the `Memory Bank` make up the Memory System. [Press here to jump ahead and learn about how you can enable these features in your Adventure →](https://help.aidungeon.com/faq/the-memory-system#block-137b626177894a57abcfeb3ad6f7040f)

Memory is such an important part of AI Adventures. The [core promise of AI Dungeon](https://blog.latitude.io/heroes-dev-logs/10) is that you can have ultimate freedom to be who you want to be and that the choices you make truly matter. But if the AI forgets those choices after a few thousand tokens, then those choices actually become meaningless, breaking the power of that promise.

With the new Memory System, we’re taking an important step toward providing an experience in which the AI can more reliably recall important details of your plot and story, letting you create deeper, richer, and more meaningful Adventures in AI Dungeon.

![Example of the Memory System in the game screen featuring the Memory Bank in the Context Viewer and Auto Story Summary in the settings sidebar.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/8274019c-7b4d-4695-a180-4bd5b74a2bf6/Untitled.png?width=1600)

Example of the Memory System in the game screen featuring the Memory Bank in the Context Viewer and Auto Story Summary in the settings sidebar.

## How the Memory System Works: Overview

The Memory System has been adapted from [Voyage](https://blog.latitude.io/heroes-dev-logs) and utilizes various AI technologies, such as summarization models, embeddings, vectors, and embedding models. It’s made up of two major features: Auto Summarization and the Memory Bank.

### Major Technical Constraint: AI Context Length

One of the biggest limitations of using AI large language models is limited context length, which is the amount of information the AI can process when generating its next output. Each model has its own max context length limit, and we also have tier limits in AI Dungeon since the longer your context length is, the higher the cost for the AI to generate a response. Context length is a real, unavoidable constraint that we have to work within.

In AI Dungeon, we construct the context we send to the AI by combining text from your story with AI Instructions, Plot Essentials (formerly called “Memory”), Author’s Note, and relevant Story Cards. The AI processes this information and generates the next action in your adventure.

Eventually, the amount of content in your story exceeds the amount of text we can send to the AI. We have to cut portions of text, usually by removing the oldest parts of your story text. Since text is cut, it can feel like the AI is “forgetting” important details of your story since those details were unable to be sent to the AI.

The Memory System is meant to combat these context length technical constraints and provide you with a better AI experience during your Adventures.

### Inspired By the Human Brain

As we considered what information should be part of the Memory System, we found ourselves seeking inspiration from how the human brain works. When our brains store and recall information, we use two strategies. The first is by compressing memories, where we take a large chunk of information and distill it to remember the most important parts. The second is memory retrieval, where some memories stored in our brain only come to mind when they are relevant to our current context.

For instance, once you finish reading this paragraph, it’s unlikely that you’ll be able to recall it word for word in its entirety, but you’ll probably be able to recall the high-level concepts, big changes, and parts that matter to you. This is compressed memory.

You also have a retrieval system that will bring important memories to your mind when they’re relevant. If you hear the word “fire hydrant,” your brain retrieves memories about what a fire hydrant is. You might think of its color and shape, its function and purpose, or any specific memories you have involving one.

Both memory compression and memory retrieval are important parts of enabling your brain to remember what’s important and have the right context when it needs it.

These two features of our Memory System are extremely useful in AI Dungeon, too. The story equivalent to a compressed memory is summarization, which will compress a section of the story to just the high-level information about the setting, characters, and events. Being able to retrieve more detailed memories is important, too, since that lets the AI remember important details when they’re relevant in the current context.

### What are AI Dungeon Memories?

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/9cfcabe0-eec8-453d-ab62-2e21079087f6/check.svg)

The purpose of the Memory System is to compress, store, and retrieve memories to give the AI both a high-level perspective and the ability to recall specific details.

For AI Dungeon, a Memory is an AI-generated summary of a small set of your previous story actions. The summarized Memory retains key plot details but without the illustrative prose that is common in AI Dungeon adventures, making it more information-dense than the text of your adventure.

A new Memory is created by taking six of your previous actions (and the AI’s responses) and sending them to an AI model trained to summarize stories. This summary output from the AI is a Memory.

When starting a new adventure, we’ll wait until you are 12 actions deep into your adventure, and then we’ll summarize the oldest six actions (actions 1-6 of your adventure) into your first Memory. This means your first six actions will be summarized and stored as a Memory, but your most recent six actions are not. Then, after you take six more actions (now you’re up to 18 actions), we’ll summarize the previous 6 as a new memory (actions 6-12). This means your first 12 actions have been converted into two separate memories and your 6 most recent actions have not been. You are free to make edits or undo your last six actions without it impacting memories.

This cycle repeats indefinitely, and a new memory is created every six actions.

### Two Complimentary Features: Auto Summarization and Memory Bank

Memories are used by the two major features that make up the new Memory System: `Auto Summarization` and the `Memory Bank`. These two features work together to recall important information, giving the AI the ability to remember the high-level overview and to remember specific relevant details, just like our brains do.

The `Memory Bank` stores and intelligently retrieves relevant memories and includes them in the context. In practice, it acts like an automatic Story Card system since it saves important details from the story and then dynamically inserts them into the context when they are relevant to your current action. Whereas the Auto Summarization feature is meant to keep track of the overall plot and story direction, the Memory Bank might recall important details like your dog’s name, where you found the Sword of Demons, or that Rangers are allergic to horses and only ride cows.

`Auto Summarization` keeps a running overview of your story’s plot to help the AI track the overall direction of your story. We do this by summarizing your story every 15 actions, getting a general gist of the overarching story, and continuing to do so every 15 actions after that. While these actions are building up, we automatically use Memories to fill in the blanks, so every part of your story always stays completely tracked.

![How Auto Summarization works in practice. T= Turn. Memory steps in to fill the gaps that Auto Summary hasn’t had a chance to summarize yet.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/e2f247bf-4f92-48e8-9101-433f0ca67960/image.png?width=1600)

How Auto Summarization works in practice. T= Turn. Memory steps in to fill the gaps that Auto Summary hasn’t had a chance to summarize yet.

## How Auto Summarization Works

### New Plot Component: Story Summary

As mentioned, there is a new [Plot Component](https://help.aidungeon.com/faq/plot-components) called `Story Summary` where the Auto Summarization feature will store the summary it maintains for your Adventure.

![You can add Story Summary to Scenarios and Adventures through the ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/8020a879-1ff5-429a-a04b-2c526ecff5d2/Untitled.png?width=1600)

You can add Story Summary to Scenarios and Adventures through the `+ Add Plot Component` button.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/2564f4b9-5938-4ef6-858f-b1acae168342/plus.svg)

You can always add and use the Story Summary Plot Component to manually curate a summary of your Adventure or Scenario.

Like other Plot Components, the Story Summary can be used by our content creators for Scenarios. It could be used to include backstory information for yourself or other players to use (if you publish content), and it will be utilized by the Auto Summarization feature, if enabled in the Adventure.

![You can also add ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4e54daae-9c37-47ef-a2c3-66434deed7be/Untitled.png?width=1600)

You can also add `Story Summary` as a Plot Component during Scenario creation.

We’ve also added Story Summary to the Context Viewer so you can track how many tokens of context it’s using for each generation.

![See how many tokens your Story Summary takes up through the Context Viewer.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/aa2d154c-6244-4907-94c9-bffd42d30a42/Untitled.png?width=1600)

See how many tokens your Story Summary takes up through the Context Viewer.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/3bec797a-7e9f-4fc6-b4c6-5fe303eb527d/warning.svg)

**Important**: Story Summary may remove parts of your recent story context if it has already summarized them. This means that you may see your story using less context than intended—not to worry, your adventure is still fully represented! It’s just taking up less space.

### Auto-Updating the Story Summary

With Auto Summarization enabled, as you play, your Story Summary will regularly update itself with recent information and events, and phase out less important information as it goes. If the Story Summary gets too long, it automatically gets compressed. This will ensure that the Story Summary continues to be an information-dense overview of the entire story plot.

This process will continue throughout your adventure, with new information appended and then re-summarized immediately and automatically.

### Auto Summarization for Existing Adventures

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/3bec797a-7e9f-4fc6-b4c6-5fe303eb527d/warning.svg)

The Auto Summarization will work best for new Adventures since the summary feature will dynamically update from the beginning of the Adventure.

When Auto Summary is turned on in an existing adventure, it starts summarizing from the very beginning of the story, and every action or retry, it updates itself—rather than waiting 12 actions like normal. This happens again and again, until the Summary is fully caught up with your current action. After some time, it will be as though you had it on since the beginning!

### Summaries and Editing

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4b20d066-1516-4858-a831-d4b4684adacd/check.svg)

Even with Auto Summarization enabled, you can edit the Story Summary manually.

You may want to edit the automatically created summary to correct any errors or add additional clarifying details. Although the Auto Summarization overwrites your existing summary, your edits ARE sent to the summarization AI, so they should be incorporated in the new summary.

If you make changes earlier in your adventure, and those changes would have an impact on the summary, you’ll need to update the Story Summary manually.

This is due to the limitations and costs of the summarization AI model. Like all models, we are constrained by context size for the summarization. Many adventures would extend far beyond the available context limit, so regenerating a summary based on edits wouldn't be possible in many cases. Making new summarization calls for every historical change could also become very expensive.

## How the Memory Bank Works

### Embeddings and Vectors

To explain how the Memory Bank stores and retrieves relevant memories, you’ll need a basic understanding of embeddings, vectors, and embedding models.

**Embeddings** represent how similar words and phrases are by mapping them in a multidimensional space. They are created by passing text into specialized embedding language models, which return a vector of numbers as a result.

You can then do simple math to compare how similar different vectors are to each other. For example “water” would be more similar to “liquid” than it would be to “solid”. You can also compare phrases and questions. For example, “Who is Sir Theo?” might match closest with the phrase, “Sir Theo introduces himself to you as the knight who slew the evil dragon of Larion”. These two phrases might also match closely to other passages about Sir Theo or the dragon of Larion. But none of those phrases would likely match very closely to the phrase “Sarah was a forest ranger.”

This lets us build a memory retrieval system. First, we store a bunch of memories in the Memory Bank with both their text and the embedding vector of that text. Then, when we want to find relevant memories, we decide what text we want to use to look up memories (for our system, we use the most recent action). We get the embedding vector for that lookup query, and we compare it against all the vectors in our memory bank and get a relevance score.

A higher score means it’s more similar to the query, and a lower score means it’s less similar. This lets us decide which memories are relevant to the current events in your story and should be included in the context sent to the AI when generating the story.

Now, we’re ready to talk about AI Dungeon’s new Memory Bank Feature.

### Embedding Models: Storing and Retrieving Memories

With the Memory Bank, each Memory (an AI-generated summary of your six past actions) is embedded and stored. As you continue to take more actions, your Memory Bank starts to fill with more memories.

When you start a new story, your Memory Bank will be empty. As you take actions, and memories are created, they will begin to fill your available memory slots. Initially, no memories will be used since your entire adventure history will fit in the context. Once your story has reached the point where it can no longer fit your whole adventure into the context window, we start to retrieve memories from the Memory Bank. We do this by using an embedding model to rank all of your memories by relevance to your current story.

![You can see your Memory Bank through the Context Viewer. Here, the Memory Bank is starting to fill up, and memories are being used as the full Adventure no longer fits within the context window.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/a9f7be81-4b3a-4017-8473-351e6405674e/memories-fill.png?width=1600)

You can see your Memory Bank through the Context Viewer. Here, the Memory Bank is starting to fill up, and memories are being used as the full Adventure no longer fits within the context window.

Then, we take the most relevant memories and include them in the context being sent to the AI for the next action of the story. For example, if you are just returning to the town of Castlebrook, the AI will find all the memories related to Castlebrook, remember what happened the last time you were here, and include the most relevant in the context. These are called “Used Memories.”

![Use the ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4d7cf427-0e89-4472-bc1e-1271ab23998d/Memory-viewer.png?width=1600)

Use the `Explore Memories` button in the Context Viewer to see your memories. Then use the `Timeline` or `Relevance` tabs for different views of your Used and Stored Memories.

The Memory Bank will be allocated a portion of the context window, similar to how we allocate space to Plot Essentials, Author’s Note, and Story Cards. Based on the context space available, we’ll include as many of the top memories as will fit from your Memory Bank.

Once your Memory Bank has been filled and a new memory has been created, we remove the least used memories to make room for the new addition. These removed memories are called “Forgotten Memories”. Just like with human memory, very old memories might stay in the Memory Bank forever if they have been used frequently.

![Context Viewer showing the state where your Memory Bank is full and memories are being utilized, but some are being forgotten to make room for new ones.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/7c3ac114-3bf1-434e-80d9-4a031d83a1c0/forgotten_memories.png?width=1600)

Context Viewer showing the state where your Memory Bank is full and memories are being utilized, but some are being forgotten to make room for new ones.

The larger your Memory Bank (achieved through higher [Subscription tiers](https://help.aidungeon.com/memberships-benefits)), the more room you have to store memories that could be used in your story, increasing the accuracy of the AI storyteller.

As you play, the AI will continually curate the most important and relevant memories from your story and intelligently include them in the context being sent to the AI when they are relevant, improving the overall experience.

## How to Enable the Memory System

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/80dd26e2-392a-401b-ad63-495822fbd853/down-carrot.svg)

**You can toggle Memory Bank and Auto Summarization ON under the game screen settings sidebar by going to** `Gameplay` **→** `AI Models` **→** `Memory System`**.**

Once these features have been enabled in one Adventure, they’ll be enabled for every Adventure until you toggle them off again.

![Make sure to toggle ON the Memory Bank and Auto Summarization settings under the Memory System section before playing.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/6b7b0428-5855-4f78-8acc-b430ec6b5f73/Untitled.png?width=1600)

Make sure to toggle ON the Memory Bank and Auto Summarization settings under the Memory System section before playing.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4c9a18b0-de4d-4983-973e-7fbe51ea97a3/warning.svg)

Note: It may take a few turns for the Story Summary to show up as a Plot Component once Auto Summarization has been enabled, and it may take even longer for memories to start being stored in or used from the Memory Bank.

### How Your Membership Tier Affects the Memory System

All players have access to the Auto Summarization feature. For the Memory Bank, each tier has a set number of memories that can be stored:

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Membership Tier</span></div></td><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Memory Bank</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Free</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">25</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Champion</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">100</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Legend</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">200</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Mythic</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">400</span></div></td></tr></tbody></table>

### Key Differences from the Voyage Memory System

Those familiar with the [Voyage memory system](https://blog.latitude.io/heroes-dev-logs/11) will see similarities with this new Memory System for AI Dungeon. The work done on Voyage directly inspired and informed the new Memory System. There are some important differences and adaptations we made to implement it for AI Dungeon.

The Voyage experience is a much more traditional RPG experience. We track important stats like health, quests, inventory, levels, and player characteristics, which are stored in a “game state.” We didn't bring this part over since AI Dungeon is a collaborative storytelling experience.

We also made some adjustments to account for the different gameplay in AI Dungeon. We know you all value editing, a concept that isn’t as prevalent in Voyage, and supporting editing with the AI Dungeon Memory System required some adaptations.

> Want to play with health, inventory, quests and progression like you might find in a classic tabletop roleplay game? [Try Voyage](https://voyage.io/), our AI RPG platform, full of exciting characters that feel real and actions that lead to surprising consequences. It’s live on web and mobile, with no invite needed.

## Memory System versus Plot Components

If you’re one of our more experienced players, you know that through careful, manual editing of [Story Cards](https://help.aidungeon.com/faq/story-cards) and [Plot Components](https://help.aidungeon.com/faq/plot-components) (like [Plot Essentials](https://help.aidungeon.com/faq/plot-essentials) or [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note)), you can make sure important story details are still being included in the context.

This is still important, but not as crucial as it has been in the past. Now, these components can contribute to making the Memory System even better at its job by providing it with enough relevant information to accurately create summaries and store memories.

As we mentioned above, the Auto Summarization feature of the Memory System is supported by the new Story Summary Plot Component, which can be added and edited just like other elements in this category.

### Comparison Chart

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Plot Component/Feature</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px;background:var(--color-color-default)"><div class="notion-table__cell"><span class="notion-semantic-string">How to Use It</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">AI Instructions</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI a set of instructions about how to generate responses.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Story Summary</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI a summary of your story to help it remember broader plot details. Works with the new Memory System.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Plot Essentials</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI some key details about your story that it should always remember.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Author’s Note</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI short guidance about your story’s theme and setting.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Third Person</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Change “You” in Do and Say actions to your character’s name. Mostly recommended for Multiplayer games.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Story Cards</span></div></td><td style="min-width:519.9844360351562px;max-width:519.9844360351562px"><div class="notion-table__cell"><span class="notion-semantic-string">Give the AI some broader world-building details that are only included when keywords are used.</span></div></td></tr></tbody></table>

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/799515ae-5ce5-407c-bfc8-5813b82b089a/search.svg)

Information in AI Instructions, Story Summary, Plot Essentials, and Author’s Note will always be included in the context. Story Cards are added to the context when keywords are triggered. You can see how many tokens each element takes up through the Context Viewer. Ultimately, there aren’t strict guidelines about what information needs to be in each Plot Component. **We highly recommend playing around with all of them to see what works best for you!**

**[Read even more about the Memory System in AI Dungeon →](https://latitude.io/blog/how-the-new-memory-system-works)**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b92f6085-c518-444a-b404-e7a6dd419694/ic_round-discord.svg)

Remember: you can always get more information on any AI Dungeon subject by asking in [our official Discord server](https://aidungeon.com/discord).
