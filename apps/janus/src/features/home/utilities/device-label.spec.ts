import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { extractDeviceLabel } from "#src/features/home/utilities/device-label.js";

// cspell:ignore KHTML, Edgi

const extractDeviceLabelToStringOrNull = (userAgent: string) =>
	extractDeviceLabel(userAgent).pipe(Effect.map(Option.getOrNull));

it.effect(
	"Should properly extract device label from various user agents",
	Effect.fn(function* () {
		// Chrome
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Chrome · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Chrome · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Chrome · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/143.0.7499.151 Mobile/15E148 Safari/604.1",
			),
		).toMatchInlineSnapshot(`"Chrome · Mobile"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.110 Mobile Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Chrome · Mobile"`);

		// Firefox
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0",
			),
		).toMatchInlineSnapshot(`"Firefox · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 15.7; rv:146.0) Gecko/20100101 Firefox/146.0",
			),
		).toMatchInlineSnapshot(`"Firefox · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull("Mozilla/5.0 (X11; Linux i686; rv:146.0) Gecko/20100101 Firefox/146.0"),
		).toMatchInlineSnapshot(`"Firefox · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/146.0 Mobile/15E148 Safari/605.1.15",
			),
		).toMatchInlineSnapshot(`"Firefox · Mobile"`);
		expect(
			yield* extractDeviceLabelToStringOrNull("Mozilla/5.0 (Android 16; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0"),
		).toMatchInlineSnapshot(`"Firefox · Mobile"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Android 9.4; Tablet; SM-T290; rv:136.0) Gecko/136.0 Firefox/136.0",
			),
		).toMatchInlineSnapshot(`"Firefox · Tablet"`);

		// Safari
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
			),
		).toMatchInlineSnapshot(`"Safari · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
			),
		).toMatchInlineSnapshot(`"Safari · Mobile"`);

		// Edge
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.3650.96",
			),
		).toMatchInlineSnapshot(`"Edge · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.3650.96",
			),
		).toMatchInlineSnapshot(`"Edge · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.110 Mobile Safari/537.36 EdgA/143.0.3650.112",
			),
		).toMatchInlineSnapshot(`"Edge · Mobile"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 EdgiOS/143.3650.130 Mobile/15E148 Safari/605.1.15",
			),
		).toMatchInlineSnapshot(`"Edge · Mobile"`);

		// Opera
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/124.0.0.0",
			),
		).toMatchInlineSnapshot(`"Opera · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/124.0.0.0",
			),
		).toMatchInlineSnapshot(`"Opera · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/124.0.0.0",
			),
		).toMatchInlineSnapshot(`"Opera · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.110 Mobile Safari/537.36 OPR/76.2.4027.73374",
			),
		).toMatchInlineSnapshot(`"Opera · Mobile"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.110 Mobile Safari/537.36 OPR/76.2.4027.73374",
			),
		).toMatchInlineSnapshot(`"Opera · Mobile"`);

		// Vivaldi
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Vivaldi/7.7.3851.66",
			),
		).toMatchInlineSnapshot(`"Vivaldi · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Vivaldi/7.7.3851.66",
			),
		).toMatchInlineSnapshot(`"Vivaldi · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Vivaldi/7.7.3851.66",
			),
		).toMatchInlineSnapshot(`"Vivaldi · Desktop"`);

		// Brave
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.5769.42 Safari/537.36 Brave/57.0.9566.140	",
			),
		).toMatchInlineSnapshot(`"Brave · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0 Brave Browser/143.0.0.0 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Brave · Desktop"`);
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Brave Chrome/133.0.6904.0 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Brave · Desktop"`);

		// SeaMonkey
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (Windows NT 5.0; U; Debian; fr; rev:7.5) Firefox/95.7.9 AppleWebKit/67.8.9 SeaMonkey/67.0.8",
			),
		).toMatchInlineSnapshot(`"SeaMonkey · Desktop"`);

		// Chromium
		expect(
			yield* extractDeviceLabelToStringOrNull(
				"Mozilla/5.0 (X11; U; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/122.0.6348.202 Chrome/122.0.6348.202 Safari/537.36",
			),
		).toMatchInlineSnapshot(`"Chromium · Desktop"`);
	}),
);
