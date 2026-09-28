import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { parse } from "yaml";

const QUERY = "?frontmatter";
// A virtual (\0-prefixed) id: @mdx-js/rollup strips queries before matching
// `.mdx`, so a plain `file.mdx?frontmatter` id would get compiled as MDX.
const PREFIX = "\0mdx-frontmatter:";

/**
 * `import fm from "./post.mdx?frontmatter"` → the file's YAML frontmatter as a
 * plain object, without compiling (or bundling) the MDX body. Lets the project
 * list import every frontmatter eagerly while the bodies stay lazy chunks.
 */
export function mdxFrontmatter(): Plugin {
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
			return `export default ${JSON.stringify(yaml ? parse(yaml) : {})};`;
		},
	};
}
