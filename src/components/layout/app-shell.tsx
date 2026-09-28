import { useRouterState } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { type ReactNode, useLayoutEffect } from "react";
import { GalleryView } from "@/components/gallery/gallery-view";
import { ProjectList } from "@/components/project/project-list";
import { releaseScrollHold } from "@/lib/scroll-memory";
import { ErrorView } from "./error-view";
import { Fade } from "./fade";
import { NotFound } from "./not-found";
import { Sidebar } from "./sidebar";
import { type View, ViewTabs } from "./view-tabs";

/**
 * Persistent app shell, rendered by __root on every route. It owns the views
 * (above <Outlet/>): the project list (`/`, `/work/$slug`) or the gallery
 * (`/gallery`), so opening/closing a project never unmounts a card or its
 * scene. Switching tabs does swap views (each flies its content in on mount),
 * which frees the scenes' WebGL contexts while the gallery is up. `children` is
 * the route Outlet — it carries per-route head/OG meta but renders nothing
 * visible.
 */
export function AppShell({ children }: { children: ReactNode }) {
	// Not-found is read from the matches' public `status` (the catch-all route
	// and the /work loader throw notFound()). Don't add a root
	// `notFoundComponent`: a root-level boundary marks the match `success` (with
	// an internal flag) instead, which this wouldn't see.
	const view = useRouterState({
		select: (s): View | "notFound" | "error" =>
			s.matches.some((m) => m.status === "notFound")
				? "notFound"
				: s.matches.some((m) => m.status === "error")
					? "error"
					: s.location.pathname.startsWith("/gallery")
						? "gallery"
						: "scenes",
	});

	// A card click holds the scrolled page in place until the card opens (see
	// holdScrollForOpen); if the navigation ends in a 404/error instead, release
	// it so that view isn't left translated off-screen.
	useLayoutEffect(() => {
		if (view === "notFound" || view === "error") releaseScrollHold();
	}, [view]);

	return (
		<MotionConfig reducedMotion="user">
			<div data-app-shell className="relative min-h-screen">
				<div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-8 lg:flex-row">
					<Sidebar />
					{/* Extra bottom room on small screens for the floating tabs. */}
					<main
						data-scroll-anchor
						className="relative min-w-0 flex-1 p-4 pb-24 lg:pb-4"
					>
						{view === "gallery" ? (
							<GalleryView />
						) : view === "notFound" ? (
							<NotFound />
						) : view === "error" ? (
							<ErrorView />
						) : (
							<ProjectList />
						)}
						<div className="hidden">{children}</div>
					</main>
				</div>

				<ViewTabs
					view={view === "notFound" || view === "error" ? undefined : view}
				/>
				<Fade />
			</div>
		</MotionConfig>
	);
}
