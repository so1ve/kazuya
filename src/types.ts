import type { Options as SucraseOptions } from "sucrase";

export interface TransformOptions {
  source: string;
  filename?: string;
  ts?: boolean;
  jsx?: boolean;
  retainLines?: boolean;
  legacy?: boolean;
  sucrase?: SucraseOptions;
}

export interface TRANSFORM_RESULT {
  code: string;
  error?: any;
}

export interface KazuyaOptions {
  transform?: (opts: TransformOptions) => TRANSFORM_RESULT;
  debug?: boolean;
  cache?: boolean | string;
  sourceMaps?: boolean;
  requireCache?: boolean;
  v8cache?: boolean;
  interopDefault?: boolean;
  esmResolve?: boolean;
  cacheVersion?: string;
  onError?: (error: Error) => void;
  legacy?: boolean;
  extensions?: string[];
  transformOptions?: Omit<TransformOptions, "source">;
  alias?: Record<string, string>;
  nativeModules?: string[];
  transformModules?: string[];
}
