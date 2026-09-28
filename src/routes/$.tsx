import { createFileRoute, notFound } from "@tanstack/react-router";
import { NOT_FOUND_TITLE } from "@/lib/site";

/**
 * Catch-all for unknown URLs: throws a real notFound (status 404), which the
 * shell turns into its visible not-found view.
 */
export const Route = createFileRoute("/$")({
	loader: () => {
		throw notFound();
	},
	head: () => ({ meta: [{ title: NOT_FOUND_TITLE }] }),
});
