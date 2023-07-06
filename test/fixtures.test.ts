import { dirname, join, resolve } from "node:path";

import { execa } from "execa";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("fixtures", async () => {
	const kazuyaPath = resolve(__dirname, "../bin/kazuya.js");

	const root = dirname(__dirname);
	const dir = join(__dirname, "fixtures");
	const fixtures = await fg("*/index.*", { cwd: dir });

	for (const fixture of fixtures) {
		const name = dirname(fixture);

		it(name, async () => {
			const fixtureEntry = join(dir, fixture);
			const cwd = dirname(fixtureEntry);

			// Clean up absolute paths and sourcemap locations for stable snapshots
			const cleanUpSnap = (str: string) =>
				`${str}\n`
					.replace(/\n\t/g, "\n")
					.replace(/\\+/g, "/")
					.split(cwd.replace(/\\/g, "/"))
					.join("<cwd>") // workaround for replaceAll in Node 14
					.split(root.replace(/\\/g, "/"))
					.join("<root>") // workaround for replaceAll in Node 14
					.replace(/:\d+:\d+([\s')])/g, "$1") // remove line numbers in stacktrace
					.replace(/node:(internal|events)/g, "$1") // in Node 16 internal will be presented as node:internal
					.replace(/\.js\)/g, ")")
					.replace(/file:\/{3}/g, "file://")
					.replace(/ParseError: \w:\/:\s+/, "ParseError: ") // Unknown chars in Windows
					.trim();

			const { stdout, stderr } = await execa(
				"node",
				[kazuyaPath, fixtureEntry],
				{
					cwd,
					stdio: "pipe",
					reject: false,
					env: {
						KAZUYA_CACHE: "false",
						KAZUYA_ESM_RESOLVE: "true",
					},
				},
			);

			if (name.includes("error")) {
				expect(cleanUpSnap(stderr)).toMatchSnapshot("stderr");
			} else {
				// expect no error
				expect(stderr).toBe("");
			}

			expect(cleanUpSnap(stdout)).toMatchSnapshot("stdout");
		});
	}
});
