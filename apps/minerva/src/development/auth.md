# Auth

When talking about the auth flow, there're two main focuses that are worth discussing. How the auth will work with the app being split and how user could auth themselves into the app. Let's talk about them, one-by-one.

## Split between applications

As mentioned in [Architecture](/development/architecture) overview there'll be a separate API app, which will serve the web app at the beginning but could potentially scale to other clients as well in the future. That requires a bit more sophisticated session handling than what I've already used.

For a moment I considered making API black box which would be accessible only from private networking and it'd just straight up accept user ID and act on it. In that scenario, each app would have its own sessions system and the API would act on ID's which would be 100% to be valid/correct/authed. However, that makes it hard to e.g. making a pure SPA, VSCode extension, TUI or mobile app. Each of these would need an additional proxy API which would handle that. Moreover, you couldn't log out from all apps at once, because they'd be completely separate systems.

After consideration I landed on making API manage, forge, revoke and source of truth about everything related to session. It'll have options to generate sessions - which will be just opaque tokens. The job of apps consuming this API will be to provide user a way to auth and then store the token in a safely manner. On any future calls/actions to the API it'll use this token to auth some specific user.

## The way of auth

What I plan to implement is some OTP-like mechanism, where you can login/sign-up without password. The only thing you need is an email address. It'll initiate a flow which will result in email being sent to your address. It'll contain a short-lived code that can be used on the specific device where the flow was initialized to create login. That makes login/sign-up flow unified and is a bit simpler imho than standard password flow to make it secure.

Expiration, invalidation, and rate-limiting policies must be defined during implementation.

### Step-by-step deep dive

1. User initializes session creation inside of the application, which can communicate with the API.
2. The API starts the flow by doing following:
   - Generating code and state and storing them both in database.
   - Email is being sent to the user, containing the code.
   - State is returned to the API caller.
3. Inside of the application new UI is presented which allows entering the code. State is stored securely for the time of the process.
4. User receives an email, which contains the code.
5. After user enters the code in the UI, both code and stored state is being sent back to the API.
6. API receives code and state and proceeds to verify both of them.
7. If everything passes, new session is forged and opaque token is sent to the app.
8. App is responsible for storing this in secure manner + sending it for user requests. From this point forwards user can do actions which requires auth.

### Notes:

- Code doesn't need to have some time-based factor included in the generation algorithm, because it's stored in the database and is meant to be verified with it. That makes it trivial to implement.
- Code must be stored as hashed/salted thing on database level. Hence, we can't really resend it - resending would mean initializing a new flow, and invalidating the old one.
- It's important to use constant time equality check to don't be vulnerable to time-based attacks. It's probably impossible with multiple API layers anyway, but it's a good practice.
- Should code be invalidated anyway if it's valid but state is invalid? That sounds like a situation where some shady stuff is going on so it's probably safer to do.
- We need rate limiting for sending emails containing new code and for verifying codes.
- It should still be possible to initiate multiple auth flows at the same time, because you can concurrently auth yourself on both mobile and desktop device.
- That setup allows us to create easy session management, with e.g. signing out from all devices.
