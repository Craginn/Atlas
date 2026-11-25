---
title: "How does AI Dungeon encrypt player data?"
source: https://help.aidungeon.com/faq/how-does-ai-dungeon-encrypt-player-data
scraped: 2026-11-25
---

# How does AI Dungeon encrypt player data?

Data encryption is an important piece of our strategy to protect players’ privacy. As you would expect, AI Dungeon encrypts player data, including the text of adventures.

However, using an AI language model creates some unique constraints on encryption strategies, so there are some nuances in how encryption can work with an AI experience like AI Dungeon.

AI language models must be sent prompts in plain text. This means that any encrypted story data that is going to be passed to the language model must first be decrypted to use with AI. This is true for ALL AI-based services, including AI Dungeon and other platforms similar to ours.

When data is encrypted, a key is required to unlock that data. Without a key, we wouldn’t be able to display your adventure text, it would be rendered as gibberish. We also wouldn’t be able to send text to the AI for generating the next part of an adventure.

The encryption key can be stored locally (on your device) or remotely (on the server). Most consumer applications, including AI Dungeon, store the encryption key on the server.

Other platforms use local storage for their encryption keys, since storing it locally makes unauthorized access to data more difficult, in theory. Local keys are more difficult to access, but that doesn’t eliminate the need to transmit plain text to the AI model. As was mentioned earlier, AI requires plain text. That means plain text data is still being transmitted between the player’s device and the AI servers. Since text is decrypted before going to the AI server, whether the key is stored locally or on a server, we feel the additional security benefit of client-side key storage is minimal, but also comes with some important tradeoffs.

Local key storage has negative tradeoffs. For instance, if you forget your username or password, you’ll lose access to your data permanently. Thousands of our players would have permanently lost access to their accounts and stories if we had used local keys. Local key storage also introduces complications in supporting multiple devices on a single account.

Because of these tradeoffs, we’ve decided that server side storage of encryption keys best serves the needs of _our_ players. It let’s us help players recover their data if a password is forgotten, and it also makes it easier for us to support native applications for iOS and Android.

We may consider adding client side key storage as an option for players who understand the risks and tradeoffs.
