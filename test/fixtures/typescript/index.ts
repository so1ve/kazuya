import { test as satisfiesTest } from "./satisfies";
import { child } from "./parent.mjs";

export type { Test } from "./types";

console.log(satisfiesTest());
console.log(child());
