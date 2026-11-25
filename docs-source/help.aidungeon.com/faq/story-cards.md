---
title: "What are Story Cards?"
source: https://help.aidungeon.com/faq/story-cards
scraped: 2026-11-25
---

# All About Story Cards

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/0f4ca170-e24d-4f8a-a3d6-cfbb35c16fb7/down-arrow.svg)

[Press here to jump down to the section about generating Story Cards →](https://help.aidungeon.com/faq/story-cards#block-7048a88c2ac24cde929106e46338d837)

## **What Are Story Cards?**

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/7025083c-eeea-4ce8-841e-8d85c0bdc86f/four-shapes.svg)

`Story Cards` are notes for the AI about characters, locations, concepts, or any other elements of your story.

The AI only consults Story Cards when they become relevant. Their relevance is determined by keywords called Triggers. Story Cards only go into context when their Triggers occur in the input or output, and they stay activated for a variable period depending on your context size.

Story cards also used to be called ‘World Info’.

## **When Should I Use Story Cards?**

You don't have to use Story Cards to enjoy AI Dungeon; they're optional. But if you're willing to take the time to add Story Cards to your Scenarios and Adventures, they can help the AI maintain consistency and add depth to your story. How you use this powerful tool is up to you, but here are some suggestions:

### Capturing Elements

As you play, you might encounter something intriguing in your story: a character, a place, an idea. If you want the AI to remember everything about this element after it scrolls out of the context window, you can create a Story Card for it, manually entering what you think is important for the AI to know the next time it comes up.

### Fleshing Out Elements

