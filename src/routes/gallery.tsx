import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

/**
 * The Gallery tab. Like the other routes it owns only URL + meta; the view is
 * rendered by the persistent shell. `?image=<id>` is the open lightbox.
 */
export const Route = createFileRoute("/gallery")({
	// Hand-rolled (not zod) to keep the validator out of the client bundle. A
	// non-string `image` (e.g. `?image=5`, which the router parses as a number)
	// just means "no image open".
	validateSearch: (search: Record<string, unknown>): { image?: string } =>
		typeof search.image === "string" ? { image: search.image } : {},
	head: () => {
		const title = "Gallery — Ed";
		const description = "Stills from projects by Ed Castro.";
		const url = `${SITE_URL}/gallery`;
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:url", content: url },
			],
			links: [{ rel: "canonical", href: url }],
		};
	},
});
