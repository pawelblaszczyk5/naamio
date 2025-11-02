# What's Naamio?

Naamio is supposed to be my own AI chat app. ChatGPT free limits are getting more and more painful and I want to utilize AI more for various stuff.

However, I'm not fully satisfied with any current solution. I'm a programmer though - so why not build my own 😄 That's exactly what Naamio is going to be. Focused on my own needs and my own way of approaching AI. Heavily opinionated and probably not meant to be used by a lot of people.

That's also supposed to be a bit of a proving grounds, before starting to build other, bigger apps that I want to build, but I have a creative block a bit.

## Conversations

What is the most important for me is possibility of using various AI models depending on the use case. However, I kind of don't believe on manually switching models based on what I want to ask. I think it's painful and dumb and bad UX. Firstly, I considered attaching to the projects concept and/or creating custom ala agents, which would be catered to a given task with a given model. That's still not the best UX though and in reality it requires user to be aware of what model is the best for a given task which is not always the case. In my case, where this is an app for my usage only, that's not the worst, I want to focus on the good UX for myself too, though.

Naturally, what I landed on is smart routing which I already experimented with in my previous project. I'm sure that's a pretty tricky topic and to implement it well it's not a simple task. I believe, that forcing myself to do this will be a) most beneficial when it comes to learning b) will result in the best UX. Moreover, routing enables additional stuff - for example, the basic pattern of configuring agents is problematic when it comes to stuff like e.g. attachments. You obviously want to support them, they're really useful. But often, models that suit given task the most may not support attachments. It's fine because user can use them as long as they don't upload one. While they upload, we automatically switch model under the hood. While it may be surprising that we're getting answer from other model out of nowhere, I believe that with additional guardrails it may end up with the best UX.

You can see that the most important thing here is UX and that's what I'm focusing and prioritizing on. I want this app to be something that I'll use myself daily. To achieve this it must be pleasant to use and provide a really seamless experience. I'm really curious whether if I polish it, other people would be interested in using it.

## Projects

That's my second big thing that I'm targeting to build. Projects are supposed to be containers for conversations related to a given topic and/or AI style/task. They'll provide encapsulation naturally and with additional features built around them (tooling to provide access to past conversations) I think they can provide a really good experience.

I also have some ideas how to make them more natural to use and make them less friction. For example I'd like there to be a feature that would suggest you routing given conversation to a given project when you talk with a model. I think it'll be a bit tricky to achieve for various use cases. However, it should make the base UX better.

There's a chance that for some specific projects use cases that'll be basically impossible to do accurately. For example, if you have a project which is created for all tasks where you want AI to translate something for you - that's kind of hard to do, because technically, every single message could be translated. The focus is for projects to be more domain specific than task specific, though. I'll see how it turns out in the future probably.
