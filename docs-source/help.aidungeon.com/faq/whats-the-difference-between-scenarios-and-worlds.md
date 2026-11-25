---
title: "Creating Character Creator Scenarios"
source: https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds
scraped: 2026-11-25
---

# What is Character Creator?

Character Creator is a special type of [Scenario](https://help.aidungeon.com/faq/what-are-scenarios) which you can select when editing or creating a Scenario, along with [Multiple Choice](https://help.aidungeon.com/faq/how-do-scenario-options-work). The difference between a normal Scenario and a Character Creator scenario are as follows:

### Scenarios

Default Scenarios (also called Story Scenarios) contain a pre-set [Starting Prompt](https://help.aidungeon.com/faq/what-is-the-initial-prompt-of-an-adventure), [Plot Components](https://help.aidungeon.com/faq/plot-components), and (sometimes) Placeholders and [Scripting](https://help.aidungeon.com/what-are-scripts-and-how-do-you-install-them). These start the Player off with a story and will sometimes ask for customizable fields (Placeholders) like “What is your name?” and so on, but regardless of what you input, a Story Scenario will always start the exact same, no matter who plays it.

### Character Creator

A Character Creator Scenario is very similar to the default, with a few key differences: the Player gets to customize their character by picking pre-determined options (rather than writing in their answer), and the Opening Prompt is built with those choices in mind. No two Character Creator Adventures start the exact same way.

Playing a Character Creator Scenario typically starts with a character creation screen, where the player is asked to select things like a name, gender, faction, location, etc. After selection, all of that information is sent to a specialized AI, which uses it to generate a completely random, custom start to the story. You can even play the exact same character and get a brand new starting prompt!

![icon](https://app.notion.com/icons/light-bulb_gray.svg)

**Did you know**? Character Creator used to be called ‘Worlds’!

# How to create Character Creator Scenarios

To create a new Scenario Option**,** create or edit any Scenario and go to the Plot tab. Where it says ‘Opening: Story’, hit the gear icon ⚙️ to open a menu. You should see [Multiple Choice](https://help.aidungeon.com/faq/how-do-scenario-options-work) and Character Creator below that. Select Character Creator.

When your Scenario is a Character Creator, you will see a Description, and then multiple areas for Classes, Races, Locations, Factions, and an option to Create a Custom Field. These represent the options that your Player will see when they make their character, and work off of your [Story Cards](https://help.aidungeon.com/faq/story-cards). You will also see the option to add [Plot Components](https://help.aidungeon.com/faq/plot-components) as normal.

The Description functions a bit like a Starting Prompt in a normal Story Scenario, but its main purpose is to provide any lore about the world that the AI will need to know. It will appear before the specially-generated Starting Prompt, but the AI will not continue from it [like it usually would](https://help.aidungeon.com/faq/what-is-the-initial-prompt-of-an-adventure), and rather will use it as world information.

For an example, this is the Description of **[Faerûn](https://alpha.aidungeon.com/scenario/3qWxqEvpEHnF/faerun?published=true)**, a popular Character Creator Scenario.

_Land of intrigue, adventure, magic and mysticism, Faerûn is a primeval wilderness populated by beasts, monsters, fey creatures and beings from other planes, where city-states, nations and tribes of myriad races with a millennial history thrive in trade and vie in war, heroes battle ancient horrors from the deeps, kings and queens are crowned and deposed, gods contend for dominion and even walk among men, mortals ascend to godhood and cults form to worship forgotten divinities and reawakening powers._

![icon](https://app.notion.com/icons/light-bulb_gray.svg)

**TIP**: Placeholders like `${What is your name?}` **also work** in Character Creator scenarios!

The player is always asked for their name and gender at the start of any Character Creator scenario, so you won’t need to include those, but you can reference what the Player chose for them in by using `${character.name}` and `${character.gender}` .

## Adding Player-Selectable Options

To explain how to add options, we’re going to use an example—let’s say we want to add the class ‘Necromancer’ to the ‘Classes’ options.

First, we we hit ‘Add Class’ under the ‘Classes’ section.

We’re then going to hit ‘Create new class’—you can also hit ‘Create class for me’ to have an AI generate it for you.

Doing so will open a Story Card menu—creating a new option is the same thing as creating a Story Card. All options you make will also be Story Cards, but not all Story Cards have to be options.

Now, we’ll describe the Necromancer class.

Use the **Entry** section to describe it to the AI, and use the **Notes** section to describe it to the player who will be selecting it. (If there are no Notes, the player will see the Entry.)

When you’re done, hit ‘Finish’, and the new option will be visible in the Classes section!

If you already have a Story Card that you wish to be an option for players to select, simply click the three dots on the preview card (does not work while directly editing the card) and click ‘Add to Character Creator’.

Its Type determines where the card will be placed. If it is a Location, it will be selectable in the Locations section of character creation, and so on.

You can also remove cards from Character Creator in this same way—or by hitting the ‘X’ next to them on the Setup menu.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/d36ebec8-3fc5-456a-aee1-d28f738313b1/img-2026-02-23-13-53-25.png?width=1600)

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/6fa37352-893e-4f30-afd9-048a90caca14/image.png?width=1600)

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/46310444-7348-46e2-a08a-f88fc15b11da/image.png?width=1600)

# Playing Character Creator Scenarios

The best part about Character Creator is getting to play it and see all of the cool combinations you can make. if you want an example, some of the most popular Character Creator scenarios are WanderingStar’s **[Faerûn](https://alpha.aidungeon.com/scenario/3qWxqEvpEHnF/faerun?published=true)****,** OnyxFlame’s **[Fiomar](https://alpha.aidungeon.com/scenario/JwfjA-BKukgR/fiomar?published=true)****, and** AIDungeon’s **[Kedar](https://alpha.aidungeon.com/scenario/H4UiUV84S-bY/kedar?published=true)****.**

When you first play a Character Creator scenario, you’ll be presented with an option to Quickstart and an option to Create a Character.

Quickstart lets you jump into the game immediately by selecting a random option for each selection—it’ll even generate a random name and gender for your character.

Most creators would prefer you make your own character (that way you don’t get a weird combination from the random selection, such as choosing a human who lives in a place where humans can’t survive), but if you want to play a completely randomized game, or just don’t want to spend too much time in character creation, this is the best way to go about it.

Create a Character is the typical way to play. It lets you go through each option and select what you want to play as.

The first questions on any Character Creator Scenario are always for your Name and Gender. After that, you’ll see the custom choices the creator has provided. You can select what you want, and you can also go back to earlier questions if you’ve changed your mind.

Once you’ve finished character creation, your story will load for a bit. This is the AI generating the first prompt of your adventure, which is personalized to what you selected! This may take a while, so be patient—and you sometimes may have to check back a little later.

After you’ve loaded in, a Character Creator adventure behaves the same way as any other [Adventure](https://help.aidungeon.com/faq/what-are-adventures):

-   You’re free to edit the starting prompt as you wish, or hit ‘Retry’ to generate a new one.
-   All of the information you selected will be saved in your Plot Essentials—make sure to check it to make sure it’s accurate, as it can sometimes make mistakes on edge cases!
-   You can always read more about the options you selected by checking the Story Cards.

The Adventure is then yours to play and make your own!
