---
title: "Dataset Publication FAQ"
source: https://help.aidungeon.com/dataset-publication-faq
scraped: 2026-11-25
---

# Dataset Publication FAQ

Latitude is preparing a research report and accompanying dataset to further advance the state-of-the-art in language model research. During the upcoming weeks, users who have opted-in to our "[Improve the AI](https://help.aidungeon.com/faq/what-is-improve-the-ai-mode)" setting will be prompted with the option to opt-in to having some of the logs from their sessions anonymously published as part of this dataset. If a user opts in, session data such as user inputs, model outputs, button presses, and text edits may be included in an upcoming public dataset. Prior to being approved for publishing, all data will be filtered for content and personal information. Any user will have the ability to enable or disable this setting at any time. Additional details are below.

## **Why publish a dataset?**

Many modern language models leverage human feedback during training, but the best way to utilize this feedback is still an open research question. The collaborative nature with which our users interact with AI Dungeon gives us the opportunity to contribute a unique dataset to the research community. We believe this has the potential to improve our AI and your experience with our products.

## **How will this dataset be used?**

The focus of this dataset will be on learning from the implicit feedback users provide while interacting with our system such as editing model output and utilizing the retry button. We anticipate that academic and industry researchers will use this dataset to explore and publish new methods for training language models using implicit human feedback.

## **What data will Latitude be collecting if I opt-in?**

Users who opt-in will be allowing us to publish anonymized user inputs and model outputs from their sessions. This includes user submitted text, model input and output, user edited outputs, retry/undo button presses, and preferences when selecting between multiple outputs.

## **Is this separate from the "Improve the AI" setting?**

Yes, users who do not opt-in to publishing can still have "Improve the AI" turned on without having their session data published. However, having "Improve the AI" active will be a precondition for allowing us to publish data from play sessions. Also, previous "Improve the AI" data will not be published.

## **What collected data will Latitude be publishing?**

Before publishing any of this data, we will filter text for addresses, phone numbers, and unsafe content. Unsafe content includes text that contains hate speech, drug use, sexual material, self harm, bullying, extreme violence, or child safety or exploitation. We will use [the same text moderation service that we use in our Phoenix update](https://thehive.ai/). Note that while we can filter addresses and phone numbers, any names used in the original adventure will remain the same.

## **Where will this data be published?**

The final dataset will be published as part of a public github repository in [the latitudegames github organization](https://github.com/latitudegames).

## **How can users control this setting?**

This setting can be toggled on and off from your in-game settings (gear icon) under the “Gameplay” section → "AI Models” tab → “Testing & Feedback" accordion → “Improve the AI” option. This toggle can be used to control play sessions that allow us to publish data. This publication toggle will be used to label data as it is collected. For example, toggling this feature on will not permit us to publish data from previous sessions, just as toggling this feature off will not remove previously publishable data.

If you have any questions or concerns, please reach out to [support@aidungeon.com](mailto:support@aidungeon.com).
