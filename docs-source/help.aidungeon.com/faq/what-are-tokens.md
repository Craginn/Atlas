---
title: "What are tokens?"
source: https://help.aidungeon.com/faq/what-are-tokens
scraped: 2026-11-25
---

# **What are tokens?**

AI Large Language Models process information in tokens. Tokens represent a word, part of a word, a phrase, or a symbol. Different models tokenize text in different ways, but in AI Dungeon, one token is usually about 4 characters.

To generate an output, AI models analyze text inputs as tokens and then predict the most likely sequence of tokens to return back to the user. The AI-generated response is automatically translated from tokens back into human-readable text. You can picture this process working like a really sophisticated autocomplete.

**[Use this resource to understand how words are tokenized →](https://tiktokenizer.vercel.app/)**

**[Click here for an in-depth explanation of how LLMs use tokens →](https://help.aidungeon.com/faq/how-are-ai-responses-generated)**

### Tokens and Context Length

One of the biggest limitations of using AI large language models is limited context length, which is the amount of information the AI can process when generating its next output. Each model has its own max context length limit, and we also have tier limits in AI Dungeon since the longer your context length is, the higher the computational cost for the AI to generate a response. Context length is calculated in tokens.

<table class="notion-table col-header"><tbody><tr style="background:var(--color-bg-yellow)"><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Membership Tier</span></div></td><td style="min-width:120px;max-width:240px;background:var(--color-undefined)"><div class="notion-table__cell"><span class="notion-semantic-string">Context Length</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Free</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">~4k tokens</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Journey*</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">~8k tokens</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Legend*</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">~16k tokens</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Mythic*</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">~32k tokens</span></div></td></tr><tr style="color:var(--color-text-default)"><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">Ultimate+*</span></div></td><td style="min-width:120px;max-width:240px"><div class="notion-table__cell"><span class="notion-semantic-string">~64k tokens</span></div></td></tr></tbody></table>

\*Subscribed players can use bigger context lengths for some models by spending 1 [Credit](https://help.aidungeon.com/faq/what-are-image-credits) per action for every set amount of context tokens.
