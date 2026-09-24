import { Cloud, Clouds, Stars, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/** Self-hosted Draco decoder (public/draco) — no runtime fetch from Google's CDN. */
const DRACO_PATH = "/draco/";

/**
 * The Themis (justice) statue, lit by a slowly orbiting spotlight, wrapped in
 * volumetric clouds, a starfield and black fog. Cards are non-interactive, so the
 * reference's pointer parallax is replaced with a gentle auto-sway.
 *
 * Shadows (VSM) and the camera are configured on the canvas via the registry.
 */
function Statue() {
	const group = useRef<THREE.Group>(null);
	const light = useRef<THREE.SpotLight>(null);
	// Own time base: R3F resets clock.elapsedTime whenever the card pauses and
	// resumes (frameloop change), which would make the light jump.
	const time = useRef(0);
	const { nodes } = useGLTF("/themis.glb", DRACO_PATH);
	const themis = nodes.themis as THREE.Mesh;

	useFrame((_, delta) => {
		time.current += delta;
		const t = time.current;
		if (group.current) {
			const targetRotY = Math.sin(t * 0.18) * 0.28;
			group.current.rotation.y +=
				(targetRotY - group.current.rotation.y) * Math.min(1, delta * 1.5);
		}
		if (light.current) {
			// The reference tracks the pointer; at rest that settles the key light
			// front-and-center at ~[0, 0, 8], aimed at the origin. We keep it there
			// and let it drift gently so the statue's front face stays lit rather
			// than swinging wide (which left the Lambert mesh black against the fog).
			light.current.position.set(
				Math.sin(t * 0.25) * 3,
				1 + Math.cos(t * 0.4),
				8,
			);
		}
	});

	return (
		<group ref={group} position={[1, -1.5, 1]}>
			<mesh
				castShadow
				receiveShadow
				scale={0.06}
				geometry={themis.geometry}
				position={[0.409, -0.06, -1.618]}
				rotation={[Math.PI / 2, 0, -0.25]}
			>
				<meshLambertMaterial color="#43434a" />
			</mesh>

			<Clouds material={THREE.MeshBasicMaterial}>
				<Cloud
					seed={2}
					scale={2}
					volume={5}
					color="#575757"
					fade={100}
					speed={0.2}
				/>
			</Clouds>
			<Stars
				radius={100}
				depth={50}
				count={1400}
				factor={4}
				saturation={0}
				fade
				speed={1}
			/>

			<spotLight
				ref={light}
				angle={0.6}
				penumbra={0.5}
				castShadow
				intensity={1500}
				shadow-mapSize={1024}
				shadow-bias={-0.0008}
				shadow-radius={7}
				shadow-blurSamples={24}
			>
				<orthographicCamera
					attach="shadow-camera"
					args={[-10, 10, -10, 10, 0.1, 50]}
				/>
			</spotLight>
		</group>
	);
}

export default function StatueScene() {
	return (
		<>
			<fog attach="fog" args={["black", 0, 20]} />
			<pointLight position={[10, -10, -20]} intensity={6} />
			<pointLight position={[-10, -10, -20]} intensity={6} />
			<Statue />
		</>
	);
}

useGLTF.preload("/themis.glb", DRACO_PATH);
