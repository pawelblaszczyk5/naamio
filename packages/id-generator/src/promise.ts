/*
Based on https://github.com/shuding/legid
MIT License

Copyright (c) 2025 Shu Ding
*/

import { assert } from "@naamio/assert";

const SALT = "custom-salt-for-id-generation";

const STEP = 2;

const ID_LENGTH = 16;

// eslint-disable-next-line no-secrets/no-secrets -- that's custom alphabet for ID generation
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; // cspell:disable-line

const HEX_TO_ALPHABET_RATIO = 1.464_495;

const calculateHexLength = (alphabetLength: number) => Math.floor(alphabetLength * HEX_TO_ALPHABET_RATIO);

const hexToCustomAlphabet = (hex: string) => {
	if (!hex) {
		return "";
	}

	let decimal = BigInt(`0x${hex}`);
	let result = "";

	const base = BigInt(ALPHABET.length);

	do {
		const remainder = decimal % base;

		const char = ALPHABET[Number(remainder)];

		assert(char, "Char must exist here");

		result = char + result;
		decimal /= base;
	} while (decimal > 0n);

	return result;
};

const customAlphabetToHex = (customString: string) => {
	let decimal = 0n;
	const base = BigInt(ALPHABET.length);

	for (const char of customString) {
		const index = ALPHABET.indexOf(char);

		if (index === -1) {
			throw new Error(`Invalid character: ${char}`);
		}
		decimal = decimal * base + BigInt(index);
	}

	return decimal.toString(16);
};

const generateRandomHexToken = (length: number) => {
	const array = new Uint8Array(Math.ceil(length / 2));

	crypto.getRandomValues(array);

	assert(array[0] !== undefined, "Byte array can't be empty");

	while (array[0] < 16) {
		crypto.getRandomValues(array);
	}

	const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

	return hex.slice(0, Math.max(0, length));
};

const arrayBufferToHex = (buffer: ArrayBuffer) => {
	const byteArray = new Uint8Array(buffer);

	return Array.from(byteArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sha1 = async (text: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	const hashBuffer = await crypto.subtle.digest("SHA-1", data);

	return arrayBufferToHex(hashBuffer);
};

export const generateId = async () => {
	const hexLength = calculateHexLength(ID_LENGTH);

	if (STEP > hexLength - 1) {
		throw new Error(`Step cannot be greater than the data length: ${(hexLength - 1).toString()}`);
	}

	const hexToken = generateRandomHexToken(Math.ceil((hexLength * (STEP - 1)) / STEP));

	const hexHash = await sha1(SALT + hexToken);

	let hexId = "";

	let tokenIndex = 0;
	let hashIndex = 0;

	for (let index = 0; index < hexLength; index += 1) {
		if ((index + 1) % STEP === 0) {
			const newChar = hexHash[hashIndex];

			assert(newChar, "Char must exist here");

			hexId += newChar;
			hashIndex += 1;
		} else {
			const newChar = hexToken[tokenIndex];

			assert(newChar, "Char must exist here");

			hexId += newChar;
			tokenIndex += 1;
		}
	}

	return hexToCustomAlphabet(hexId);
};

export const verifyId = async (id: string) => {
	if (id.length !== ID_LENGTH) {
		return false;
	}

	try {
		const hexId = customAlphabetToHex(id);

		let extractedHexToken = "";
		let extractedHexHash = "";

		// eslint-disable-next-line @typescript-eslint/no-misused-spread -- that string contains only spreadable characters
		[...hexId].forEach((char, index) => {
			if ((index + 1) % STEP === 0) {
				extractedHexHash += char;
			} else {
				extractedHexToken += char;
			}
		});

		if (extractedHexHash.length === 0) {
			return false;
		}

		const expectedHexValue = await sha1(SALT + extractedHexToken);

		return expectedHexValue.startsWith(extractedHexHash);
	} catch {
		return false;
	}
};
