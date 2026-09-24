import { createFileRoute } from "@tanstack/react-router";

// The collapsed home state. The project list + canvas live in the shell, so
// this route renders nothing itself.
export const Route = createFileRoute("/")({
	component: () => null,
});
