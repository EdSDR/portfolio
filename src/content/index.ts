import { type ComponentType, lazy } from "react";
import { type Frontmatter, frontmatterSchema } from "./schema";

type BodyModule = { default: ComponentType };

// Frontmatter is cheap — load it eagerly to build the list. The MDX body
// (heavier) stays lazy and is imported only when a project is opened.
const frontmatters = import.meta.glob("./projects/*.mdx", {
	eager: true,
	import: "frontmatter",
}) as Record<string, unknown>;

const bodies = import.meta.glob("./projects/*.mdx") as Record<
	string,
	() => Promise<BodyModule>
>;

export type Project = Frontmatter & {
	slug: string;
	/** Imports the compiled MDX body (the route loader calls it to prefetch). */
	loadBody: () => Promise<BodyModule>;
	/** The body as a lazy component — one per project, so it's cached across opens. */
	Body: ComponentType;
};

function toSlug(path: string): string {
	return (
		path
			.split("/")
			.pop()
			?.replace(/\.mdx$/, "") ?? path
	);
}

export const projects: Project[] = Object.entries(frontmatters)
	.map(([path, raw]) => ({
		slug: toSlug(path),
		...frontmatterSchema.parse(raw),
		loadBody: bodies[path],
		Body: lazy(bodies[path]),
	}))
	.sort((a, b) => b.date.getTime() - a.date.getTime());

export const projectSlugs: string[] = projects.map((p) => p.slug);

export function getProject(slug: string): Project | undefined {
	return projects.find((p) => p.slug === slug);
}
