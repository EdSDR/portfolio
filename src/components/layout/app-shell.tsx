import { useRouterState } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { GalleryView } from "@/components/gallery/gallery-view";
import { ProjectList } from "@/components/project/project-list";
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

	return (
		<MotionConfig reducedMotion="user">
			<div className="relative min-h-screen">
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
