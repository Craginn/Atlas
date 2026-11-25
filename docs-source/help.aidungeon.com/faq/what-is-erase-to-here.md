---
title: "What is “Erase to Here”?"
source: https://help.aidungeon.com/faq/what-is-erase-to-here
scraped: 2026-11-25
---

# Erase to Here

`Erase to Here` is our new, Phoenix implementation of “Undo to Here”, a popular Legacy feature.

### How to Use “Erase to Here”

We’ve added “Erase to Here” as a slash command in the game screen. Players can go to any point in their story, select the text to edit it, clear the text area, and replace it with:

`/erase-to-here` OR `/eth`

Once you confirm this change, all actions and outputs below that text area will be Erased. Changes made using “Erase to Here” can be undone and redone like other actions.

![icon](https://app.notion.com/icons/stars_yellow.svg)

Another way you can erase to a part in your story is by double tapping/clicking while editing text. A small button will appear which says ‘Rewind Story to Here’. If you click that, everything after where your cursor is will be erased!

### **Why “Erase to Here”?**

We initially didn’t include an “Undo to Here”-like feature in Phoenix until players gave us feedback that they’d like it carried over from Legacy.

First, an explanation for why we’d originally decided not to include the feature. In Legacy, there is a menu that shows up whenever you click or tap an input or output. The menu was accessed by tapping the “…” on the right side of the text once it was selected. This menu had several actions listed, and one of them was “Undo to Here”.

As we were building Phoenix, we realized this menu was causing performance issues. We’d spent time exploring different approaches to optimizing the performance of this menu but didn’t find a solution we were happy with.

So, we decided it’d be best to remove that menu for Phoenix. For the features in that menu, we had to either find them a new home or retire them. We turned to our analytics and user feedback to help us decide which to keep and which to migrate. Our sense was that the “Undo to Here” wasn’t used often enough, or by enough players, to justify bringing over.

That is, until we got clear feedback we needed to bring it over to Phoenix.

### **Exploring Options**

We weren’t willing to compromise performance to implement “Undo to Here,” which meant we needed to identify a new interaction pattern. We also wanted to make sure the feature reflected the clarified story actions. We’ve cleaned up what “Undo” means and added “Erase” as an action to remove the latest generation or action. We wanted to stay consistent with these new concepts.

Based on player feedback, users are using “Undo to Here” to backtrack in the story. In this case, “Undo” isn’t technically descriptive of what we’re doing since undo history also contains a number of actions besides generating the story. For instance, what if a player edited text above the place they wanted to “Undo to Here”? Should that be included as what we’re undoing since it’s part of the action history?

Instead, we felt that “Erase to Here” is actually a more precise, less complicated action.

The last piece to figure out was the interaction. There are many possible solutions (most of them bad) that would allow us to include “Erase to Here.” We weighed these options based on how they would impact the user experience, performance, and development effort and we came up with a pretty clever solution.

### **The Solution**

As mentioned at the top of the article, we added “Erase to Here” as a slash command in the game screen. Players can go to any point in their story, select the text to edit it, clear the text area, and replace it with:

`/erase-to-here` OR `/eth`

Once you confirm this change, all actions and outputs below that text area will be Erased. Changes made using “Erase to Here” can be undone and redone like other actions.

We like this solution for a few reasons. It has no impact on the game screen performance. It doesn’t require us to add additional UI elements that could add additional UI noise. It better honors the clarified concepts of Undo and Erase, and it plays nicely with Undo and Redo. It also opens up the possibility of additional actions we can take using this interaction. Implementing this solution only took a few minutes since it didn’t require us to go through the design process, and the code implementation was straightforward.

We’re excited for players to try this new interaction for “Erase to Here.”

**[Let us know if you have any feedback →](https://discord.gg/RcYntV44fF)**
