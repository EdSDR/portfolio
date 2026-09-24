import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		// Devtools must remain the first plugin.
		devtools(),
		// MDX must run before the React/Start transforms so `.mdx` compiles to JS first.
		{
			enforce: "pre",
			...mdx({
				// Exposes typed frontmatter as a named `frontmatter` export per file.
				remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
				// Lets writeups use shared components via <MDXProvider>.
				providerImportSource: "@mdx-js/react",
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
		viteReact({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
	],
});

export default config;
