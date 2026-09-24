declare module "*.mdx" {
	import type { ComponentType } from "react";

	// Raw frontmatter exposed by remark-mdx-frontmatter; validated with Zod in
	// src/content/index.ts, so it is intentionally loose here.
	export const frontmatter: Record<string, unknown>;

	const MDXComponent: ComponentType;
	export default MDXComponent;
}
