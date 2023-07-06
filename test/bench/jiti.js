console.time("kazuya_init");
const kazuya = require("../..")(__filename);

console.timeEnd("kazuya_init");

for (let i = 0; i < 3; i++) {
	console.time("kazuya_require");
	kazuya("../fixtures/esm").test();
	console.timeEnd("kazuya_require");
}
