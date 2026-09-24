import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { GraphMethods, NodeObject } from "r3f-forcegraph";
import R3fForceGraph from "r3f-forcegraph";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type GraphNode, generateGraph } from "@/lib/graph-data";

/**
 * Torus hero contents: a force-directed graph approximating an on-chain agent
 * network. Nodes are bright, unlit ("toneMapped:false") spheres so the Bloom
 * pass in <TorusCanvas> turns them into a real glow. Links are straight, some
 * carrying directional particles. The sim warms up, cools down (freezes), then
 * the whole graph slowly rotates.
 *
 * This renders inside a dedicated <Canvas> (not a drei <View>) so it can use
 * real post-processing Bloom.
 */
export default function TorusScene() {
	const fg = useRef<GraphMethods | undefined>(undefined);
	const groupRef = useRef<THREE.Group>(null);
	const configured = useRef(false);

	const data = useMemo(() => generateGraph(), []);

	// Reuse one geometry per node size and one material per color.
	const cache = useMemo(
		() => ({
			geo: new Map<number, THREE.SphereGeometry>(),
			mat: new Map<string, THREE.MeshBasicMaterial>(),
		}),
		[],
	);

	useEffect(() => {
		return () => {
			for (const g of cache.geo.values()) g.dispose();
			for (const m of cache.mat.values()) m.dispose();
		};
	}, [cache]);

	const nodeThreeObject = useMemo(
		() => (node: NodeObject) => {
			const n = node as unknown as GraphNode;
			const size = n.val ?? 5;
			const color = n.color ?? "#63cbff";

			let geo = cache.geo.get(size);
			if (!geo) {
				geo = new THREE.SphereGeometry(size, 16, 16);
				cache.geo.set(size, geo);
			}
			let mat = cache.mat.get(color);
			if (!mat) {
				mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
				cache.mat.set(color, mat);
			}
			return new THREE.Mesh(geo, mat);
		},
		[cache],
	);

	useFrame((_, dt) => {
		const g = fg.current;
		if (g) {
			if (!configured.current) {
				g.d3Force("charge")?.strength(-140);
				g.d3Force("link")?.distance(42);
				g.d3Force("center")?.strength(0.55);
				configured.current = true;
			}
			g.tickFrame();
		}
		if (groupRef.current) groupRef.current.rotation.y += dt * 0.045;
	});

	return (
		<>
			<color attach="background" args={["#1a1a1a"]} />
			<PerspectiveCamera
				makeDefault
				position={[0, 0, 480]}
				fov={55}
				far={4000}
			/>
			{/* Nodes are unlit (MeshBasic); this light only lifts the link tubes,
			    which are lit meshes, so they read against the dark background. */}
			<ambientLight intensity={1.6} />
			<group ref={groupRef}>
				<R3fForceGraph
					ref={fg}
					graphData={data}
					nodeThreeObject={nodeThreeObject}
					warmupTicks={80}
					cooldownTicks={260}
					d3AlphaDecay={0.025}
					linkColor={(l) =>
						String((l as { color?: string }).color ?? "#94a3b8")
					}
					linkOpacity={0.3}
					linkWidth={0.5}
					linkDirectionalParticles={(l) =>
						Number((l as { particles?: number }).particles ?? 0)
					}
					linkDirectionalParticleWidth={2.2}
					linkDirectionalParticleSpeed={(l) =>
						Number((l as { speed?: number }).speed ?? 0.005)
					}
					linkDirectionalParticleColor={(l) =>
						String((l as { color?: string }).color ?? "#94a3b8")
					}
				/>
			</group>
		</>
	);
}
