import type { ComponentType, FulfilledReactPromise, ReactPromise } from "react";
import type { Frontmatter } from "./schema";

type BodyModule = { default: ComponentType };

// Only the frontmatter is eager (`?frontmatter`, vite-plugins/mdx-frontmatter.ts),
// so listing projects doesn't pull every writeup into the entry bundle. Each
// MDX body is its own chunk, imported when its project is opened. The
// frontmatter is validated against `frontmatterSchema` at build time (see
// vite.config.ts), so zod never ships to the client.
const frontmatters = import.meta.glob<Frontmatter>("./projects/*.mdx", {
	eager: true,
	query: "?frontmatter",
	import: "default",
});

const bodies = import.meta.glob<BodyModule>("./projects/*.mdx");

export type Project = Frontmatter & {
	slug: string;
	/** Imports the compiled MDX body once; the route loader calls it to prefetch. */
	loadBody: () => ReactPromise<BodyModule>;
};

function toSlug(path: string): string {
	return (
		path
			.split("/")
			.pop()
			?.replace(/\.mdx$/, "") ?? path
	);
}

/**
 * Imports a body once. After it has loaded, returns a fulfilled promise that
 * React's `use()` reads synchronously, so a body the route loader already
 * fetched renders without suspending: no "Loading" flash on open, and the
 * prerendered HTML contains the writeup itself instead of a fallback.
 */
function cachedBody(
	load: () => Promise<BodyModule>,
): () => ReactPromise<BodyModule> {
	let pending: Promise<BodyModule> | undefined;
	let loaded: FulfilledReactPromise<BodyModule> | undefined;
	return () => {
		if (loaded) return loaded;
		pending ??= load().then((value) => {
			const settled: { status: "fulfilled"; value: BodyModule } = {
				status: "fulfilled",
				value,
			};
			loaded = Object.assign(Promise.resolve(value), settled);
			return value;
		});
		return pending;
	};
}

export const projects: Project[] = Object.entries(frontmatters)
	.map(([path, frontmatter]) => ({
		slug: toSlug(path),
		...frontmatter,
		loadBody: cachedBody(bodies[path]),
	}))
	.sort((a, b) => b.date.getTime() - a.date.getTime());

export function getProject(slug: string): Project | undefined {
	return projects.find((p) => p.slug === slug);
}
