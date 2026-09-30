/*
Model: "Ftm" by luyssport (https://sketchfab.com/luyssport), CC BY-NC-SA 4.0
(http://creativecommons.org/licenses/by-nc-sa/4.0/), from
https://sketchfab.com/3d-models/ftm-0970f30574d047b1976ba0aa6f2ef855.
Modified: flattened, parts renamed and merged, textures re-encoded as WebP.
*/
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { DepthOfField, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const DRACO_PATH = "/draco/";
const MODEL = "/ftm.glb";

/** Model point the camera orbits (moved to the origin): the arch, above the path. */
const FOCUS = new THREE.Vector3(3.5, 1, 2.5);

type Part =
	| "sky"
	| "ground"
	| "leaves"
	| "roof"
	| "wood"
	| "stones"
	| "props"
	| "character"
	| "outline"
	| "monster"
	| "shade"
	| "eyes";
type Model = { nodes: Record<Part, THREE.Mesh> };

const Part = ({ mesh }: { mesh: THREE.Mesh }) => (
	<mesh geometry={mesh.geometry} material={mesh.material} />
);

/**
 * A hand-painted diorama: every material is unlit (the light and shade are in
 * the textures, the ink lines are an inverted-hull mesh), so it's drawn as
 * painted, with no lights, tone mapping or post-processing.
 */
export default function FtmScene() {
	const { nodes } = useGLTF(MODEL, DRACO_PATH) as unknown as Model;

	// Absolute values on the (globally cached) glTF materials: safe to repeat.
	// Tone mapping would grade the painted colours; show them as authored.
	useMemo(() => {
		for (const mesh of Object.values(nodes))
			if (mesh.isMesh) (mesh.material as THREE.Material).toneMapped = false;
	}, [nodes]);

	// The painted sky dome is drawn around the camera, first and without depth,
	// so it reads as infinitely far and never clips the orbit.
	const sky = useMemo(() => {
		const geometry = nodes.sky.geometry;
		geometry.computeBoundingSphere();
		const center =
			geometry.boundingSphere?.center.clone() ?? new THREE.Vector3();
		const mesh = new THREE.Mesh(geometry, nodes.sky.material);
		const material = mesh.material as THREE.MeshBasicMaterial;
		material.depthWrite = false;
		material.fog = false;
		mesh.renderOrder = -1;
		mesh.frustumCulled = false;
		mesh.onBeforeRender = (_r, _s, camera) => {
			mesh.position.copy(camera.position).sub(center);
		};
		return mesh;
	}, [nodes]);

	// A slow sway, so the list's live card isn't a still. Own time base (R3F's
	// clock resets on pause). `bun run posters` holds it at the home angle.
	const poster = typeof window !== "undefined" && "__posterCapture" in window;
	const sway = useRef<THREE.Group>(null);
	const time = useRef(0);
	useFrame((_, delta) => {
		time.current += delta;
		if (sway.current && !poster)
			sway.current.rotation.y = Math.sin(time.current * 0.15) * 0.12;
	});

	return (
		<>
			<primitive object={sky} />
			<group ref={sway}>
				<group position={[-FOCUS.x, -FOCUS.y, -FOCUS.z]}>
					<Part mesh={nodes.ground} />
					<Part mesh={nodes.roof} />
					<Part mesh={nodes.wood} />
					<Part mesh={nodes.stones} />
					<Part mesh={nodes.props} />
					<Part mesh={nodes.leaves} />
					<Part mesh={nodes.character} />
					<Part mesh={nodes.outline} />
					<Part mesh={nodes.eyes} />
					<Part mesh={nodes.monster} />
					<Part mesh={nodes.shade} />
				</group>
			</group>

			{/* The original's depth of field: the island sharp, the sky and the
			    translucent monster (it writes no depth, so it blurs like the sky
			    behind it) soft. */}
			<EffectComposer multisampling={4}>
				<DepthOfField
					target={[0, 0, 0]}
					worldFocusRange={45}
					bokehScale={4}
					resolutionScale={0.5}
				/>
			</EffectComposer>
		</>
	);
}

useGLTF.preload(MODEL, DRACO_PATH);
