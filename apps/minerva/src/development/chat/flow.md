# Flow

The chat coordination is a bit tricky because of a lot of pieces that influence technical decisions behind how things work. Hence, I want to document everything for further reference and for better understanding of the flow.

## Data structures

We operate on a few data structures here and their shape, structure and separation is also influenced by the sync layer that we're utilizing here.

### Project - TBD exactly

Container grouping multiple conversations, which allows sharing context and retrieving past conversations details in a new conversation.

### Conversation

Group of messages tied via logical container, which has its own title and is under a specific project. Conversations aren't fully linear, they form a _forest_ of _trees_ of messages. Each branch can be separately continued and doesn't interleave any other. Branches can have common ancestors.

### Message

Message has two roles where each has a bit different semantics:

- **User** - it's a single entry from user sent and used to generate answer (with any existing branch ancestors). It's always one-shot created from the input and never edited. Only user message is allowed as the root of the tree.
- **Agent** - it's everything that LLM generated in answer to previous user's message. Due to the asynchronous process of generation it can be in multiple separate states - in progress, error, completed, interrupted. What's important is that one message can consists of multiple LLM generations when it comes to e.g. tool calls.

### Message part

Each message consists of metadata, which describes what's the message role, status etc. But it also needs to have a content. Because the need to include various different content types we structure it via message parts.

Each part have a type (text, tool, attachment - TBD) and data specific to its type. Some message parts are specific to a given role, e.g. only agent messages can have reasoning. In case of agent messages, that's what's getting appended during the stream.

### Inflight chunk

While we store message parts as polymorphic structure via type enum + JSON data, some of message parts aren't single-shot. For example answers and reasoning are streamed chunk by chunk, these can include even hundreds of chunks. In theory we could just update the JSON data for each chunk (or batch them), but that has a few cons:

- Performance is suboptimal when so commonly mutating JSON struct inside of Postgres.
- Sync layer would be suboptimal. Electric works by streaming updated column values, so if we continuously update the data field, on each update the whole JSON would get streamed. That'd drastically impact streaming performance. If we have N chunks inside of text message part, first one would get actually send N times, second N-1 times, etc.

We need to optimize this for both storage and sync. So for message parts which are streamed-text based we flush inflight chunks one-by-one into the temporary inflight chunks table. After its finished we compact them and update the message part. We schedule a job to cleanup inflight chunks. We can't immediately clean them up, because syncing transactions isn't guaranteed cross-table.

## Chat Service

Everything starts through the API obviously - it'll expose below actions that are available via Chat service, which gets already validated data:

- `startConversation` - self-explanatory, creates a brand new conversation. It'll invoke stuff like title generation, initial routing logic etc.
- `continueConversation` - used for sending new messages in existing conversation. It can be used both for standard continuation and editing existing user messages - because that's the same as continuing with a new branch created.
- `regenerateAnswer` - used for generating brand new answer for an existing user message.
- `interruptGeneration` - all of above methods start background generation process - via this method it's possible to interrupt it mid-flight.

Each of this operates on entities pre-created on the client. Due to usage of sync layer we want to create e.g. IDs of entities client-side so they aren't discarded after created and synced.

The first three of above actions have similar functionality. They do some business logic checks, insert it into the database, maybe trigger title generation and project routing if it's a new conversation - that's their main job. After that, they start a new generation in background. After it's started, client can interrupt it via the fourth action.

## Conversation Service

That service will act as a kind of repository for the one above. To better separate the logic and have the Chat service slim we'll expose a few helpful methods that'll work with the data structure and will be responsible just for managing database entities.

## Conversation Message Generator

That's the part responsible for handling the background generation process. It needs to be stateful, hence we're using Cluster Entity for it. Why it needs to be stateful? Because when it's processed in the background user may want to interrupt it. That would "just" work in a simple world, but when we scale our app horizontally - that assumption breaks. Cluster entity enables the location transparency pattern, we just have a stateful entity - we don't care where it is and how is it managed from the consumer POV.

The entity's API is slim on purpose. This way it has only one concern - generation, it doesn't need to care about auth (which would be tricky when it comes to Cluster Entity, because it's a bit separate from the HTTP API). So its only responsibility is generation - it gets a request to starts a new one, it triggers it, holds a fiber in memory and just wait. If it completes - it completes, if it gets a request to interrupt it, it retrieves a fiber and proceeds with interruption.

## Inflight Chunks Cleanup

As mentioned earlier, we need to perform a cleanup of inflight chunks after message part is complete, but we can't do it immediately. Hence we use workflow here. It allows us to wait in a durable manner and perform a cleanup after given amount of time. Thanks to Effect we get guarantees like at least once delivery etc.
