declare module "*.mdx" {
	import type { ComponentType } from "react";

	// Raw frontmatter exposed by remark-mdx-frontmatter; validated with Zod in
	// src/content/index.ts, so it is intentionally loose here.
	export const frontmatter: Record<string, unknown>;

	const MDXComponent: ComponentType;
	export default MDXComponent;
}

// `?size` image imports (vite-plugins/image-size.ts).
declare module "*?size" {
	const size: { width: number; height: number };
	export default size;
}
