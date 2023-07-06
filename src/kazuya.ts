import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Module, builtinModules } from "node:module";
import { platform } from "node:os";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

import createRequire from "create-require";
import destr from "destr";
import escapeStringRegexp from "escape-string-regexp";
import { hasESMSyntax, interopDefault, resolvePathSync } from "mlly";
import objectHash from "object-hash";
import { basename, dirname, extname, join } from "pathe";
import { normalizeAliases, resolveAlias } from "pathe/utils";
import { addHook } from "pirates";

import sucrase from "./sucrase";
import type { Kazuya, KazuyaOptions } from "./types";
import {
  getCacheDir,
  isDir,
  isWritable,
  md5,
  readNearestPackageJSON,
} from "./utils";

const _EnvDebug = destr(process.env.KAZUYA_DEBUG);
const _EnvCache = destr(process.env.KAZUYA_CACHE);
const _EnvESMResolve = destr(process.env.KAZUYA_ESM_RESOLVE);
const _EnvRequireCache = destr(process.env.KAZUYA_REQUIRE_CACHE);
const _EnvAlias = destr(process.env.KAZUYA_ALIAS);
const _EnvTransform = destr(process.env.KAZUYA_TRANSFORM_MODULES);
const _EnvNative = destr(process.env.KAZUYA_NATIVE_MODULES);

const isWindows = platform() === "win32";

const defaults: KazuyaOptions = {
  debug: _EnvDebug,
  cache: _EnvCache === undefined ? true : !!_EnvCache,
  requireCache: _EnvRequireCache === undefined ? true : !!_EnvRequireCache,
  interopDefault: false,
  esmResolve: _EnvESMResolve || false,
  cacheVersion: "7",
  extensions: [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".json"],
  alias: _EnvAlias,
  nativeModules: _EnvNative || [],
  transformModules: _EnvTransform || [],
};

const JS_EXT_RE = /\.(c|m)?j(sx?)$/;
const TS_EXT_RE = /\.(c|m)?t(sx?)$/;

