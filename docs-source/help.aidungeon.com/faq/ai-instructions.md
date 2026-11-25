---
title: "What is AI Instructions?"
source: https://help.aidungeon.com/faq/ai-instructions
scraped: 2026-11-25
---

# All About AI Instructions

AI models can accept a set of instructions that influence their behavior. Up to this point, we’ve used backend model instructions to guide the AI to respond in a text adventure format. Now, this is built into AI Dungeon Scenarios and Adventures so you can add your own custom instructions and direct AI models in even better ways.

![We used special AI Instructions to create our funny test model, Mixtral Duck. Story text can be read via screenreader through the toggle below.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b1fc7f76-4cfc-427a-bc31-5e1659607124/MD_AI-Instructions.png?width=1600)

We used special AI Instructions to create our funny test model, Mixtral Duck. Story text can be read via screenreader through the toggle below.

Story text from Mixtral Duck instructions

You are Zany, an adventurer living on the edge of the medieval kingdom of Larion. You have a backpack of supplies and a pet duck named Zuck.

One day, the town square's prized golden fish statue goes missing. The king calls upon you and your feathered friend to quack the case wide open. Quack, quack! You and Zuck set out on a grand adventure through the kingdom of Larion. A mystery, you say? The golden fish statue, gone? Intriguing, very intriguing. You've never encountered such a peculiar situation. Quack! You and Zuck exchange quizzical looks. A mystery, indeed. You ponder the possibilities as Zuck excitedly waddles around you, creating ripples in the water with his little webbed feet. Maybe it's a cunning theft by the notorious Bandit Beavers! Or perhaps it's a clever ploy by those mischievous Pond Pirates.

_\> You investigate._

Quack! Wise decision! As Zany, the adventurer, you begin your investigation with Zuck by your side. You start by questioning the townsfolk and searching for any clues that might lead to the missing golden fish statue. Quack, quack! Zuck seems to sense something and waddles towards a patch of reeds nearby.

## How to Add AI Instructions

