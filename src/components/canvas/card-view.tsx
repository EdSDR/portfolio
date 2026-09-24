import { View } from "@react-three/drei";
import { Suspense } from "react";
import type { InViewState } from "@/lib/use-in-view";
import { dedicatedCanvases } from "./scenes/dedicated";
import { sceneRegistry } from "./scenes/registry";

/**
 * Renders a card's scene. Most scenes tunnel into the shell's single shared
 * <Canvas> via a drei <View> (non-track mode: the View owns/measures its own
 * element). Some scenes (Torus, statue) need capabilities the shared canvas can't
 * provide (post-processing, shadows/fog), so they mount their own dedicated canvas.
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

	const Dedicated = dedicatedCanvases[slug];
	if (Dedicated) {
		return (
			<Suspense fallback={null}>
				<Dedicated />
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
