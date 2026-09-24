import { View } from "@react-three/drei";
import { lazy, Suspense } from "react";
import type { InViewState } from "@/lib/use-in-view";
import { sceneRegistry } from "./scenes/registry";

// Torus opts into its own <Canvas> so it can run a real Bloom pass.
const TorusCanvas = lazy(() => import("./scenes/torus-canvas"));

/**
 * Renders a card's scene. Most scenes tunnel into the shell's single shared
 * <Canvas> via a drei <View> (non-track mode: the View owns/measures its own
 * element). Torus is the exception — it needs post-processing, so it mounts a
 * dedicated canvas instead.
 *
 * Lifecycle gating: `far` → nothing (frees the scene); `near`/`visible` → mounted.
 */
export function CardView({
	slug,
	state,
}: {
	slug: string;
	state: InViewState;
}) {
	if (state === "far") return null;

	if (slug === "torus") {
		return (
			<Suspense fallback={null}>
				<TorusCanvas />
			</Suspense>
		);
	}

	const Scene = sceneRegistry[slug];
	if (!Scene) return null;

	return (
		<View index={1} className="absolute inset-0 block h-full w-full">
			<Suspense fallback={null}>
				<Scene />
			</Suspense>
		</View>
	);
}
