import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { SceneControls } from "./scene-controls";
import { MatchContainerSize } from "./scenes/match-container-size";
import { scenes } from "./scenes/registry";

/**
 * One card's WebGL canvas. Each live card owns its own <Canvas>, so the scene is
 * an ordinary DOM child: it scrolls, clips (border-radius) and fades with the
 * card, and scenes are free to use post-processing or shadows. Lazy-loaded by
 * the card, which keeps three/R3F out of the entry bundle.
 *
 * `paused` stops the render loop (near but off-screen cards stay mounted with
 * compiled shaders and a drawn first frame, ready to resume instantly).
 * `interactive` (the open card) takes pointer input and orbits the camera.
 */
export default function SceneCanvas({
	slug,
	paused,
	interactive = false,
	onReady,
	onInteract,
}: {
	slug: string;
	paused: boolean;
	interactive?: boolean;
	onReady?: () => void;
	/** First drag/zoom of the open scene. */
	onInteract?: () => void;
}) {
	const entry = scenes[slug];
	if (!entry) return null;
	const { Scene, background, canvas, antialias = true, controls } = entry;

	return (
		<Canvas
			frameloop={paused ? "never" : "always"}
			dpr={[1, 1.5]}
			gl={{
				antialias,
				alpha: false,
				powerPreference: "high-performance",
			}}
			{...canvas}
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: interactive ? "auto" : "none",
			}}
			className={interactive ? "cursor-grab active:cursor-grabbing" : undefined}
		>
			<color attach="background" args={[background]} />
			<MatchContainerSize />
			<Suspense fallback={null}>
				<Scene />
				<SceneControls
					enabled={interactive}
					limits={controls}
					onStart={onInteract}
				/>
				<Prewarm onReady={onReady} />
			</Suspense>
		</Canvas>
	);
}

/**
 * Commits with the scene (same Suspense boundary), so it runs once all assets
 * are loaded: compiles every shader off the main thread where supported, draws
 * one frame even while paused, then reports ready so the card's cover can fade.
 */
function Prewarm({ onReady }: { onReady?: () => void }) {
	const get = useThree((s) => s.get);

	useEffect(() => {
		let cancelled = false;
		const { gl, scene, camera, advance } = get();
		gl.compileAsync(scene, camera)
			.then(() => {
				if (cancelled) return;
				// Reveal even if a scene's first frame throws; the loop keeps going.
				try {
					advance(performance.now());
				} finally {
					onReady?.();
				}
			})
			.catch((error: unknown) => console.error(error));
		return () => {
			cancelled = true;
		};
	}, [get, onReady]);

	return null;
}