export default function createKazuya(
  _filename: string,
  opts: KazuyaOptions = {},
  parentModule?: typeof module,
  requiredModules?: Record<string, typeof module>,
): Kazuya {
  opts = { ...defaults, ...opts };

  if (opts.transformOptions) {
    opts.cacheVersion += `-${objectHash(opts.transformOptions)}`;
  }

  // Normalize aliases (and disable if non given)
  const alias =
    opts.alias && Object.keys(opts.alias).length > 0
      ? normalizeAliases(opts.alias || {})
      : null;

  // List of modules to force transform or native
  const nativeModules = ["typescript", "kazuya", ...(opts.nativeModules ?? [])];
  const transformModules = [...(opts.transformModules ?? [])];
  const isNativeRe = new RegExp(
    `node_modules/(${nativeModules
      .map((m) => escapeStringRegexp(m))
      .join("|")})/`,
  );
  const isTransformRe = new RegExp(
    `node_modules/(${transformModules
      .map((m) => escapeStringRegexp(m))
      .join("|")})/`,
  );

  function debug(...args: string[]) {
    if (opts.debug) {
      // eslint-disable-next-line no-console
      console.log("[kazuya]", ...args);
    }
  }

  // If filename is dir, createRequire goes with parent directory, so we need fakepath
  if (!_filename) {
    _filename = process.cwd();
  }
  if (isDir(_filename)) {
    _filename = join(_filename, "index.js");
  }

  if (opts.cache === true) {
    opts.cache = getCacheDir();
  }
  if (opts.cache) {
    try {
      mkdirSync(opts.cache, { recursive: true });
      if (!isWritable(opts.cache)) {
        throw new Error("directory is not writable");
      }
    } catch (error: any) {
      debug("Error creating cache directory at ", opts.cache, error);
      opts.cache = false;
    }
  }

  const nativeRequire = createRequire(
    isWindows
      ? _filename.replace(/\//g, "\\") // Import maps does not work with normalized paths!
      : _filename,
  );

  function tryResolve(id: string, options?: { paths?: string[] }) {
    try {
      return nativeRequire.resolve(id, options);
    } catch {}
  }

  const _url = pathToFileURL(_filename);
  const _additionalExts = [...opts.extensions!].filter((ext) => ext !== ".js");
  function _resolve(id: string, options?: { paths?: string[] }) {
    let resolved, err;

    // Resolve alias
    if (alias) {
      id = resolveAlias(id, alias);
    }

    // Try ESM resolve
    if (opts.esmResolve) {
      const conditionSets = [
        ["node", "require"],
        ["node", "import"],
      ];
      for (const conditions of conditionSets) {
        try {
          resolved = resolvePathSync(id, {
            url: _url,
            conditions,
          });
        } catch (error) {
          err = error;
        }
        if (resolved) {
          return resolved;
        }
      }
    }

    // Try native require resolve
    try {
      return nativeRequire.resolve(id, options);
    } catch (error) {
      err = error;
    }
    for (const ext of _additionalExts) {
      resolved =
        tryResolve(id + ext, options) ??
        tryResolve(`${id}/index${ext}`, options);
      if (resolved) {
        return resolved;
      }
      // Try resolving .ts files with .js extension
      if (TS_EXT_RE.test(parentModule?.filename || "")) {
        resolved = tryResolve(id.replace(JS_EXT_RE, ".$1t$2"), options);
        if (resolved) {
          return resolved;
        }
      }
    }
    throw err;
  }
  _resolve.paths = nativeRequire.resolve.paths;

  function getCache(
    filename: string | undefined,
    source: string,
    get: () => string,
  ): string {
    if (!opts.cache || !filename) {
      return get();
    }

    // Calculate source hash
    const sourceHash = ` /* v${opts.cacheVersion!}-${md5(source, 16)} */`;

    // Check cache file
    const filebase = `${basename(dirname(filename))}-${basename(filename)}`;
    const cacheFile = join(
      opts.cache as string,
      `${filebase}.${md5(filename)}.js`,
    );

    if (existsSync(cacheFile)) {
      const cacheSource = readFileSync(cacheFile, "utf8");
      if (cacheSource.endsWith(sourceHash)) {
        debug("[cache hit]", filename, "~>", cacheFile);

        return cacheSource;
      }
    }

    debug("[cache miss]", filename);
    const result = get();

    if (!result.includes("__KAZUYA_ERROR__")) {
      writeFileSync(cacheFile, result + sourceHash, "utf8");
    }

    return result;
  }

  function transform(topts: any): string {
    let code = getCache(topts.filename, topts.source, () => {
      const res = sucrase({
        ...opts.transformOptions,
        ...topts,
      });
      if (res.error && opts.debug) {
        debug(res.error);
      }

      return res.code;
    });
    if (code.startsWith("#!")) {
      code = `// ${code}`;
    }

    return code;
  }

  const _interopDefault = (mod: any) =>
    opts.interopDefault ? interopDefault(mod) : mod;

  function kazuya(id: string) {
    // Check for node: and file: protocol
    if (id.startsWith("node:")) {
      id = id.slice(5);
    } else if (id.startsWith("file:")) {
      id = fileURLToPath(id);
    }

    // Check for builtin node module like fs
    if (builtinModules.includes(id) || id === ".pnp.js" /* #24 */) {
      return nativeRequire(id);
    }

    // Resolve path
    const filename = _resolve(id);
    const ext = extname(filename);

    // Check for .json modules
    if (ext === ".json") {
      debug("[json]", filename);
      const jsonModule = nativeRequire(id);
      Object.defineProperty(jsonModule, "default", { value: jsonModule });

      return jsonModule;
    }

    // Unknown format
    if (ext && !opts.extensions!.includes(ext)) {
      debug("[unknown]", filename);

      return nativeRequire(id);
    }

    // Force native modules
    if (isNativeRe.test(filename)) {
      debug("[native]", filename);

      return nativeRequire(id);
    }

    // Check for CJS cache
    if (requiredModules?.[filename]) {
      return _interopDefault(requiredModules[filename]?.exports);
    }
    if (opts.requireCache && nativeRequire.cache[filename]) {
      return _interopDefault(nativeRequire.cache[filename]?.exports);
    }

    // Read source
    let source = readFileSync(filename, "utf8");

    // Transpile
    const isTypescript = ext === ".ts" || ext === ".mts" || ext === ".cts";
    const isNativeModule =
      ext === ".mjs" ||
      (ext === ".js" && readNearestPackageJSON(filename)?.type === "module");
    const isCommonJS = ext === ".cjs";
    const needsTranspile =
      !isCommonJS &&
      (isTypescript ||
        isNativeModule ||
        isTransformRe.test(filename) ||
        hasESMSyntax(source));

    const start = performance.now();
    if (needsTranspile) {
      source = transform({ filename, source, ts: isTypescript });
      const time = Math.round((performance.now() - start) * 1000) / 1000;
      debug(
        `[transpile]${isNativeModule ? " [esm]" : ""}`,
        filename,
        `(${time}ms)`,
      );
    } else {
      try {
        debug("[native]", filename);

        return _interopDefault(nativeRequire(id));
      } catch (error: any) {
        debug("Native require error:", error);
        debug("[fallback]", filename);
        source = transform({ filename, source, ts: isTypescript });
      }
    }

    // Compile module
    const mod = new Module(filename);
    mod.filename = filename;
    if (parentModule) {
      // eslint-disable-next-line etc/no-deprecated
      mod.parent = parentModule;
      if (
        Array.isArray(parentModule.children) &&
        !parentModule.children.includes(mod)
      ) {
        parentModule.children.push(mod);
      }
    }
    mod.require = createKazuya(filename, opts, mod, requiredModules ?? {});

    mod.path = dirname(filename);

    // @ts-expect-error
    mod.paths = Module._nodeModulePaths(mod.path);

    // Set CJS cache before eval
    if (requiredModules) {
      requiredModules[filename] = mod;
    }
    if (opts.requireCache) {
      nativeRequire.cache[filename] = mod;
    }

    // Compile wrapped script
    let compiled;
    try {
      // mod._compile wraps require and require.resolve to global function
      compiled = vm.runInThisContext(Module.wrap(source), {
        filename,
        lineOffset: 0,
        displayErrors: false,
      });
    } catch (error: any) {
      if (opts.requireCache) {
        delete nativeRequire.cache[filename];
      }
      opts.onError!(error);
    }

    // Evaluate module
    try {
      compiled(
        mod.exports,
        mod.require,
        mod,
        mod.filename,
        dirname(mod.filename),
      );
    } catch (error: any) {
      if (opts.requireCache) {
        delete nativeRequire.cache[filename];
      }
      opts.onError!(error);
    }

    // Remove from required modules cache
    if (requiredModules) {
      delete requiredModules[filename];
    }

    // Check for parse errors
    if (mod.exports?.__KAZUYA_ERROR__) {
      const { filename, line, column, code, message } =
        mod.exports.__KAZUYA_ERROR__;
      const loc = `${filename}:${line}:${column}`;
      const err = new Error(`${code}: ${message} \n ${loc}`);
      Error.captureStackTrace(err, kazuya);
      opts.onError!(err);
    }

    // Set as loaded
    mod.loaded = true;

    // interopDefault
    const _exports = _interopDefault(mod.exports);

    // Return exports
    return _exports;
  }

  const register = () =>
    addHook(
      (source: string, filename: string) =>
        kazuya.transform({
          source,
          filename,
          ts: !!/\.[cm]?ts$/.test(filename),
        }),
      { exts: opts.extensions },
    );

  kazuya.resolve = _resolve;
  kazuya.cache = opts.requireCache ? nativeRequire.cache : {};
  // eslint-disable-next-line etc/no-deprecated
  kazuya.extensions = nativeRequire.extensions;
  kazuya.main = nativeRequire.main;
  kazuya.transform = transform;
  kazuya.register = register;

  return kazuya;
}