We’ve set up this feature to function like other [Plot Components](https://help.aidungeon.com/faq/plot-components), so you can add AI Instructions from the Scenario or Adventure levels with the `+ Add Plot Component` button.

![You can add AI Instructions during Scenario creation with the ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/e38c6f8d-18c1-41e6-832c-192dc9306d39/AI-Instructions_Scenario.png?width=1600)

You can add AI Instructions during Scenario creation with the `+ Add Plot Component` button under the “Plot” tab.

![You can also add AI Instructions to an Adventure through the in-game settings sidebar ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/6a8bc0da-3ba1-47b6-958f-c05055bb943d/AI-Instructions_Adventure.png?width=1600)

You can also add AI Instructions to an Adventure through the in-game settings sidebar `+ Add Plot Component` button under the “Adventure” → “Plot” tabs.

If you don’t want to start with a blank slate, use the `+ Insert Default` button when creating or editing a Scenario to populate the section with an example of our default instructions. From the Adventure level, use the `+ Insert Example` button to do the same.

![Use ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/ae8a1ec1-cbfd-4a78-8596-95081b35e6f8/Scenario_Insert-Default.png?width=1600)

Use `+ Insert Default` from the Scenario settings to start with a set of example instructions.

![Use ](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/c22a58d7-2975-49c4-98e6-401830b934e5/Adventure_Insert-Example.png?width=1600)

Use `+ Insert Example` from the Adventure settings to do the same.

Like other Plot Components—such as [Plot Essentials](https://help.aidungeon.com/faq/plot-essentials) or [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note)—AI Instructions are **not** required to create a Scenario or play an Adventure, but having good instructions can help keep the AI on track, which leads to more coherent and consistent gameplay.

## Saving and Reusing AI Instructions

Found a set of instructions you like? You can save it to your account and reuse it in other Adventures and Scenarios instead of copying it by hand each time.

1\. In the _AI Instructions_ Plot Component, and enter the instructions you want to keep.

2\. Open the instruction selector and choose _Save/Update._

3\. Give your set a name, then select _Save_.

You can save up to five sets, with names up to 32 characters long.

To reuse a set, just select it from the AI Instructions dropdown in any Adventure or Scenario. Applying it replaces the current instruction text, so be careful!

Editing instructions in an Adventure or Scenario doesn’t automatically update your saved set, or copies you’ve applied elsewhere.

To update a saved set, choose _Save/Update_, enter the existing name, and confirm _Overwrite_. Use the pencil or trash icon beside a saved set to rename or delete it. Deleting a saved set doesn’t erase instructions already copied into stories.

## How to Use AI Instructions

AI Instructions are extremely powerful. You can use them to control anything from the:

-   Writing style (want an H.P. Lovecraft vibe?)
-   Conflict level
-   Events in your story
-   Character behavior
-   Point of view (first, second, third person)
-   Much more

You can also use instructions to solve common issues like:

-   Avoiding cliche phrases (if a sense of dread washes over me one more time...)
-   Avoiding repetitive phrases
-   Avoiding other common tropes

Model instructions are one of the first things sent to the AI during prompt construction. For some models, they are formatted in a unique way to ensure the AI follows the directions they contain. So, you can use the model instructions to solve some of the issues described above. For instance, you might add lines like:

-   Use unique phrasing and language. Avoid common phrases and cliche tropes.
-   Keep the story centered on topics and themes that would be appropriate for a younger audience
-   This is a historical fantasy. Only use technology, tools, settings, and locations that would have been present during the Middle Ages. Swords, knights, castles, etc.

One thing to pay attention to is that the AI doesn’t always respond well to “don’t talk about this” sorts of instructions. Think of AI language models like a probability machine. If you say “don’t think about the blue banana”, it might have a hard time forgetting about blue bananas. **It’s better to instruct with what you want it to stick to, like the examples above.**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/c3865dbf-d90b-49b8-9200-4be45f1092df/warning.svg)

Remember: AI Instructions is part of the total context. Longer custom instructions will take up more tokens and should be used sparingly if you have limited context.

## Types of AI Instructions

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/4a496011-192d-431e-95f7-04be919603d2/Untitled.png?width=1600)

### Model Default

Our built-in, default model instructions (which may vary between different models) can be accessed through the in-game Adventure settings. Once you add the AI Instructions card, use the dropdown to select `Model Default`. Changing your AI model under the “Gameplay” tab brings up other default model instructions.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/99d7d299-f1fb-4b83-a516-68930c5e06d0/Untitled.png?width=1600)

Editing the Model Default instructions automatically turns them into Custom instructions.

If the AI Instructions component hasn’t been added to a Scenario or Adventure, our default model instructions will always be used.

### Example Model Default Instructions

_Note: Because of model limitations, optimal AI Instructions may differ wildly. Instructions may be more beneficial to some models than others. We recommend testing and seeing what works for yourself._

Example 1

```none
You are an AI dungeon master that provides any kind of roleplaying game content.

Instructions:

- Be specific, descriptive, and creative.
- Avoid repetition and avoid summarization.
- Generally use second person (like this: 'He looks at you.'). But use third person if that's what the story seems to follow.
- Never decide or write for the user. If the input ends mid sentence, continue where it left off. ">" tokens mean a character action attempt. You should describe what happens when the player attempts that action.
- Make sure you always give responses continuing mid sentence even if it stops partway through.
```

Example 2

```none
you are capable and well-practiced with all text. read all context given to you by the user before responding, then continue and advance the story of the provided excerpt like it never ended, forming new plot, word choice, sentence structure, so on. follow these rules:
- use present tense, second person, pick up on what the author intended
- evoke an immediate connection between reader and main character
- when a character is introduced in a scene, add memorable details
- convey emotion with sentence structure and personalized narration
- create conflict, challenge and struggle
- ensure realistic lifelike dialogue that matches personality, backgrounds and past
- in dialogue, break typical grammar rules and sentence structure to express unique voices and mannerisms
```

