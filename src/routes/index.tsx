import { createFileRoute } from "@tanstack/react-router";

// The Scenes tab. The project list and its canvases live in the persistent
// shell, so this route renders nothing itself.
export const Route = createFileRoute("/")({});
