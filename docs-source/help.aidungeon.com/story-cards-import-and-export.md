---
title: "Story Cards Import and Export"
source: https://help.aidungeon.com/story-cards-import-and-export
scraped: 2026-11-25
---

# Story Cards Import and Export

## Purpose

There are now a million ways to generate small bits of text, and most of them are outside of AI Dungeon. For example, you could give pretty much any mainstream LLM nowadays an example of a good Story Card, then get it to generate a thousand more for you.

So, to better facilitate that innovation, you can now use any method to create Story Cards, and can then import those cards right into an AI Dungeon Scenario or Adventure!

## User Interface

You can find the Story Card Import and Export buttons at the bottom of the `Details` tab of the Scenario Editor or the Adventure Editor.

![image](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/40c2ce27-9ffe-4e86-a779-9f070e509a45/image.png?width=1600)

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/a2c9d4a7-581d-4b57-8aae-19572ddd8a60/corner-line-arrow.svg)

Like [Scripting](https://help.aidungeon.com/scripting), Story Card import / export is currently only available on web. Players using the native iOS and Android apps will not see this section—but you can always go to [play.aidungeon.com](https://play.aidungeon.com) on your mobile browser instead to have access.

## Technical Details

### Exporting

Story cards will be exported to a JSON file. No other formats are currently supported.

The structure of the JSON file is a single array containing a list of Story Card objects, like so:

```javascript
[
  {
    "keys": "Fairy, Larry",
    "value": "You are Larry, a fairy living in the kingdom of Larion. You live in a fairy realm hidden under a grassy hill near the castle. Your skin is a light tinge of blue, your wings sparkle in the sunlight and you are very small and good at hiding. You are fascinated by humans and love to watch them from their flowers where you blend in.",
    "type": "character",
    "title": "Fairy",
    "description": "You are Larry, a fairy living in the kingdom of Larion. You live in a fairy realm hidden under a grassy hill near the castle. Your skin is a light tinge of blue, your wings sparkle in the sunlight and you are very small and good at hiding. You are fascinated by humans and love to watch them from their flowers where you blend in.",
    "useForCharacterCreation": false
  },
  {
     "keys": "Zombie",
    "value": "Zombies are people brought back by Necromancy. They smell quite bad.",
    "type": "class",
    "title": "Zombies",
    "description": "",
    "useForCharacterCreation": false
    }
]
```

`Keys` represent the triggers of a card.

`Value` is the Story Card’s entry.

`Description` is the Story Card’s notes.

`Type` and `Title` are the same as they appear in the user-facing UI.

`useForCharacterCreator` is a true/false check for whether or not the card can be selected when in Character Creator scenario. Don’t worry about this if it isn’t relevant to you.

### Importing

Story Cards can be imported from a JSON file. No other formats are currently supported. If multiple files are selected, only the first file will be imported.

The structure of the JSON file must be a single array containing a list of Story Card objects.

```javascript
[
  {
    "keys": "Fairy, Larry",
    "value": "You are Larry, a fairy living in the kingdom of Larion. You live in a fairy realm hidden under a grassy hill near the castle. Your skin is a light tinge of blue, your wings sparkle in the sunlight and you are very small and good at hiding. You are fascinated by humans and love to watch them from their flowers where you blend in.",
    "type": "character",
    "title": "Fairy",
    "description": "You are Larry, a fairy living in the kingdom of Larion. You live in a fairy realm hidden under a grassy hill near the castle. Your skin is a light tinge of blue, your wings sparkle in the sunlight and you are very small and good at hiding. You are fascinated by humans and love to watch them from their flowers where you blend in.",
    "useForCharacterCreation": false
  },
  {
     "keys": "Zombie",
    "value": "Zombies are people brought back by Necromancy. They smell quite bad.",
    "type": "class",
    "title": "Zombies",
    "description": "",
    "useForCharacterCreation": false
    }
]
```

Only `keys` and `value` are required fields, the rest of the fields are optional.

If an import file is not a valid JSON format, an error will be shown.

Values in an import array that do not match the correct format will be ignored.

If you’re not sure why an import is failing, try a JSON validator, like [this one](https://jsonlint.com/).

Any duplicate Story Cards will be automatically removed, but only if they have the exact same exact Triggers (keys) and Entry (value).

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/20856573-260e-4944-aee1-29a8f2b15e6a/warning.svg)

**WARNING**: When a valid file is imported, the new set of Story Cards will fully overwrite the previous set of Story Cards. Be sure to save backups!

# FAQ

## Why isn’t Story Card import/export supported on the App?

Working with and interacting with the native file system through the App is much more tricky than it is over Web, and currently would require more overhaul than it’s currently worth.

To put it simply, we don’t have the implementation to support it yet—but it’s possible that this might change in the future.

## Why does import replace all of the Story Cards instead of just adding to them?

Replacing the Story Cards on import gives you the maximum amount of power with the minimum amount of complexity. For example, if you want to remove all of the Story Cards from a Scenario or Adventure, you could import an empty array, and all of the Story Cards would be removed. Supporting the same range of behavior without doing a full replacement would require a much more complex interface.

You can also easily add importable Story Cards to your existing Story Cards, by exporting the existing ones and combining both jSON files into one. (Most LLMs can do this for you, if you’re unsure how to—just upload both files and tell it to combine them!)

## Why aren’t duplicate Story Cards allowed?

It's very easy to accidentally create massive amounts of duplicate Story Cards, and if they go unnoticed, they can cause extreme bloat in context. So, exact duplicates get purged when importing.

However, note that this only applies if all of the keys are exactly the same, so you could have `human,king` and `human,queen` as separate keys, and that's fine since the combination is different. You could even technically have `human,king` and `king,human` if you want. The one case you can’t have is two separate Story Cards for `human,king` and `human,king` where all of the keys are exactly the same and are in exactly the same order.
