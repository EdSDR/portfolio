import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ProjectList } from "@/components/project/project-list";
import { Fade } from "./fade";
import { Sidebar } from "./sidebar";

/**
 * Persistent app shell, rendered by __root on every route. It owns the project
 * list (above <Outlet/>), so navigation never unmounts a card or its scene.
 * `children` is the route Outlet — it carries per-route head/OG meta but renders
 * nothing visible; the expanded UI is driven by the route param inside
 * ProjectList.
 */
export function AppShell({ children }: { children: ReactNode }) {
	return (
		<MotionConfig reducedMotion="user">
			<div className="relative min-h-screen">
				<div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-8 lg:flex-row">
					<Sidebar />
					<main className="relative min-w-0 flex-1 p-4">
						<ProjectList />
						<div className="hidden">{children}</div>
					</main>
				</div>

				<Fade />
			</div>
		</MotionConfig>
	);
}
