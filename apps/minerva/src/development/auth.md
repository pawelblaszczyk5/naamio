# Auth

When talking about the auth flow, there are two main focuses that are worth discussing. How the auth will work with the app being split and how user could auth themselves into the app. Let's talk about them, one-by-one.

## Split between applications

As mentioned in [Architecture](/development/architecture) overview there'll be a separate API app, which will serve the web app at the beginning but could potentially scale to other clients as well in the future. That requires a bit more sophisticated session handling than what I've already used.

For a moment I considered making API black box which would be accessible only from private networking and it'd just straight up accept user ID and act on it. In that scenario, each app would have its own sessions system and the API would act on IDs which would be 100% to be valid/correct/authed. However, that makes it hard to e.g. making a pure SPA, VSCode extension, TUI or mobile app. Each of these would need an additional proxy API which would handle that. Moreover, you couldn't log out from all apps at once, because they'd be completely separate systems.

After consideration I landed on making API manage, forge, revoke and source of truth about everything related to session. It'll have options to generate sessions - which will be just opaque tokens. The job of apps consuming this API will be to provide user a way to auth and then store the token in a safe manner. On any future calls/actions to the API it'll use this token to auth some specific user.

## Previously considered approaches

What I initially planned (and actually implemented) was email OTP flow, where you can login/sign-up without password. Code is sent to you via email, you enter it and voila - everything is done. That worked good, but there's one harsh truth - setting up of email provider for a side project is hard to justify, especially for projects which doesn't otherwise need to send those.

I started considering "What's the main thing I'm trying to avoid by using email OTP flow?" and the answer was passwords. Passwords are a pain. They're not so easy to store, you need a way to reset them, you need very complex rate-limiting, ideally you'd integrate HaveIBeenPwned or something like this. They're really complex to do "right".

I also considered OAuth flows - they're very easy, but I had one big concern - I'm basically handing the auth away. It's hard to make e2e tests with OAuth, it's hard to own everything, there are quirks. Preview environments are hard to do correct.

## Passkeys enter the game

With these concerns and requirements in my head I started considering alternatives. And what fits really well here are passkeys and Web Authn:

- They're easy to implement if you grasp them.
- Security is top-notch - it's even hard to mess something up.
- Operationally they're super easy. You own everything, but you don't need to setup anything "special".
- They're kind of future and modern.

There are some cons obviously:

- They're kind of future and modern - that means that for some browsers/users it may be hard to use.
- If you use passkeys only, recovery is a pain (and by pain I mean it doesn't exist 😄).
- I didn't understand them at the beginning, most of guides and tutorials aren't around passkeys only flow - they're about supplementing standard flow with them.
- Compared to OTP email - you need two separate flows, sign in and sign up. You also need additional features for managing passkeys.
- They may not fit ideally in non-browser environments (still not sure how would I do this here).

All of this looks as an excellent set of tradeoffs for personal side project. It's mostly for my own usage, I myself can backup passkey without issues and don't be afraid about losing account. It's not a problem for me that somebody will have issue using them. And the operational simplicity wins everything.

## Step-by-step deep dive

### Sign up

1. Client asks server for registration options while providing some basic info (username, display name for passkey). This can be potentially simplified if you want to opt-in into completely username-less flow, but that's not my cup of tea tbh.
2. On the server user is created (not-yet confirmed) and challenge is created which is stored and can be mapped back for future verification.
3. Browser API is used to trade this registration options for data that's sent back to server.
4. Data from browser is matched to the challenge and verified. If verification passes - we just got our user to successfully register (we confirm them). We create a passkey instance which in the future can be used to authenticate.

### Sign in

1. Client asks server for authentication options - that comes in two flavors. Username-less conditional UI and with user manually entering username. That's mostly browser support thing. Conditional UI wins in terms of UX etc., user entering username manually is mostly a backup.
2. Server, based on the data it received either, creates a generic, non-user bound challenge or creates challenge pre-filtered for given user and lists passkeys that are allowed to be used. Similarly to sign up - it's stored so it can be later on used for future verification.
3. Browser API is used to trade this authentication options for data that's sent back to server.
4. On the server we match the data with existing passkey and voila - user is authenticated.

### Notes:

- A lot of cryptographically complicated stuff is abstracted by library that should almost always be used to implement Web Authn.
- It's a bit of a pain to create not-yet confirmed users and later on deletes them if they don't complete. It may result in UX where someone tries to register, fails due to human error and for a brief moment they can't reuse the username.
- I still need to implement passkeys management in the app. After registering there are some additional thing user should be allowed to do - remove passkey, add a new one. There's also Passkey Signal API which should be used to signal any of these changes to the browser/password manager.
- Splitting sign in vs sign up flow is a bit harder for user but I'm fine with it.
