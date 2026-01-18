# Chat

Naturally, the main focus of the app that allows talking to models via text is the chat module. Because of this I have a lot of ideas to make the experience here the best possible. There're some more novel things I'd like to try and see how they turn out working.

## Core system

The fundament of everything will be a top-notch core chat system. Branching, retrying, regenerating, editing past messages, stopping generation mid-flight all of this will enable fluent UX. Moreover, thanks to sync we'll naturally have stream resumption. The overall UI is meant to be as minimal as possible, I don't want to have too many user-facing knobs. We're gonna go deep into the conversational UI, it should feel mostly like chatting with a friend - you're not configuring your friend when talking with them.

It will be backed by cluster entity, which will enable them to be stateful - that'll be mostly useful when it comes to interruption, but I see a lot of useful potential here. Other thing that will be much easier thanks to this - incognito chats. Most important characteristic will be auto-deletion after grace period + not being included in any knowledge sharing.

## Projects

Projects, while they sounds ambitious will be pretty simple. The most important idea here is to organize and group chats related to similar task together. It'll be possible to configure some general behavior of AI in given project, e.g. you may want to provide some high-level knowledge that is shared or configure tone/style. Example projects scope that I'm think about: "Work", "Personal project X", "Personal project Y", "Cooking".

What it enables is sharing knowledge across chats in a given project. In ChatGPT the memory system is pretty useful, but at the same way its often painful, because it too often relates to unrelated knowledge. Technically it can be alleviated by their projects implementation but it doesn't feel like the optimized, happy path - it's even opt-in to not share stuff between projects.

Two major differences here will be:

1. Focus on projects as an organization feature. Making it more central point of the app, allowing easier swapping between projects, forcing user a bit to use it. Every chat will be a part of some project, even if a default one. There's a planned "Traffic Control" feature, which will help to automatically route ones you start in the default project if they fit other project with high confidence.
2. History search, not a memory system. I don't want model to synthesize some knowledge about person. At least not at the beginning. While it'd be more similar to standard chatting with people, I believe that it's sometimes painful when model assumes something about you and it is much worse at it than everyday people. I want to know how far can I take a RAG system across history in a given project, before diving into any memory system. I believe it'll be enough for everyday use and will result in better UX.

## Skills

Projects will help to share some high-level knowledge about given area across chats, or configuring base model behavior. Their base configuration will be always available in the context and you don't want to pack it too much. Moreover, if you like model using your favorite tech library given way you may want to share this across chats and manually syncing it between projects would be painful. What I want to adopt here is basically an adoption of [Agent Skills](https://agentskills.io/home) standard for chat-like system.

It'll be possible to create a skill, that won't be eagerly included in the context. AI, in form of a tool, will have a possibility to access any skill that you created and enabled inside of a given projects. That'll allow much more scalability and easier iteration on skills. Moreover, you can have 10-20s of skills without any context rot. Adopting open standard makes it much more bulletproof and understandable for users. There's a possibility of allowing export to standard skill markdown file.

## Routing

We can't talk about AI chat without talking about models. There're a lot of models and they often differ in usage, some fits some tasks better, or they're faster/smarter/cheaper. Choosing proper model for a given task is not a trivial task, especially when it comes to constantly evolving landscape of models. Based on my experience building some AI chat app already - I harshly believe, that giving user full control on this doesn't result in the best outcome.

Naturally, what I can implement here is routing. But it's not a trivial task at all. There're a few concerns when it comes to routing, which are especially applicable to naive approach that I already experimented with:

- Cache busting - if each question initiates routing mechanism and we have a chance to route it to completely different model we lose caching which saves a lot of inferences costs when it comes to modern LLMs.
- Conversation continuity - if each message potentially lands to different model, it'll result in less smooth, dumber chat. Models like to continue their own words. If model downgrades, it may be significantly visible. Current model allows also for passing and continuing reasoning, which can't be picked up by a different model.
- Non-trivial when it comes to non-question messages - it's simple to decide whether it's a complicated/simple message, when user asks about something. It's much harder when user speaks "tell me more", "why do you think this way".
- Accounting user feedback - if user is frustrated or express some preferences about answer, this should be considered in routing logic.
- Feature differences between models - many models have a small differences between supported features. Especially when it comes to attachments, where even if they support them, formats, sizes differs a lot between models.

When I thought about all of this, I was initially concerned whether it's a good idea to try to implement routing. However, I believe it's a good challenge to implement this and I have a rough idea how to alleviate all of this challenges. Initial ideas:

- Routing will be based around chat summary that'll be continually updated on each turn. That'll allow a few things: 1) accounting for messages that don't have enough context on their own or aren't direct questions 2) tracking state and prefer conversation continuity unless hard signals for switching model 3) detecting sharp turns.
- User feedback must be accounted. Signals like user saying they prefer more concise/detailed answers or being dissatisfied/satisfied are one of the best signals here.
- No model downgrading. It'll only result in worse UX, maybe we should somehow monitor situations where heuristics indicate model downgrading, but we don't want this to prevent routing errors like this.
- Make the model swap less likely if chat is long, include reasoning or a lot of tool calls.
- Jumping across one family of models should be more possible than jumping across completely different providers.
- Don't route based on feature differences between models. Reduce as many feature differences as possible, e.g. attachment support can be implemented as tooling where model can ask questions about attachment different model, which supports them.
- Not too many models - select a few best ones based on use cases, topics, quality/price balance.

All of this together will be definitely non-trivial system, but should result in a really good UX if implemented well. Additional layers/systems will be necessary here. For example I intend to implement my own eval-like layer to try different models and realistically decide whether one is better for a given use case then others. I feel like for a lot of use cases it's not the smartest model that makes the most difference but things like context, tooling etc.

## Tooling

A lot of already mentioned features will be implemented as tool calling. That's one of the most groundbreaking features across models and how well they can do this currently is impressive. Here I want to list tool ideas that I could implement and would be valuable in this system (excluding before mentioned ones which are core to other modules):

- Web Search
- Web Access
- Deep Research
- Code execution
- Computer use
- Virtual file system

## Unresolved topics

- Context compaction - that's a topic that will have to be handled somehow but I'm leaving it for the future, because it doesn't impact how would I implement core modules and I'm not yet sure how to best approach this.
