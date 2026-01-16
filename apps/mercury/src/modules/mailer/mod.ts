import { Config, Context, Effect, Layer, Match, Schema } from "effect";
import { createTransport } from "nodemailer";

export class MailerError extends Schema.TaggedError<MailerError>("@naamio/mercury/Electric/MailerError")(
	"MailerError",
	{},
) {}

export class Mailer extends Context.Tag("@naamio/mercury/Mailer")<
	Mailer,
	{
		send: (data: {
			from: string;
			html: string;
			subject: string;
			text: string;
			to: Array<string> | string;
		}) => Effect.Effect<void, MailerError>;
	}
>() {
	static Local = Layer.effect(
		this,
		Effect.gen(function* () {
			const HOST = yield* Config.string("MAILER_LOCAL_HOST");
			const PORT = yield* Config.number("MAILER_LOCAL_PORT");

			const transport = createTransport({ host: HOST, port: PORT });

			return Mailer.of({
				send: Effect.fn(function* (data) {
					yield* Effect.tryPromise({
						catch: () => new MailerError(),
						try: async () =>
							transport.sendMail({
								from: data.from,
								html: data.html,
								subject: data.subject,
								text: data.text,
								to: data.to,
							}),
					});
				}),
			});
		}),
	);

	static Live = Layer.unwrapEffect(
		Effect.gen(function* () {
			const TYPE = yield* Schema.Config("MAILER_TYPE", Schema.Literal("LOCAL"));

			return Match.value(TYPE).pipe(
				Match.when("LOCAL", () => Mailer.Local),
				Match.exhaustive,
			);
		}),
	);
}
