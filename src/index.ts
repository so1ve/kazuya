import type { KazuyaOptions } from "./types";
import kazuya from "./kazuya";

function onError(err: any) {
  throw err; /* ↓ Check stack trace ↓ */
}

module.exports = function (filename: string, opts: KazuyaOptions) {
  opts = { onError, ...opts };

  return kazuya(filename, opts);
};
