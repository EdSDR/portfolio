import { readdirSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import { defineConfig } from "vite";
import { frontmatterSchema } from "./src/content/schema.ts";
import { SITE_URL } from "./src/lib/site.ts";
import { imageSize } from "./vite-plugins/image-size.ts";
import { mdxFrontmatter } from "./vite-plugins/mdx-frontmatter.ts";
import { sitemap } from "./vite-plugins/sitemap.ts";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// Pre-bundle deps only reached via lazy/dynamic imports (the 3D scenes).
	// Otherwise Vite discovers them mid-session and its re-optimize + reload can
	// momentarily load two copies of React into the SSR graph, throwing an
	// "Invalid hook call" during dev.
	optimizeDeps: {
		include: ["d3-force-3d", "@react-three/postprocessing", "postprocessing"],
	},
	plugins: [
		// Devtools must remain the first plugin.
		devtools(),
		// `import size from "./img.png?size"` → { width, height } (gallery layout).
		imageSize(),
		// `import fm from "./post.mdx?frontmatter"` → just the frontmatter object,
		// validated here at build time, so the project list doesn't bundle the MDX
		// bodies (or zod).
		mdxFrontmatter({ parse: (data) => frontmatterSchema.parse(data) }),
		// MDX must run before the React/Start transforms so `.mdx` compiles to JS first.
		{
			enforce: "pre",
			...mdx({
				// Strips the YAML block from the rendered body (it's read via ?frontmatter).
				remarkPlugins: [remarkFrontmatter],
			}),
		},
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			// Static prerender: `/` is auto-discovered; crawlLinks walks it to find /work/$slug.
			prerender: {
				enabled: true,
				crawlLinks: true,
				concurrency: 14,
				failOnError: true,
			},
		}),
		// sitemap.xml for the public pages (keep in sync with src/routes).
		sitemap({
			host: SITE_URL,
			paths: () => [
				"/",
				"/gallery",
				...readdirSync("src/content/projects")
					.filter((file) => file.endsWith(".mdx"))
					.map((file) => `/work/${file.replace(/\.mdx$/, "")}`),
			],
		}),
		viteReact({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
	],
});

export default config;
