import kazuya from "./kazuya";
import type { KazuyaOptions } from "./types";

function onError(err: any) {
	throw err; /* ↓ Check stack trace ↓ */
}

export function createKazuya(filename: string, opts: KazuyaOptions) {
	opts = { onError, ...opts };

	return kazuya(filename, opts);
}

export * from "./types";
