import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ErrorView } from "./components/layout/error-view";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Root-level failures replace the shell; give them the same page.
		defaultErrorComponent: ErrorView,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
