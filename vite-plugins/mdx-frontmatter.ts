import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { parse as parseYaml } from "yaml";

const QUERY = "?frontmatter";
// A virtual (\0-prefixed) id: @mdx-js/rollup strips queries before matching
// `.mdx`, so a plain `file.mdx?frontmatter` id would get compiled as MDX.
const PREFIX = "\0mdx-frontmatter:";

/**
 * `import fm from "./post.mdx?frontmatter"` → the file's YAML frontmatter as a
 * plain object, without compiling (or bundling) the MDX body. Lets the project
 * list import every frontmatter eagerly while the bodies stay lazy chunks.
 *
 * `parse` validates/normalizes the data at build time (throwing fails the
 * build or dev request), so no validation library ships to the client.
 */
export function mdxFrontmatter({
	parse = (data) => data,
}: {
	parse?: (data: unknown) => unknown;
} = {}): Plugin {
	return {
		name: "mdx-frontmatter",
		enforce: "pre",
		async resolveId(source, importer) {
			if (!source.endsWith(`.mdx${QUERY}`)) return null;
			const resolved = await this.resolve(
				source.slice(0, -QUERY.length),
				importer,
				{ skipSelf: true },
			);
			return resolved ? PREFIX + resolved.id : null;
		},
		async load(id) {
			if (!id.startsWith(PREFIX)) return null;
			const file = id.slice(PREFIX.length);
			this.addWatchFile(file);
			const source = await readFile(file, "utf8");
			const yaml = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
			const data = parse(yaml ? parseYaml(yaml) : {});
			return `export default ${toJs(data)};`;
		},
	};
}

/** Serializes plain data to a JS expression, keeping Dates as Dates. */
function toJs(value: unknown): string {
	if (value instanceof Date)
		return `new Date(${JSON.stringify(value.toISOString())})`;
	if (Array.isArray(value)) return `[${value.map(toJs).join(",")}]`;
	if (value && typeof value === "object") {
		const entries = Object.entries(value).map(
			([key, v]) => `${JSON.stringify(key)}:${toJs(v)}`,
		);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value) ?? "undefined";
}