The AI might mention a person or place without providing much detail. If you want to expand on this element, one way is to create a Story Card for it. You can either write the details yourself or use the [Story Card Generator](https://help.aidungeon.com/faq/story-cards#block-7048a88c2ac24cde929106e46338d837) to help you. That way, the AI will have more to go on when writing about the newly detailed element.

### Preliminary World-Building

Before you start playing, you might want to set up a story world filled with places, people, things, and concepts to use in your Adventure. Story Cards allow you to create this framework, ensuring the AI has access to your custom world-building.

By using Story Cards effectively, you can create more immersive and coherent narratives in which the AI can call up information at just the right time. However, while using Story Cards at a basic level is easy, mastering them takes time.

## **How Story Cards Work**

All Story Cards need to be set with Triggers—words or phrases that signify that this information is now relevant. Triggers are usually Proper Nouns, but can really be anything.

When a Trigger appears in the AI's output or the player's input, the corresponding Story Card's Entry is added to the context sent to the AI.

**Triggers are not instant**—if an AI triggers a story card in the middle of its response, it won’t have access to that Story Card’s details until the next output.

Note that only the Entry is shown to the AI, and it is prefaced by the phrase "World Lore:". This allows the AI to incorporate the information into its responses for as long as the Card stays in context.

As mentioned, Story Cards are active for a variable number of turns after being triggered depending on the context window size, and they can be triggered by both player inputs and AI outputs.

**AI also does not know Story Cards exist**. It does not know to look for them unless their Triggers have occurred. All it knows, when a Card is activated, is that its context now includes this information.

## **Anatomy of a Story Card**

Each Story Card consists of:

1.  **Type**: Relevant for [Character Creator](https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds) Scenarios, in which case it determines whether the card is available for character selection. Otherwise, the Type is not important and is not visible to the AI writing your story—but the Story Card Generator may use it for reference on what to generate.
2.  **Name**: For your reference only; the AI cannot see the Name of a Story Card.
3.  **Entry**: This is the core information that gets sent to the AI when the card is triggered. Over the history of AI Dungeon, opinions about optimal formats for cards have varied widely. You can and should experiment with formats, but there is no evidence that there is any downside to using plain English, as long as you are concise to save context space. You will find more detailed advice about what to put into the Entry field in the section "[Best Practices for Using Story Cards](https://help.aidungeon.com/faq/story-cards#block-b7eba096b8af4e4d988c8a6971482c19)" below.
4.  **Triggers**: Words or phrases that cause the Entry information to be sent to the AI. Triggers are case-insensitive, but sensitive to leading and trailing spaces. A more detailed explanation of Triggers is provided below under “[How Story Cards Work](https://help.aidungeon.com/faq/story-cards#block-b57e25b498fc482e8b729b8533bca645),” and suggestions for trigger composition are provided in the “[Best Practices for Using Story Cards](https://help.aidungeon.com/faq/story-cards#block-b7eba096b8af4e4d988c8a6971482c19)” section.
5.  **Notes**: The AI does not see the Notes of a Story Card. Its only use is in [Character Creator](https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds) Scenarios, where it is shown to the player as the description of an option that may be chosen in the character selection process. In that case, it can be useful if you want to show the player a shorter or otherwise different version of the option's Entry description.

1.  It can also be used for your own reference, if you want to make any notes in a Story Card that you don’t wish the AI to see.

7.  **Player Preview**: Available to Creators making Story Cards for their published Scenarios. Here, you can enable a Story Card to contain Spoilers, which will hide it from Players who look at your Scenario page.
8.  **Command**, which helps you generate Story Cards using AI.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/44503dbb-d063-42d1-b852-117d59e9af11/image.png?width=1600)

## **Story Card Management**

Story Cards are editable at any time, even after starting an Adventure. You can (and should) update them to reflect changes in your story.

You can export and import Story Cards to use them in different Adventures, Scenarios, or branches within Multiple Choice Scenarios (only possible from a browser). [Learn more about importing and exporting Story Cards →](https://help.aidungeon.com/story-cards-import-and-export)

There is a hard cap of 5,000 Story Cards per Adventure/Scenario, though most people will never reach nor need that level of cards.

## Best Practices for Using Story Cards

1.  **Composing Entries**:

-   Use plain English with natural syntax. Use short, simple sentences and unambiguous language, but be thorough.
-   Be brief to save context space. Story Cards are among the first elements to be removed from the context when it is full.
-   Place the most important information at the beginning and end of the Entry. The AI has a bias towards information in these positions.
-   Mention the name of the thing you're describing. Remember: the AI does not see the Name, so it needs to be able to tie the description to the name in some way.
-   Avoid excessive detail in physical descriptions—the AI will either not use it at all, or may repeatedly mention it, over and over again.

3.  **Effective Use of Triggers**:

-   Separate Triggers by commas, generally without spaces, like this: `Amanda,your daughter`. Triggers are sensitive to spaces, so `Amanda` is distinct from `Amanda`.
-   Be cautious with short Triggers that could be part of common words. For example, `cat` occurs in `catalog`, but `cat` does not. However, `cat` also will not trigger on `cat.`.
-   Consider using truncated words as Triggers to catch both singular and plural forms. For example, `boat` will also trigger on `boats`.

5.  **Balancing Information**:

-   Aim for Story Cards to activate only when needed, rather than taking up space all the time. This is mostly a question of designing Triggers that only occur when relevant. The safest trigger types are, therefore, proper names.
-   Since the AI doesn't know whether you have zero or 1,000 Story Cards, you have to get them into context for them to be used. One way to do this is to have Story Cards refer to each other through Entry information. By doing this, you can create a network or branching structure. For example, sub-locations, or characters tied to other characters.

-   `Amanda’s best friend is Jeremy, and they often visit Fossil Garden together.`

## How to Generate Story Cards

You can use AI to generate Story cards if you don’t want to manually write them.

![A live generation walkthrough: review Command settings, enter a Name and Triggers, then generate the Entry.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/0cabf243-9a67-4c02-8715-82fd2c7fff08/story-card-generation-v1.gif?width=1000)

### Command

When creating Story Cards, you’ll find a “Command” tab at the top of the popup menu that contains different options to customize your AI-generated cards. **We recommend starting in this tab so you can adjust these settings before diving into Story Card creation.**

![The Command tab showing a custom command with the required title placeholder, Entry Formatting, Additional Generation Context, and generation settings.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/96dfe99c-4b44-4acb-a43e-7e87fa9945ff/story-card-command-v1.png?width=1600)

1.  **Story Card Command Preset:** Choose a built-in command, use a saved command, or write your own custom command. Use **Save/Update** in the preset dropdown if you want to save a command for reuse. These presets are separate from the AI Instructions sets used to guide your story’s responses.
2.  **Story Card Command:** Tell the AI what kind of Entry you want it to create and customize the AI-generated output. Your command must include `{{title}}`, which is replaced with the Name of the card you’re generating. You could include:

-   Notes about story style, tone, content preference, or language inspiration.

-   Examples: “Describe {{title}} in a noir style with short, punchy sentences” or “Describe {{title}} using flowery, poetic language inspired by Victorian-era literature.”

-   General preferences you’d like the AI to follow when creating new cards.

-   Examples: “Describe {{title}} as a morally ambiguous character” or “Describe {{title}}, emphasizing the location’s magical elements.”

-   Specific instructions about the content you’re going for.

-   Examples: “Describe {{title}}, a type of knight that uses unconventional weapons” or “Describe {{title}}, a character from a Japanese comedy, emphasizing quirky personality traits.”

-   Any other directions you want the AI to follow when generating new Story Cards.

-   Examples: “Describe {{title}}, incorporating elements of steampunk technology” or “Describe {{title}}, including a hidden secret or mystery.”

You can keep your command short or include multiple instructions at once—it’s up to you! Play around with it and see what works best for your creation style.

4.  **Entry Formatting:** Choose **None**, **{}**, or **\[\]** to leave the generated Entry unwrapped or enclose it in curly braces or square brackets.
5.  **Additional Generation Context:** Provide additional key details about your story for the AI to consider while generating new cards. You could include:

-   Crucial aspects of your story’s setting and lore.
-   Background information about your character and their companions.
-   Relevant locations, events, symbols, objects, or organizations.
-   Unique magical systems or technological advancements in your story.
-   Anything else you feel is important enough to remind the AI about while it builds out more of your world.

7.  **Log Generations in Notes:** When you generate a replacement for an existing Entry, this setting keeps the previous Entry in Notes so you can recover or combine details you liked. The first generation of a blank Entry has no previous text to log.
8.  **Speed Create Mode:** Quickly create multiple Story Cards in a row by turning on this setting. When enabled, the “Finish” button changes to “Next,” so you can simultaneously save your current card and make a new blank card of the same type. If you love getting into a creative flow and writing many different types of cards at once, this is for you!

The Story Card Command and Additional Generation Context are tied to the Adventure or Scenario you’re working on, so check them when you switch stories. You can reuse a saved command preset instead of rewriting the command each time.

**The generator uses your selected story model and the story-context system.** Normal context limits apply, and generation may use Credits depending on your model and context settings.

### Details

After adjusting your Command settings, switch back to the “Details” tab to start creating Story Cards!

1.  **Type:** Choose from the default options—“Character,” “Class,” “Race,” “Location,” or “Faction”—or choose “Custom” to create your own Type (e.g. Lore, Item, Event, Spell, Weapon, etc.).
2.  **Name:** Type in the Name of your card before generating an Entry. The generator uses this Name wherever your command includes `{{title}}`.
3.  **Entry:** Type in your own Entry or use the **Generate Entry with AI** button to create one based on the Name, current command, and available story context.
4.  **Generate Entry with AI:** Use this button to create an Entry or regenerate an output that doesn’t work for your story. Review the result and make any changes you want before finishing the card.
5.  **Triggers:** Add related words or phrases in a comma-separated list so an unpinned Story Card can activate when relevant to your story. After generating, check that the Triggers match the Name and any other references you want to activate the card. [Learn how to effectively use Triggers →](https://help.aidungeon.com/faq/story-cards#block-8a487933467748659abb10017a8646ba)
6.  **Notes:** Leave notes about the Story Card that aren’t part of its Entry. If **Log Generations in Notes** is on under Command, previous Entries are saved here when you regenerate, so you can hand-pick which information you want to keep. Notes are not included as the card’s lore during ordinary story generation, but can be shown to players during [Character Creator](https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds).
7.  **Finish/Next:** Move on to creating new cards with this button in the top right corner.

-   **Finish:** Saves your work and closes the Story Card creation process.
-   **Next:** Shows up in place of “Finish” if Speed Create Mode is on under Command. This lets you simultaneously save your current card and make a new blank card of the same type.

9.  **•••:** This button in the top left corner has several options:

-   **Finish and Start New Card:** Save your work and seamlessly continue creating Story Cards without returning to the main menu (similar to “Next” when Speed Create Mode is on).
-   **Finish and Close:** Save your work and exit the Story Card creation process. Use this option when you’re ready to go back to the previous menu.
-   **Duplicate:** Make a copy of the current card.
-   **Delete:** Remove a Story Card you’re not satisfied with and close the Story Card creation process.

For Scenario cards, **Player preview → Contains spoilers** covers the card’s Name, Type, and Entry on the Scenario page until a player chooses to reveal them. It does not prevent the AI from using the card or make its contents private.

## Best Practices for Story Card Generation

-   **Provide enough information:** Fill in the AI Instructions and Story Information so the AI has enough details about your story to create the cards you’re looking for.
-   **Keep things updated:** Frequently update those sections to ensure you’re creating the most story-accurate cards possible.
-   **Use the right Type:** Pick a Type from the dropdown menu that matches what you're asking for under AI Instructions to help the AI create cards that fit your story better.

## **Troubleshooting and FAQs**

-   Placeholders (e.g., `${What is your gender?}`) will also work in Story Cards! You can use ${placeholders} in your Story Cards for extra customization when players play your Scenario.
-   If an Entry is very long, the AI might not relay all the information contained in it. This is because the AI generally won't talk about things in a Story Card for multiple outputs, and if your Card is longer than your output length, the AI will pick and choose just some of the information provided. Generally, you shouldn't expect the AI to always use all the information in a Story Card, unless it is very short.
-   Remember to use the Context Viewer to see if your cards are activating as desired or if some cards are activating when they shouldn't be. It's very common to mistakenly write Triggers that occur at the wrong times.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/7bf20d6a-b6ad-465f-bf36-5effd0b311d1/ic_round-discord.svg)

Please contact us on [our Discord](https://aidungeon.com/discord) if you have feedback about this guide or ask in the ⁠[#community-help](https://discord.com/channels/903327676884979802/910256760940531836) channel for additional advice.

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/b92f6085-c518-444a-b404-e7a6dd419694/ic_round-discord.svg)

Remember that you can always get more information on this, or any subject, by asking on [our official Discord Server](https://aidungeon.com/discord).
