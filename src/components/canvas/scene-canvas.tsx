import { Canvas, type RootState, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useState } from "react";
import { drawInSteps, precompile, setupsSettled } from "./precompile";
import { SceneControls } from "./scene-controls";
import { MatchContainerSize } from "./scenes/match-container-size";
import { scenes } from "./scenes/registry";

/**
 * Longest frame step a scene sees, in seconds. R3F passes the real time since
 * the last frame, which after a hidden tab is the whole absence; scenes add it
 * to shader clocks, and a float32 uniform in the tens of thousands of seconds
 * only moves in steps of several milliseconds (rain and link pulses stutter).
 * A long hitch slows the animation for a frame instead.
 */
const MAX_DELTA = 0.1;

function clampDelta({ clock }: RootState) {
	const getDelta = clock.getDelta.bind(clock);
	clock.getDelta = () => Math.min(getDelta(), MAX_DELTA);
}

/**
 * One card's WebGL canvas. Each live card owns its own <Canvas>, so the scene is
 * an ordinary DOM child: it scrolls, clips (border-radius) and fades with the
 * card, and scenes are free to use post-processing or shadows. Lazy-loaded by
 * the card, which keeps three/R3F out of the entry bundle.
 *
 * `paused` stops the render loop (near but off-screen cards stay mounted with
 * compiled shaders and a drawn first frame, ready to resume instantly). Until
 * the prewarm is done nothing renders on its own (`frameloop="never"`): a frame
 * drawn before its shaders are linked would wait for them on the main thread.
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
	const [warm, setWarm] = useState(false);
	const markWarm = useCallback(() => setWarm(true), []);
	const entry = scenes[slug];
	if (!entry) return null;
	const { Scene, background, canvas, antialias = true, controls } = entry;

	return (
		<Canvas
			// Paused is "demand", not "never": under "never" R3F takes a frame's delta
			// from the timestamp (a rAF time in ms, whenever an invalidate was still
			// pending), so scene clocks jumped by the page's age in "seconds". Before
			// the prewarm it's "never" anyway: R3F would otherwise render the scene
			// as soon as it commits (Prewarm advances by hand, with a zero step).
			frameloop={!warm ? "never" : paused ? "demand" : "always"}
			dpr={[1, 1.5]}
			gl={{
				antialias,
				alpha: false,
				powerPreference: "high-performance",
			}}
			{...canvas}
			onCreated={clampDelta}
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
				<Prewarm onReady={onReady} onWarm={markWarm} />
			</Suspense>
		</Canvas>
	);
}

/**
 * Commits with the scene (same Suspense boundary), so it runs once all assets
 * are loaded and the scene's own setup has started: waits for that setup (e.g.
 * an environment map) and for the scene to settle, compiles every program the
 * first frame uses off the main thread (`precompile`: a dry frame), draws it a
 * few new draw calls per frame under the cover (`drawInSteps`), then draws the
 * whole frame and reports ready so the card's cover can fade.
 */
function Prewarm({
	onReady,
	onWarm,
}: {
	onReady?: () => void;
	onWarm: () => void;
}) {
	const get = useThree((s) => s.get);

	useEffect(() => {
		let cancelled = false;
		const { gl, clock, advance } = get();
		// Under "never", advance(t) steps scene clocks by t - elapsedTime: zero.
		const frame = () => advance(clock.elapsedTime);
		// Two frames first: a scene's own effects may still be building what the
		// frame draws (react-postprocessing creates its composer in an effect and
		// adds the passes a commit later).
		const nextFrame = () => new Promise(requestAnimationFrame);
		Promise.all([setupsSettled(gl), nextFrame().then(nextFrame)])
			.then(async () => {
				if (cancelled) return;
				await precompile(gl, frame);
				if (!cancelled) await drawInSteps(gl, frame);
			})
			// A failed prewarm only means the first frame compiles synchronously.
			.catch((error: unknown) => console.error(error))
			.then(() => {
				if (cancelled) return;
				// Reveal even if a scene's first frame throws; the loop keeps going.
				try {
					frame();
				} finally {
					onReady?.();
					onWarm();
				}
			});
		return () => {
			cancelled = true;
		};
	}, [get, onReady, onWarm]);

	return null;
}
