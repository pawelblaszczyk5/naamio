# Architecture

The overall initial architecture will consist of two separate apps working in tandem to deliver the experience to user. This is intentionally done this way, to mimic what would standard bigger projects use. Collocating API with your SSR framework doesn't really scale, regardless of what someone told you. Moreover, I'll use `Electric` for synchronizing the state between clients and the database - more on that later.

## API

This will be a pretty generic API server which job will be everything regarding the database, users, mutations - exactly what you'd call an API. There'll be one simplification, because most of the reads won't go through that server, cause of `Electric` usage mentioned beforehand.

That server is separated on purpose, so the API could be reused, e.g. if building other interface than a web app. That would be not trivial if it'd be a part of the web app. Similarly it could be scaled separately and use different tech stack, which is more suitable for serious API. What I'm currently targeting to use here is to dive deep into the `Effect` ecosystem. Using its HTTP API primitives, which will guarantee me really ergonomic server authoring, type safety between it and any consumers, such as web app. Moreover, I'm planning to utilize Cluster/Workflows features, which with some previous planning should excel and solve various problems that I'll tackle here - e.g. the statefulness of single chat.

## Web app

It'll be pretty standard web app using `TanStack Start`, some of it parts will be SSR (home page, login), but most of it'll be an SPA. The framework makes it really easy and ergonomic to do. It'll enhance/proxy functionalities of the API via the server functions features. I want this to be more dumb and easier to replace if needed.

## Electric

I'll use combo of `TanStack DB` + `Electric` to manage state on the frontend app. This requests will be proxied through API obviously, as `Electric` suggests. But that makes the API much slimmer and easier to scale, cause you don't need any ad hoc methods for reading data specific to given view. Moreover, I believe it'll result in much better UX. With the newest feature of subqueries in `TanStack DB` there're many many patterns that can optimize data fetching while still simplifying it **a lot**.
