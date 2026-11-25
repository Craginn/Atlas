---
title: "Creating Multiple Choice Scenarios"
source: https://help.aidungeon.com/faq/how-do-scenario-options-work
scraped: 2026-11-25
---

# Creating Multiple Choice Scenarios

### How Multiple Choice Works

**Multiple Choice** is an advanced [Scenario](https://help.aidungeon.com/faq/what-are-scenarios) _[](https://help.aidungeon.com/faq/what-are-scenarios)_feature which allows creators to add choices at the beginning of a Scenario, allowing for many different Adventures to be created from one Scenario.

When a Scenario is Multiple Choice, it will start by give the player a menu from which to select from a set of Options, which each lead to Sub-Scenarios with their own Prompt.

These Sub-Scenarios are effectively complete Scenarios in their own right, except they are only accessible from their parent Scenario. Scenarios can have a virtually unlimited number of options, and a virtually unlimited number of sub-levels—the customization is endless.

![An example of this is the Quick Start Options, which first prompts the player for a genre, such as “Fantasy”, and then prompts the player for a character in a fantasy world, such as a “Noble”. That leads to starting an Adventure as a Fantasy Noble. By playing that same Scenario again, you could pick ‘Cyberpunk’ and ‘Cyborg’, and get a completely different experience.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/d2801f4c-cff8-41fd-880b-4d6c9b24c5bf/image.png?width=1600)

An example of this is the Quick Start Options, which first prompts the player for a genre, such as “Fantasy”, and then prompts the player for a character in a fantasy world, such as a “Noble”. That leads to starting an Adventure as a Fantasy Noble. By playing that same Scenario again, you could pick ‘Cyberpunk’ and ‘Cyborg’, and get a completely different experience.

### Using Multiple Choice in your own Scenarios

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/37b3eb19-433e-47f3-bf06-ddde833a99d9/ic%3Aoutline-plus.svg)

**To create a new Scenario Option,** create or edit any Scenario and go to the Plot tab. Where it says ‘Opening: Story’, hit the gear icon ⚙️ to open a menu. You should see Multiple Choice and [Character Creator](https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds). Select Multiple Choice, and then follow along below!

When your Scenario is Multiple Choice, you’ll see, by default, two choices. You can add more choices by hitting `+ Add Choice` below them. You can also add sub-choices to these choices, by clicking the wrench button beside the choice you want to have more options for, and clicking `Add Choices to ...`.

The **Title** of a choice is what will be shown on the selection screen, so it should be written in a way which explains the decision the player is making by selecting it. This will also be the Title of a resulting Adventure if it is the last Option, so consider making it descriptive of what it will be.

![icon](https://app.notion.com/icons/video-game_gray.svg)

**Example**: If you pick ‘Fantasy’ and then ‘Noble’ on the Quickstart Scenario, the title of your Adventure will be ‘Noble’—taking on the name of the last option selected.

The **Opening: Multiple Choice**, also called **Description** when editing sub-choices**,** is not the Starting Prompt, but rather should be used as a description for the options you present, as it will not be seen by the AI when starting the Scenario. This area is a good place to tell your player what each option does, or provide a preview of the story to get people interested.

**Importantly**, The AI is not provided anything from any choice, except for the one that starts the Adventure. You have to fill in each choice with everything it needs, as though each choice were its own independent Scenario.

The exceptions to this are [Story Cards](https://help.aidungeon.com/faq/story-cards) and [Scripting](https://help.aidungeon.com/what-are-scripts-and-how-do-you-install-them)—you can edit these at the base level, and they will apply to all of the sub-levels so long as those fields are empty. If you wish to override them, just add the Story Cards or Scripts you wish to have to the choice as normal.

![The banner that appears when your Story Cards will be inherited from the base level.](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/940932ee-6e35-43d7-bf31-add0b3c97522/image.psd.png?width=1600)

The banner that appears when your Story Cards will be inherited from the base level.

### Tips & Tricks

-   Multiple Choice can be complex, and it is not always needed when you want options. If you want minor customization without the hassle, you can consider using Placeholders, which allow the player to fill in certain fields.

-   To do so, use a dollar sign $ followed by a statement in {curly-brackets}. `${Like this.}` The user will be presented with whatever text is in the brackets, and whatever text they enter in response will be used in that part of the Prompt/Plot Component instead. [Read more about Placeholders here →](https://help.aidungeon.com/faq/what-are-scenarios#block-2fd105b8a632806c8e9fe2f4e3b623e0)
-   This is good for asking simple questions that don’t change the layout of your Scenario—like the Player’s name, gender, class, species, etc.—though you may want to go more in depth for these things, which is where Multiple Choice comes in.
-   For instance, you could ask the player what their class is, and simply have a generic starting prompt that fits any class the player enters. Or, you could make a Multiple Choice scenario with the options ‘Rogue’, ‘Fighter’, ‘Wizard’, etc., and have a different starting prompt for each. It’s all up to what you want to do as a creator, and what best fits your vision for the Scenario.

-   Multiple Choice can be used in a variety of different ways, and the possibilities, quite literally, can be endless. Here are just a few things you can do with it:

-   Create different variants of the setting: _when_ it happens, _who_ is there, whether humans exist, whether people are hostile to you, so on so forth—things that drastically change the world, and can’t be expressed with a simple placeholder.
-   Different roles for the player to take within the story: Criminal, Detective, Reporter, Next Victim…
-   Different context lengths to appeal to all kinds of players: an optimized version for free players who don’t have much Context to spare, and a more in-depth version for players with plenty of space.
-   Different Scripts: a version with no Scripts, a version with Dice Rolling, a version with Better Punctuation and Dice Rolling, etc. This is less needed now that people can add scripts through an adventure, but may still be fun to provide ‘recommended’ scripts.

-   You can have an unlimited number of Options, and an unlimited number of Options in those Options, meaning you can be as customizable as you want this way. One could theoretically build an entire “Choose Your Own Adventure” style story, just using Multiple Choice alone.
