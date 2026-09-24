import { createFileRoute, notFound } from "@tanstack/react-router";
import { getProject } from "@/content";

/**
 * The expanded project state. This route owns only the URL, slug validation, and
 * per-project head/OG meta — the visible expansion is driven by the slug param
 * inside the persistent ProjectList, so no 3D is torn down on navigation.
 */
export const Route = createFileRoute("/work/$slug")({
	loader: ({ params }) => {
		const project = getProject(params.slug);
		if (!project) throw notFound();
		return { name: project.name, description: project.description };
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const title = `${loaderData.name} — Ed`;
		return {
			meta: [
				{ title },
				{ name: "description", content: loaderData.description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: loaderData.description },
				{ property: "og:type", content: "article" },
			],
		};
	},
	component: () => null,
});
