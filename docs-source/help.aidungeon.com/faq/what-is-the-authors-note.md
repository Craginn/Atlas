---
title: "What is Author’s Note?"
source: https://help.aidungeon.com/faq/what-is-the-authors-note
scraped: 2026-11-25
---

# All About Author’s Note

The AI can only process a certain amount of information at a time, but a story can quickly become much larger than the context. This means the AI is only given the last part of your current Adventure and doesn’t consider anything written before that when generating new responses.

To compensate for this limited context size, AI Dungeon has [Plot Components](https://help.aidungeon.com/faq/plot-components) that always give the AI important information during gameplay. `Author’s Note` is used to give the AI details about the story’s genre(s), your preferred writing style, or overall tone. This text is sent to the AI toward the end of every player input to keep it informed about how it should generate a response.

## How to use Author’s Note

Author’s Note can be added from the [in-game settings](https://help.aidungeon.com/understanding-settings) of your current Adventure, or by adding a New Component when editing a Scenario.

While [Plot Essentials](https://help.aidungeon.com/faq/plot-essentials) and [Story Cards](https://help.aidungeon.com/faq/story-cards) are treated as regular text by the AI, Author’s Note text has special formatting applied that surrounds the entry with square brackets `[ ]` when it’s sent to the AI.

In the stories that the AI was trained on, this was a common way authors would describe something about their story, so the AI now interprets square brackets as descriptive indicators about what should come next instead of actual story text. This means Author’s Note can be much more technical and out-of-character, because these are instructions for how the AI should generate its next response. This is why Author’s Note is sent to the AI toward the end of every player input, as opposed to near the beginning like Plot Essentials and Story Cards are.

Using Author’s Note is completely optional for your games. Including this component may help the AI generate a more coherent and consistent story, but gameplay will still work without it.

💡

**Remember**: Author’s Note does take up space in the limited amount of context sent to the AI every turn, so keep your entries as dense and concise as possible.

## Author’s Note versus AI Instructions

Up to this point, you may have been using Author’s Note to accomplish what [AI Instructions](https://help.aidungeon.com/faq/ai-instructions) can now do more easily. **But, both components can be used together to guide the AI into generating a coherent story.**

While AI Instructions are included as a System Prompt, the very first thing the AI will see, Authorʻs Note is inserted near the bottom, which means it has more of a direct influence on how the AI generates outputs. You shouldn’t add too much information here, or the AI is likely to focus on those details instead of what happened most recently in your Adventure.

**Our recommendation is to keep Authorʻs Note short, no more than 3 or 4 sentences, and only focus on a couple of key instructions about your story’s theme and setting that you want the AI to follow.**

If AI Instructions is like talking to a customer support rep, Authorʻs Note is “Can I speak to the manager?” **Try to address most issues in AI Instructions, and use Authorʻs Note when the AI Instructions isn’t accomplishing what you need.**

### Comparing AI Instructions and Author’s Note

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">AI Instructions</span></div></td><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Author’s Note</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">List of general directions the AI should follow when generating new outputs.</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Short list of 3-4 key instructions the AI should follow when generating new outputs.</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Could be used for story instructions, style guidance, plot outline, topics/words to avoid, or description commands.</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Could be used for specific scene instructions, setting guidelines, or theme reminders.</span></div></td></tr></tbody></table>

## **Tips for using Author’s Note**

Try to make your Author’s Notes dense but detailed. “Fantasy story” is too simple; instead, describe the story with more expressive words:

-   Dark fantasy-horror story. World corrupted by evil magic. Rated T for violence.
-   Horror science-fiction story. Delve into humanity’s fear of Artificial Intelligence.
-   High Fantasy world of talking equines and other fantasy creatures. Tags: noblebright, magical, fantastical, fun

← Previous

[Advanced Tips](https://help.aidungeon.com/advanced)

Next →

[Advanced Settings](https://help.aidungeon.com/faq/what-are-advanced-settings)
