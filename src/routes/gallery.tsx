import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SITE_URL } from "@/lib/site";

/**
 * The Gallery tab. Like the other routes it owns only URL + meta; the view is
 * rendered by the persistent shell. `?image=<id>` is the open lightbox.
 */
export const Route = createFileRoute("/gallery")({
	validateSearch: z.object({ image: z.string().optional() }),
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
