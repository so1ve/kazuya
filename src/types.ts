import type { Options as SucraseOptions } from "sucrase";

export interface TransformOptions {
  source: string;
  filename?: string;
  ts?: boolean;
  jsx?: boolean;
  sucrase?: SucraseOptions;
}

export interface TransformResult {
  code: string;
  error?: any;
}

export interface KazuyaOptions {
  debug?: boolean;
  cache?: boolean | string;
  requireCache?: boolean;
  v8cache?: boolean;
  interopDefault?: boolean;
  esmResolve?: boolean;
  cacheVersion?: string;
  onError?: (error: Error) => void;
  extensions?: string[];
  transformOptions?: Omit<TransformOptions, "source">;
  alias?: Record<string, string>;
  nativeModules?: string[];
  transformModules?: string[];
}
