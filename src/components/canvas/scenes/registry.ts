import { type ComponentType, lazy } from "react";

/**
 * slug → lazy-loaded R3F scene. Each scene renders only 3D content (meshes,
 * lights, camera) — never a <Canvas> or <View>; those are owned by the shell.
 */
export const sceneRegistry: Record<string, ComponentType> = {
	polaris: lazy(() => import("./polaris-scene")),
	smoothui: lazy(() => import("./smoothui-scene")),
};
