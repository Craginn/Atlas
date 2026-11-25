---
title: "What are AI Model Settings?"
source: https://help.aidungeon.com/faq/what-are-advanced-settings
scraped: 2026-11-25
---

# All About AI Model Settings

![icon](https://assets.super.so/311da5e0-9a02-4177-9f6a-b89435645aea/images/1a4493c7-1b4e-419b-957d-a1be3f6aba95/down-carrot.svg)

`Model Settings` is a feature in AI Dungeon that lets you customize and control how AI responses are generated during gameplay. These options may vary across different models.

The AI generates the next part of your Adventure by creating a list of all the possible [tokens](https://help.aidungeon.com/faq/what-are-tokens) that could come next and the probability that they would be next. Then, it selects tokens from that list with a random number and some math. The Advanced Settings let you change the numbers within that calculation that aren't random.

This is complicated, so it’s highly recommended that you experiment with each setting or [ask for advice on our Discord.](https://aidungeon.com/discord)

You may also find it helpful to read [our more advanced article about how AI responses are generated](https://help.aidungeon.com/faq/how-are-ai-responses-generated), which can give you a better understanding of how these function behind the scenes.

[Model Settings are now open to all AI Dungeon players.](https://aidungeon.com/renaissance)

## Context Length

`Context Length` determines the maximum number of [tokens](https://help.aidungeon.com/faq/what-are-tokens) that can be sent to the AI model every turn. It’s typically best to set this to the highest value so the AI always receives as much context about your Adventure as possible.

The context includes information in [Memory](https://help.aidungeon.com/faq/all-about-memory), any triggered [Story Card](https://help.aidungeon.com/faq/story-cards) entries, [Author’s Note](https://help.aidungeon.com/faq/what-is-the-authors-note), any [Memories](https://help.aidungeon.com/faq/the-memory-system), model instructions, the most recent player input, and the newest AI output. Any remaining space in the set Context Length is filled by Adventure text, so maximizing the context the AI receives can help it generate consistently coherent outputs during gameplay.

Context Length is ultimately determined by your [membership tier](https://help.aidungeon.com/memberships-benefits#block-7634ae21edb34acf953292acf4998fd1), but not all models can support larger context sizes.

Subscribed players can also spend 1 [Credit](https://help.aidungeon.com/faq/what-are-image-credits) per action to increase the context length temporarily on certain models.

## Response Length

`Response Length` determines the maximum number of [tokens](https://help.aidungeon.com/faq/what-are-tokens) the AI will output every turn. This is a matter of personal preference: you may want short responses that you can quickly read and decide when you want to jump in, or you may want very long responses that you can take your time with. Do whatever fits your play style!

## Temperature

`Temperature` controls the randomness of the AI's responses. A higher temperature increases the AI's unpredictability, leading to more varied and creative outputs, which can be great for exploring unique and unexpected storylines. Conversely, a lower temperature results in more consistent and predictable responses, ideal for maintaining a coherent and focused narrative. Adjusting the temperature allows you to fine-tune how random you want your game experience to be.

The default temperature is often times 0.8, though you might consider something like 0.6 if you feel the AI is getting a bit too far from a reasonable response, or you may consider 0.95 or even 1.2 if you want to see the AI generate some really uncommon text.

Just be warned that increasing Temperature too high can lead to the AI picking outlandish or even gibberish tokens.

## Top-K

`Top-K` limits the AI’s choices to the set K most likely tokens in its response. By narrowing the possibilities, Top-K helps to maintain relevance and consistency in the AI’s replies, ensuring that the responses stay on track with the ongoing narrative. This is particularly beneficial when you want a more stable and predictable story progression, as it prevents the AI from veering off into unexpected tangents that may not fit the established plot or character development.

If Top-K is set to 20, the AI will have a list of only the 20 most likely tokens to pick from every turn. This can reduce randomness by excluding less likely options when generating new outputs.

## **Top-P**

`**Top-P**` filters out less likely tokens to ensure the AI output is coherent and relevant. It works by setting a probability threshold, like 90%, and selecting the most likely tokens until their combined probability reaches this limit. This helps keep the AI’s outputs focused and on-topic by limiting its choices to a more relevant set of tokens. This is especially useful for maintaining your story’s integrity and reducing randomness without making it too predictable.

This works as a ‘safety net’ when combined with Top K. Top K may be at 50, and thus it will always select 50 tokens, even if some of those tokens are extremely unlikely and wouldn’t make much sense if they got selected. Top P cuts those unlikely tokens off, which protects you from bad selections, but also still lets you have the possibility of more options in times where all the Top K choices are likely. It lets the AI be certain when it’s certain, and get creative when it isn’t.

If Top-P is too low, AI outputs may be repetitive and uninteresting. If Top-P is too high, AI outputs may be disjointed, incoherent, and potentially even grammatically incorrect.

A Top-P of 0.90 to 0.95 is best for most players, but it can also depend on your other settings. If you have a high Top K, you may opt for a lower Top P, and vice versa.

## Presence Penalty

`Presence Penalty` applies a one-time weight penalty to any word that has already appeared in the response. If the word "Dog" is used once, Presence Penalty will penalize it to help prevent immediate repetition, unless its base probability is high enough to overcome the penalty. This can help with any issues where the model is repeating what it just said, or trying to repeat an older response.

However, pushing this setting up too high can occasionally do the opposite of the intended effect, and cause more repetition. If all words are penalized, then nothing is.

## Frequency Penalty

`Frequency Penalty` is like Presence Penalty, but its penalties are cumulative. As in, the more a word has been used, the more it will be penalized in the next response. This may sound good, but remember that the names of characters, as well common words like "You", "I", "and", “a”, etc., will be penalized heavily, so setting too high of a value will start cutting out these tokens in favor of some otherwise very uncommon ones, possibly even becoming grammatically incoherent.

Frequency Penalty usually defaults to zero, and while you can set it very high, the AI will start to trend towards those strange outputs if you put it too far over even 1.

# Tips & Tricks

### **There are no rules for these settings.**

As with anything in AI Dungeon, the best way to get a feel for things is to experiment, and there’s no penalty for doing so. If you are interested in understanding what these do, take some time to change and adjust them, and then see what happens in your Adventure. You can nudge them around based on what you think you'd personally prefer, and you might like it better, or you might go back. Sure, the AI responses may get weird and wacky, but that's part of the fun of playing AI Dungeon!

### **There are no real consequences to changing these settings.**

There are no consequences to turning up the Top-P, Temperature, or Repetition Penalty to maximum just to see the AI flail about like a tube man. There are no consequences to turning everything down to zero and watching the AI do its best impression of a broken record.

After all, everything in AI Dungeon is erasable and editable—if you don’t like how the AI writes on your new settings, erase and try again!

### **There aren’t agreed-upon "best values" for these settings.**

The default values for these these settings have tested well in our experiments, but they may not work for your style of gameplay, and that’s alright! We’ve provided these settings so you can customize and control your AI Dungeon experience however is best for you. If you like something that no one else is using, that’s great! At the end of the day, it's your Adventure, your game, and your experience, and you can do whatever makes you happy.

**Happy Adventuring!**

← Previous

[Author's Note](https://help.aidungeon.com/faq/what-is-the-authors-note)
