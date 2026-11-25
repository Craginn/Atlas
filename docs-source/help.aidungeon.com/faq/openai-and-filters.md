---
title: "OpenAI and Filters"
source: https://help.aidungeon.com/faq/openai-and-filters
scraped: 2026-11-25
---

# OpenAI and Filters

Because AI Dungeon was one of the first platforms using generative AI language models, we’ve been early participants in figuring out the ethics of building AI-driven experiences. Frankly, this hasn’t always gone well and we’ve made some mistakes. In 2021, we were unprepared for our first major ethics challenge and made decisions that hurt many of our players and broke their trust in us.

In early 2021, we became aware that players were publishing stories created using AI Dungeon that depicted the sexual exploitation of children. We initiated conversations with OpenAI, our exclusive provider of AI-Language models at the time, to discuss trust and safety.

OpenAI chose to change their content policy to prohibit content depicting the sexual exploitation of children, which was a decision we agreed with and is reflected in our current content policies. The problem was we were given a choice to either implement our own filters in a very short time frame, or adopt OpenAI’s filters which are too restrictive for AI Dungeon (for instance, not allowing topics like sex or fantasy violence common in adventure games). It’s important to us to honor our partner’s policies, but the short timeframe meant we had to launch a rushed filtering solution. The [risk of getting shut down](https://www.theregister.com/2021/09/08/project_december_openai_gpt_3/) was real.

We tested a simple filter solution, but it was poorly executed. Players were justifiably upset. Even players who understood OpenAI’s content policy had difficulty creating stories because of all the false positives in our filtering system.

In order to comply with OpenAI’s content policy, players were banned or flagged for abuse. Because the first version of the filters utilized algorithmic banning, some players were erroneously banned, and they shouldn’t have been. To remain compliant with OpenAI, we were required to manually moderate player stories. We failed to communicate clearly with players what was going on and why. Players made it loud and clear that manual moderation is an invasion of privacy since it meant the content of their adventures was being screened. We agreed with the feedback and ended manual moderation in August 2021.

Regrettably, many players weren’t even at fault for the offending content. Community members discovered unsafe data in the AI Dungeon finetune. We should have done a better job screening the data before using it. When we were notified of the issues, we removed the unsafe content and trained a new model. On further review, we discovered the base model controlled by OpenAI also contained unsafe data. The result was that the AI still generated unsafe content in players' stories, which in some instances led to them getting banned from the platform for content they didn’t write.

We’re deeply sorry to all our players who were impacted by these events. Although parts of what occurred were outside of our control, we are accountable for choosing our tech partners and working with them to find the best experience for our players.

A lot has changed since then. We changed primary AI providers. We are much more stringent with data privacy with our current tech partners. Our architecture is no longer dependent on a single AI provider. We’ve parted ways with employees and consultants whose advice led us to make decisions we no longer agree with.

We’ve also had more time to find the approach to AI safety that works for AI Dungeon. You can read about that on the [Walls Approach blog post](https://latitude.io/blog/the-walls-approach) we published last year. Today, players rarely have issues with our filters. There are also greater player privacy protections in place. Story data is encrypted, model data collection is anonymous and opt-in only, and no human moderates unpublished content.

We continue to listen to our players’ feedback, especially on topics around filters, moderation, and privacy. Through the improvements and changes we’ve made (and will continue to make) we hope we can regain the trust of players who were impacted by our mistakes.
