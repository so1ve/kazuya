// estree-walker is a pure ESM package
import { parse } from "acorn";
import { walk } from "estree-walker";

const ast = parse('const foo = "bar"', { ecmaVersion: "latest" });

walk(ast, {
  enter(node) {
    console.log("Enter", node.type);
  },
});
