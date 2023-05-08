import { child } from "./parent.mjs";
import { test as satisfiesTest } from "./satisfies";

export type { Test } from "./types";

console.log(satisfiesTest());
console.log(child());
