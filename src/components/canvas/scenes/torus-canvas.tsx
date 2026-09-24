import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import TorusScene from "./torus-scene";

/**
 * Keeps the canvas matched to its container every frame. R3F sizes the canvas
 * from a ResizeObserver, which can miss the container's size change while Motion
 * animates the card's layout (transform-driven) — leaving the canvas at a stale
 * size (and a gap at the card's edge). Polling the host box each frame — the same
 * approach drei's <View> uses — guarantees the canvas always fills its card.
 */
function MatchContainerSize() {
	const gl = useThree((s) => s.gl);
	const setSize = useThree((s) => s.setSize);
	useFrame(() => {
		const host = gl.domElement.parentElement;
		if (!host) return;
		const { clientWidth: w, clientHeight: h } = host;
		if (
			w > 0 &&
			h > 0 &&
			(Math.abs(w - gl.domElement.clientWidth) > 1 ||
				Math.abs(h - gl.domElement.clientHeight) > 1)
		) {
			setSize(w, h);
		}
	});
	return null;
}

/**
 * Dedicated canvas for the Torus scene. The shared drei-View canvas renders each
 * card via a scissored manual pass that bypasses post-processing, so Torus gets
 * its own <Canvas> to run a real Bloom pass (the neon glow). Non-interactive and
 * fills the card media; only mounts when the card is live (card-view gate).
 */
export default function TorusCanvas() {
	return (
		<Canvas
			dpr={[1, 1.5]}
			gl={{
				antialias: true,
				alpha: false,
				powerPreference: "high-performance",
			}}
			style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
		>
			<MatchContainerSize />
			<TorusScene />
			<EffectComposer>
				<Bloom
					mipmapBlur
					luminanceThreshold={0.2}
					intensity={1.25}
					radius={0.75}
				/>
			</EffectComposer>
		</Canvas>
	);
}
