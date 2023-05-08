import { createHash } from "node:crypto";
import { accessSync, constants, lstatSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { join } from "pathe";
import type { PackageJson } from "pkg-types";

export function getCacheDir() {
  let _tmpDir = tmpdir();

  // Workaround for pnpm setting an incorrect `TMPDIR`.
  // Set `KAZUYA_RESPECT_TMPDIR_ENV` to a truthy value to disable this workaround.
  // https://github.com/pnpm/pnpm/issues/6140
  // https://github.com/unjs/jiti/issues/120
  if (
    process.env.TMPDIR &&
    _tmpDir === process.cwd() &&
    !process.env.KAZUYA_RESPECT_TMPDIR_ENV
  ) {
    const _env = process.env.TMPDIR;
    delete process.env.TMPDIR;
    _tmpDir = tmpdir();
    process.env.TMPDIR = _env;
  }

  return join(_tmpDir, "node-kazuya");
}

export function isDir(filename: string): boolean {
  try {
    const stat = lstatSync(filename);

    return stat.isDirectory();
  } catch {
    // lstatSync throws an error if path doesn't exist
    return false;
  }
}

export function isWritable(filename: string): boolean {
  try {
    accessSync(filename, constants.W_OK);

    return true;
  } catch {
    return false;
  }
}

export const md5 = (content: string, len = 8) =>
  createHash("md5").update(content).digest("hex").slice(0, len);

export const isObject = (val: any) => val !== null && typeof val === "object";

export function readNearestPackageJSON(path: string): PackageJson | undefined {
  while (path && path !== "." && path !== "/") {
    path = join(path, "..");
    try {
      const pkg = readFileSync(join(path, "package.json"), "utf8");
      try {
        return JSON.parse(pkg);
      } catch {}
      break;
    } catch {}
  }
}
