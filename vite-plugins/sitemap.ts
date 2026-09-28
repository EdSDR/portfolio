import type { Plugin } from "vite";

/**
 * Emits `sitemap.xml` into the client build. Replaces Start's built-in
 * sitemap, which writes an `https://` sitemaps.org namespace (the protocol
 * specifies `http://`, and namespaces compare as exact strings) and also
 * publishes a `pages.json`.
 */
export function sitemap({
	host,
	paths,
}: {
	host: string;
	paths: () => string[];
}): Plugin {
	return {
		name: "sitemap",
		apply: "build",
		generateBundle() {
			if (this.environment.name !== "client") return;
			const urls = paths()
				.map((path) => `  <url><loc>${host}${path}</loc></url>`)
				.join("\n");
			this.emitFile({
				type: "asset",
				fileName: "sitemap.xml",
				source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
			});
		},
	};
}
