---
title: "Why isn’t the AI generating anything?"
source: https://help.aidungeon.com/faq/the-ai-isnt-generating-anything-why-is-that
scraped: 2026-11-25
---

# Why isn’t t**he AI generating anything?**

Sometimes the AI won't generate anything when you put in an action. This generally happens when the AI tries to generate a player action (starting with a > token) or an end of text token.

If this happens, you can either Undo, Retry, or manually edit the text to write your own result.

If it continues to happen, check your settings—if your values are too high, or sometimes even too low, there is a chance the AI will only generate ‘garbage’ tokens (usually symbols, strange characters, and other containers), which will be automatically purged by AID’s post-processing, and result in an empty response.

If you are receiving some kind of error when this happens, and none of the above has helped you, there are a few things you can try.

1.  Change your model. Sometimes, certain models may be down, malfunctioning, or just generally behaving strangely. Keep an eye out on [our socials](https://help.aidungeon.com/faq/is-ai-dungeon-on-social-media) to see if we mention it, or if anyone else is talking about it.
2.  **Check your Scripts.** [Scripts](https://help.aidungeon.com/what-are-scripts-and-how-do-you-install-them) are fan-made add-ons, and sometimes they can cause issues with generation.

-   In your Adventure, open Game settings → **Scripts**. A Script with a problem shows an **ERROR** badge and a short message.
-   Turn your Scripts off with their toggles, then turn them back on one at a time to find the one causing trouble.
-   To turn off Scripts for your whole account, go to Account Settings → **Gameplay**. This affects every Adventure you play, and you can turn it back on at any time.

4.  Go to Settings → Testing & Feedback → Enable ‘Raw Model Output’. This can help you determine if the AI is generating trash tokens and it’s being purged by our post-processing, or if something else is happening.
