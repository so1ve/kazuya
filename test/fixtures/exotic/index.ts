import * as ts from "typescript";

console.log("Typescript:", "mapEntries" in ts);

// https://github.com/so1ve/kazuya/issues/56
console.log("Config:", "getFilesOrder" in require("config/parser"));
