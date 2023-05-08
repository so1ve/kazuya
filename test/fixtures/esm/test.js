const getStack = () => new Error("Boo").stack;

export default () => ({
  file: __filename,
  dir: __dirname,
  // "import.meta.url": import.meta.url,
  stack: getStack()
    .split("\n")
    .splice(1)
    .map((s) => s.trim()),
});
