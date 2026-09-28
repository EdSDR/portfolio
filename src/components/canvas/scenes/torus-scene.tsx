import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
	Bloom,
	EffectComposer,
	Noise,
	Vignette,
} from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { TorusGraph } from "./torus-graph";

/**
 * Torus hero: a force-directed graph approximating an on-chain agent network
 * (see `torus-graph.ts`). The layout warms up, settles, then the whole graph
 * slowly turns while pulses travel along the links. Nodes and pulses are
 * brighter than 1 at their rims and heads, which is what the Bloom picks up.
 */
export default function TorusScene() {
	// Not disposed on unmount: the scene only unmounts with its canvas, which
	// drops the whole WebGL context (a dispose effect also ran under StrictMode's
	// double mount, freeing programs mid-compile).
	const graph = useMemo(() => new TorusGraph(), []);
	const group = useRef<THREE.Group>(null);

	useFrame((state, delta) => {
		graph.update(delta, state.size.height * state.gl.getPixelRatio());
		if (group.current) group.current.rotation.y += delta * 0.045;
	});

	return (
		<>
			<PerspectiveCamera
				makeDefault
				position={[0, 0, 480]}
				fov={55}
				far={4000}
			/>
			<group ref={group}>
				<primitive object={graph.object} />
			</group>
			{/* 4× MSAA (the library default is 8× on half-float targets, ~2× the
			    GPU memory for no visible gain at this size). Grain and vignette
			    merge into Bloom's final pass, so they're nearly free. */}
			<EffectComposer multisampling={4}>
				<Bloom
					mipmapBlur
					luminanceThreshold={0.2}
					intensity={1.25}
					radius={0.75}
				/>
				<Noise premultiply opacity={0.5} />
				<Vignette offset={0.3} darkness={0.55} />
			</EffectComposer>
		</>
	);
}
