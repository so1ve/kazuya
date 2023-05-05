#!/usr/bin/env node

const { resolve } = require("node:path");

const script = process.argv.splice(2, 1)[0];

if (!script) {
  console.error("Usage: kazuya <path> [...arguments]");
  process.exit(1);
}

const pwd = process.cwd();
const { createKazuya } = require("..");
const kazuya = createKazuya(pwd);
const resolved = (process.argv[1] = kazuya.resolve(resolve(pwd, script)));
kazuya(resolved);
