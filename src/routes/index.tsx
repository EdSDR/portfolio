import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

// The Scenes tab. The project list and its canvases live in the persistent
// shell, so this route renders nothing itself.
export const Route = createFileRoute("/")({
	head: () => ({ links: [{ rel: "canonical", href: `${SITE_URL}/` }] }),
});
