import type { Options as SucraseTransformOptions } from "sucrase";
import { transform as sucraseTransform } from "sucrase";

import type { TransformOptions, TransformResult } from "./types";

export default function transform(options: TransformOptions): TransformResult {
  const sucraseOptions: SucraseTransformOptions = {
    transforms: ["imports"],
    ...options.sucrase,
  };

  if (options.ts) {
    sucraseOptions.transforms.push("typescript");
  }

  if (options.jsx) {
    sucraseOptions.transforms.push("jsx");
  }

  try {
    return {
      code: sucraseTransform(options.source, sucraseOptions)?.code || "",
    };
  } catch (error: any) {
    return {
      error,
      // TODO
      code: `exports.__KAZUYA_ERROR__ = ${JSON.stringify({
        filename: options.filename,
        line: error.loc?.line || 0,
        column: error.loc?.column || 0,
        code: error.code,
        message: error.message?.replace("/: ", "").replace(/\(.+\)\s*$/, ""),
      })}`,
    };
  }
}
