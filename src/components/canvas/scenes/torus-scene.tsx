import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { GraphMethods, NodeObject } from "r3f-forcegraph";
import R3fForceGraph from "r3f-forcegraph";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type GraphNode, generateGraph, type NodeType } from "@/lib/graph-data";

/** All links, arrows, and particles share one whitish tint. */
const LINK_TINT = "#e6ebf2";

/** Per-type geometry — like the reference, some node roles get faceted shapes. */
function makeGeometry(type: NodeType, size: number): THREE.BufferGeometry {
	switch (type) {
		case "perm":
			return new THREE.IcosahedronGeometry(size, 0);
		case "signal":
			return new THREE.TetrahedronGeometry(size);
		case "user":
			return new THREE.OctahedronGeometry(size, 0);
		default:
			return new THREE.SphereGeometry(size, 16, 16);
	}
}

/** Scales down the per-link particle speeds for a slow, calm flow. */
const PARTICLE_SPEED_SCALE = 0.18;

/**
 * Force-simulation layout. Edit and hot-reload — the graph re-applies these and
 * reheats the sim so changes are visible (it re-settles, then freezes again).
 */
const FORCE = { charge: -100, linkDistance: 42, center: 0.55 };

/**
 * Torus hero contents: a force-directed graph approximating an on-chain agent
 * network. Nodes are bright, unlit ("toneMapped:false") spheres so the Bloom
 * pass below turns them into a real glow. Links are straight, some
 * carrying directional particles. The sim warms up, cools down (freezes), then
 * the whole graph slowly rotates.
 */
export default function TorusScene() {
	const fg = useRef<GraphMethods | undefined>(undefined);
	const groupRef = useRef<THREE.Group>(null);
	const appliedForces = useRef("");
	// The graph builds its d3 layout asynchronously after mount. Touching the sim
	// before that (reheat sets it "running" with no layout yet) throws inside
	// tickFrame — which a remount hits, since cached shaders let the first frame
	// run immediately.
	const graphReady = useRef(false);

	const data = useMemo(() => generateGraph(), []);

	// Reuse one geometry per type+size and one material per color.
	const cache = useMemo(
		() => ({
			geo: new Map<string, THREE.BufferGeometry>(),
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

			const geoKey = `${n.type}:${size}`;
			let geo = cache.geo.get(geoKey);
			if (!geo) {
				geo = makeGeometry(n.type, size);
				cache.geo.set(geoKey, geo);
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
		if (graphReady.current && g?.d3Force) {
			const key = `${FORCE.charge}|${FORCE.linkDistance}|${FORCE.center}`;
			if (appliedForces.current !== key) {
				g.d3Force("charge")?.strength(FORCE.charge);
				g.d3Force("link")?.distance(FORCE.linkDistance);
				g.d3Force("center")?.strength(FORCE.center);
				g.d3ReheatSimulation();
				g.resetCountdown();
				appliedForces.current = key;
			}
			g.tickFrame();
		}
		if (groupRef.current) groupRef.current.rotation.y += dt * 0.045;
	});

	return (
		<>
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
					onFinishUpdate={() => {
						graphReady.current = true;
					}}
					nodeThreeObject={nodeThreeObject}
					warmupTicks={80}
					cooldownTicks={260}
					d3AlphaDecay={0.025}
					linkColor={LINK_TINT}
					linkOpacity={0.3}
					linkWidth={0.5}
					linkDirectionalArrowLength={3.5}
					linkDirectionalArrowRelPos={1}
					linkDirectionalArrowColor={LINK_TINT}
					linkDirectionalParticles={(l) =>
						Number((l as { particles?: number }).particles ?? 0)
					}
					linkDirectionalParticleWidth={2.2}
					linkDirectionalParticleSpeed={(l) =>
						Number((l as { speed?: number }).speed ?? 0.005) *
						PARTICLE_SPEED_SCALE
					}
					linkDirectionalParticleColor={LINK_TINT}
				/>
			</group>
			<EffectComposer>
				<Bloom
					mipmapBlur
					luminanceThreshold={0.2}
					intensity={1.25}
					radius={0.75}
				/>
			</EffectComposer>
		</>
	);
}
