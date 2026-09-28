import type { CanvasProps } from "@react-three/fiber";
import { type ComponentType, lazy } from "react";
import { SITE_URL } from "@/lib/site";

/**
 * slug → a card's scene. `Scene` renders 3D content only (meshes, lights,
 * camera, effects) — never a <Canvas>; <SceneCanvas> owns that. Kept free of
 * runtime three/R3F imports so the card list can read it without pulling 3D
 * into the entry bundle.
 */
export interface SceneEntry {
	/** Imports the scene module (call early to prefetch; `Scene` reuses it). */
	load: () => Promise<{ default: ComponentType }>;
	Scene: ComponentType;
	/** Clear color. Also the card's cover color, so the reveal crossfades cleanly. */
	background: string;
	/** Per-scene <Canvas> options (shadow map type, default camera). */
	canvas?: Pick<CanvasProps, "shadows" | "camera">;
}

const lazyScene = (load: SceneEntry["load"]) => ({ load, Scene: lazy(load) });

export const scenes: Record<string, SceneEntry> = {
	"test-animation": {
		...lazyScene(() => import("./test-animation-scene")),
		background: "#222222",
	},
	torus: {
		...lazyScene(() => import("./torus-scene")),
		background: "#1a1a1a",
	},
	governance: {
		...lazyScene(() => import("./statue-scene")),
		background: "#000000",
		// VSM: drei <SoftShadows> (PCSS) doesn't compile on three 0.186.
		canvas: {
			shadows: "variance",
			camera: { position: [0, 1.5, 14], fov: 42 },
		},
	},
};

export const DEFAULT_SCENE_BG = "#222222";

/**
 * Starts downloading/evaluating a card's 3D code — the shared canvas chunk
 * (three + R3F) and the scene — in parallel, before the canvas mounts.
 */
export function preloadScene(slug: string): void {
	// Prefetch only: a failure (offline, stale chunk after a deploy) surfaces
	// when the lazy component renders, so there's nothing to handle here.
	const ignore = () => {};
	import("../scene-canvas").catch(ignore);
	scenes[slug]?.load().catch(ignore);
}

/** Pre-rendered still of each scene (`bun run posters`), used as the card cover. */
export const posterUrl = (slug: string) => `/posters/${slug}.webp`;

/** 1200×630 JPEG of the same still, for link previews (OG/Twitter want absolute URLs). */
export const ogImageUrl = (slug: string) =>
	`${SITE_URL}/posters/${slug}-og.jpg`;
