import { PerspectiveCamera, View } from "@react-three/drei";
import { Suspense } from "react";
import type { InViewState } from "@/lib/use-in-view";
import { sceneRegistry } from "./scenes/registry";

/**
 * A drei <View> that renders its own element (non-track mode) filling the card
 * media, and tunnels the scene into the shell's single <Canvas>. Non-track mode
 * avoids the cross-reconciler ref-capture timing that breaks track mode here.
 */
export function CardView({
	slug,
	state,
}: {
	slug: string;
	state: InViewState;
}) {
	const Scene = sceneRegistry[slug];
	if (state === "far" || !Scene) return null;

	return (
		<View index={1} className="absolute inset-0 block h-full w-full">
			<PerspectiveCamera makeDefault position={[0, 0, 4]} fov={45} />
			<Suspense fallback={null}>
				<Scene />
			</Suspense>
		</View>
	);
}
