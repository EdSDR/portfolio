import { createFileRoute, notFound } from "@tanstack/react-router";
import { ogImageUrl } from "@/components/canvas/scenes/registry";
import { getProject } from "@/content";
import { SITE_URL } from "@/lib/site";

/**
 * The expanded project state. This route owns only the URL, slug validation, and
 * per-project head/OG meta — the visible expansion is driven by the slug param
 * inside the persistent ProjectList, so no 3D is torn down on navigation.
 */
export const Route = createFileRoute("/work/$slug")({
	loader: async ({ params }) => {
		const project = getProject(params.slug);
		if (!project) throw notFound();
		// Prefetch the MDX body so the writeup is ready when the card expands
		// (runs on hover-intent preload too).
		await project.loadBody();
		return {
			slug: project.slug,
			name: project.name,
			description: project.description,
		};
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const title = `${loaderData.name} — Ed`;
		const url = `${SITE_URL}/work/${loaderData.slug}`;
		return {
			meta: [
				{ title },
				{ name: "description", content: loaderData.description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: loaderData.description },
				{ property: "og:type", content: "article" },
				{ property: "og:url", content: url },
				{ property: "og:image", content: ogImageUrl(loaderData.slug) },
			],
			links: [{ rel: "canonical", href: url }],
		};
	},
	component: () => null,
});
