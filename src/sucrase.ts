import type { Options as SucraseTransformOptions } from "sucrase";
import { transform as sucraseTransform } from "sucrase";

import type { TRANSFORM_RESULT, TransformOptions } from "./types";

export default function transform(options: TransformOptions): TRANSFORM_RESULT {
  const sucraseOptions: SucraseTransformOptions = {
    transforms: ["imports"],
  };

  if (options.ts) {
    sucraseOptions.transforms.push("typescript");
  }

  if (options.jsx) {
    sucraseOptions.transforms.push("jsx");
  }

  Object.assign(sucraseOptions, options.sucrase);

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
