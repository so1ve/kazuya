# kazuya

[![NPM version](https://img.shields.io/npm/v/kazuya?color=a1b858&label=)](https://www.npmjs.com/package/kazuya)

Runtime Typescript and ESM support for Node.js.

## Why Kazuya? Why not jiti?

Kazuya is forked from [jiti](https://github.com/unjs/jiti). It uses sucrase instaed of babel.

Sucrase is an alternative to Babel that allows super-fast development builds. It has better performance and smaller size, and supports only a subset of features to help you avoid unnecessary transforms.

Pros:

- Faster loading time
- Smaller bundle size

Cons:

- Less features (Does not support import.meta and decorators)
- No support for older node versions
- No sourcemap support
- No custom transform support

## Features

- Seamless typescript and ESM syntax support
- Seamless interoperability between ESM and CommonJS
- Synchronous API to replace `require`
- Super slim and zero dependency
- Smart syntax detection to avoid extra transforms
- CommonJS cache integration
- Filesystem transpile hard cache
- V8 compile cache
- Custom resolve alias

## Usage

### Programmatic

```js
const { createKazuya } = require("kazuya");

const kazuya = createKazuya(__filename);

kazuya("./path/to/file.ts");
```

You can also pass options as second argument:

```js
const { createKazuya } = require("kazuya");

const kazuya = createKazuya(__filename, { debug: true });
```

### CLI

```bash
kazuya index.ts
# or npx kazuya index.ts
```

### Register require hook

```bash
node -r kazuya/register index.ts
```

Alternatively, you can register `kazuya` as a require hook programmatically:

```js
const { createKazuya } = require("kazuya");

const kazuya = createKazuya();
const unregister = kazuya.register();
```

## Options

### `debug`

- Type: Boolean
- Default: `false`
- Environment Variable: `KAZUYA_DEBUG`

Enable debug to see which files are transpiled.

### `cache`

- Type: Boolean | String
- Default: `true`
- Environment Variable: `KAZUYA_CACHE`

Use transpile cache

If set to `true` will use `node_modules/.cache/kazuya` (if exists) or `{TMP_DIR}/node-kazuya`.

### `esmResolve`

- Type: Boolean | String
- Default: `false`
- Environment Variable: `KAZUYA_ESM_RESOLVE`

Using esm resolution algorithm to support `import` condition.

### `interopDefault`

- Type: Boolean
- Default: `false`

Return the `.default` export of a module at the top-level.

### `alias`

- Type: Object
- Default: -
- Environment Variable: `KAZUYA_ALIAS`

Custom alias map used to resolve ids.

### `nativeModules`

- Type: Array
- Default: `["typescript"]`
- Environment Variable: `KAZUYA_NATIVE_MODULES`

List of modules (within `node_modules`) to always use native require for them.

### `transformModules`

- Type: Array
- Default: `[]`
- Environment Variable: `KAZUYA_TRANSFORM_MODULES`

List of modules (within `node_modules`) to transform them regardless of syntax.

## Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run `pnpm watch`
- Run `pnpm kazuya ./test/path/to/file.ts`

## About the name

![](./assets/kazuya.jpg)
## Credits

Forked from [jiti](https://github.com/unjs/jiti).

## 📝 License

[MIT](./LICENSE). Made with ❤️ by [Ray](https://github.com/so1ve)
