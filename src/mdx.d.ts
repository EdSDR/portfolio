declare module "*.mdx" {
	import type { ComponentType } from "react";

	const MDXComponent: ComponentType;
	export default MDXComponent;
}

// `?frontmatter` MDX imports (vite-plugins/mdx-frontmatter.ts); validated with
// Zod in src/content/index.ts, so intentionally loose here.
declare module "*.mdx?frontmatter" {
	const frontmatter: unknown;
	export default frontmatter;
}

// `?size` image imports (vite-plugins/image-size.ts).
declare module "*?size" {
	const size: import("../vite-plugins/image-size.ts").ImageSize;
	export default size;
}
