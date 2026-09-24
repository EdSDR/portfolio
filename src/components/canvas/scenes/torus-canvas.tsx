import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { MatchContainerSize } from "./match-container-size";
import TorusScene from "./torus-scene";

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