### Scenario Default

When AI Instructions are added on the Scenario level, every resulting Adventure will have `Scenario Default` instructions available as an option through the in-game Adventure settings:

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/3b8b2fd5-a001-460f-803a-5b00be4a50e2/Untitled.png?width=1600)

Editing the Scenario Default instructions automatically turns them into Custom instructions.

### Custom

Whenever you add your own instructions or edit the Model and Scenario instructions, these will be labeled `Custom` under the in-game Adventure settings:

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/1f8ed2f8-b018-4cf7-948e-9d8fb16304be/Untitled.png?width=1600)

A blank custom instructions component will function differently than no instruction component (which falls back to our default model instructions), so you may end up with a pretty funky story if custom instructions are added but not filled in.

**Before deleting the AI Instructions component, save any custom instructions you want to keep. Instructions you haven’t saved will be lost.**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/7de1fb64-f64c-412d-9e4a-1bd8b08c14fa/warning.svg)

Remember: the AI will do its best to follow whatever you add to Custom instructions. Keep this in mind if you start running into strange bugs—you may just need to adjust your custom AI Instructions.

### Where To Find Custom Instructions

Our community has been playing around with custom AI Instructions for some time now, and they’ve made some amazing things.

On our [Model Differences page](https://help.aidungeon.com/ai-model-differences), you can find some examples of community-made, custom AI Instructions that work for specific models. You can look at these instructions for tips and tricks, or use for yourself!

For other specific sets or for help with your instructions, check out our [Discord](https://aidungeon.com/discord), as there is a whole channel dedicated to sharing instructions!

## Author’s Note versus AI Instructions

Up to this point, you may have been using [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note) to accomplish what AI Instructions can now do more easily. **But, both components can be used together to guide the AI into generating a coherent story.**

While AI Instructions are included toward the beginning of the context, Authorʻs Note is inserted near the bottom, which means it has more of a direct influence on how the AI generates outputs. You shouldn’t add too much information here, or the AI is likely to focus on those details instead of what happened most recently in your Adventure. **Our recommendation is to keep Authorʻs Note short, no more than 3 or 4 sentences, and only focus on a couple of key instructions about your story’s theme and setting that you want the AI to follow.**

If AI Instructions is like talking to a customer support rep, Authorʻs Note is “Can I speak to the manager?” **Try to address most issues in AI Instructions, and use Authorʻs Note when the AI Instructions isnʻt accomplishing what you need.**

### Comparing AI Instructions and Author’s Note

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">AI Instructions</span></div></td><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Author’s Note</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">List of general directions the AI should follow when generating new outputs.</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Short list of 3-4 key instructions the AI should follow when generating new outputs.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Could be used for story instructions, style guidance, plot outline, topics/words to avoid, or description commands.</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Could be used for specific scene instructions, setting guidelines, or theme reminders.</span></div></td></tr></tbody></table>

## Banned Words versus AI Instructions

The Banned Words feature has been deprecated. Many of you have noticed that the banned words system hasn’t worked well (due to issues with token conversion and logit bias not being supported on many modern models). We believe AI Instructions will be more effective at helping you guide the AI away from words and topics you wish to avoid. [Read more about this change →](https://help.aidungeon.com/faq/banned-words)

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/de354cae-bcc1-4203-8a89-2804977e0b4d/wrench.svg)

Ultimately, there aren’t strict guidelines about what information needs to be in each Plot Component. **We highly recommend playing around with AI Instructions to see what works best for you!** As you find awesome instruction combinations, share them with the rest of the community on our [Discord](https://discord.gg/dkuFNzetZ9) or [Reddit](https://reddit.com/r/aidungeon) so we can all level up our story quality.
