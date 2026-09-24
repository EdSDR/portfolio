import { type ComponentType, lazy } from "react";

/**
 * Scenes that render in their own <Canvas>, keyed by project slug. They need
 * capabilities the shared drei-View canvas can't provide (post-processing for
 * Torus, shadows/fog/clouds for the statue), so they get a dedicated canvas.
 */
export const dedicatedCanvases: Record<string, ComponentType> = {
	torus: lazy(() => import("./torus-canvas")),
	governance: lazy(() => import("./statue-canvas")),
};

/**
 * Per-scene background, matching each scene's <color attach="background">. Used
 * for the card's solid cover so the reveal crossfades seamlessly.
 */
export const sceneBackground: Record<string, string> = {
	torus: "#1a1a1a",
	governance: "#000000",
};

export const DEFAULT_SCENE_BG = "#222222";
