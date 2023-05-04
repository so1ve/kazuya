/* eslint-disable @typescript-eslint/no-var-requires */
import type { KazuyaOptions } from "./types";

function onError(err: any) {
  throw err; /* ↓ Check stack trace ↓ */
}

module.exports = function (filename: string, opts: KazuyaOptions) {
  const kazuya = require("./kazuya");

  opts = { onError, ...opts };

  if (!opts.transform) {
    opts.transform = require("./sucrase");
  }

  return kazuya(filename, opts);
};
