import type { OrbitControlsProps } from "@react-three/drei";
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
	/**
	 * Default-framebuffer MSAA (default true). Off for scenes whose
	 * post-processing composer already antialiases its own render targets.
	 */
	antialias?: boolean;
	/** Orbit limits for the open card (distances in scene units, angles in radians). */
	controls?: Pick<
		OrbitControlsProps,
		| "minDistance"
		| "maxDistance"
		| "minPolarAngle"
		| "maxPolarAngle"
		| "minAzimuthAngle"
		| "maxAzimuthAngle"
	>;
}

const lazyScene = (load: SceneEntry["load"]) => ({ load, Scene: lazy(load) });

export const scenes: Record<string, SceneEntry> = {
	midgard: {
		...lazyScene(() => import("./midgard-scene")),
		background: "#070c19",
		// The EffectComposer multisamples.
		antialias: false,
		canvas: {
			camera: { position: [0, 6, 50], fov: 45, near: 0.5, far: 400 },
		},
		controls: {
			minDistance: 32,
			maxDistance: 70,
			minPolarAngle: 1.0,
			maxPolarAngle: 1.62,
		},
	},
	"test-animation": {
		...lazyScene(() => import("./test-animation-scene")),
		background: "#222222",
		controls: { minDistance: 2.5, maxDistance: 8 },
	},
	torus: {
		...lazyScene(() => import("./torus-scene")),
		background: "#1a1a1a",
		// The EffectComposer multisamples; the final pass is a full-screen quad.
		antialias: false,
		controls: { minDistance: 200, maxDistance: 900 },
	},
	governance: {
		...lazyScene(() => import("./statue-scene")),
		background: "#000000",
		// VSM: drei <SoftShadows> (PCSS) doesn't compile on three 0.186.
		canvas: {
			shadows: "variance",
			camera: { position: [0, 1.5, 14], fov: 42 },
		},
		// Only her front is lit (the key light sits in front), and the fog ends
		// at 20 units, so the orbit stays in front and inside it.
		controls: {
			minDistance: 7,
			maxDistance: 18,
			minAzimuthAngle: -0.9,
			maxAzimuthAngle: 0.9,
			minPolarAngle: 1.1,
			maxPolarAngle: 1.75,
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
