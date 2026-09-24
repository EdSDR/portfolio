import type { ReactNode } from "react";
import { useRef } from "react";
import { SceneCanvas } from "@/components/canvas/scene-canvas";
import { ProjectList } from "@/components/project/project-list";
import { useMounted } from "@/lib/use-mounted";
import { Fade } from "./fade";
import { Sidebar } from "./sidebar";

/**
 * Persistent app shell, rendered by __root on every route. It owns the single
 * <Canvas> and the project list (both above <Outlet/>), so navigation never
 * unmounts the 3D. `children` is the route Outlet — it carries per-route head/OG
 * meta but renders nothing visible; the expanded UI is driven by the route param
 * inside ProjectList.
 */
export function AppShell({ children }: { children: ReactNode }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const mounted = useMounted();

	return (
		<div ref={rootRef} className="relative min-h-screen">
			{/* One WebGL context for the whole app, client-only, behind the DOM. */}
			{mounted && <SceneCanvas eventSource={rootRef} />}

			<div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8 lg:flex-row">
				<Sidebar />
				<main className="relative min-w-0 flex-1 p-4">
					<ProjectList />
					<div className="hidden">{children}</div>
				</main>
			</div>

			<Fade />
		</div>
	);
}
