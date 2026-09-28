import { Float, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { FilmGrade } from "./film-grade";

/**
 * The very first scene: two floating rounded cards, kept as a nod to where this
 * started. Physical materials (a clear coat on the white card, a thin-film
 * iridescence on the violet one) reflect a small studio of light panels that's
 * rendered once into an environment map at load: no HDR download, no per-frame
 * cost. On the open card the pair leans toward the pointer.
 */

/**
 * The panels the clear coats reflect, all facing the origin: a softbox and a
 * thin strip behind the camera (what the card faces mirror), side strips (one
 * violet) and a faint ring below for the edges. [color, intensity, position,
 * scale]; the ring is the last one.
 */
const PANELS: [string, number, [number, number, number], [number, number]][] = [
	["#ffffff", 4, [-1.4, 1.1, 6], [3, 1.2]],
	["#ffffff", 1.5, [1.6, -0.3, 6], [0.2, 4]],
	["#ffffff", 2.5, [0, 4, 2], [6, 3]],
	["#ffffff", 2, [-4, 0.5, 1], [5, 0.5]],
	["#a78bfa", 1.6, [4, 0, 1], [5, 0.8]],
	["#ffffff", 0.6, [0, -3, 3], [3, 3]],
];

/**
 * Renders the panels into a prefiltered (PMREM) environment map, the same
 * thing drei's <Environment> + <Lightformer> do, without its HDR/EXR loader
 * code in the chunk.
 */
function studioEnvironment(gl: THREE.WebGLRenderer) {
	const studio = new THREE.Scene();
	const plane = new THREE.PlaneGeometry();
	const ring = new THREE.RingGeometry(0.5, 1, 48);
	PANELS.forEach(([color, intensity, position, [w, h]], i) => {
		const panel = new THREE.Mesh(
			i === PANELS.length - 1 ? ring : plane,
			new THREE.MeshBasicMaterial({
				color: new THREE.Color(color).multiplyScalar(intensity),
				side: THREE.DoubleSide,
				toneMapped: false,
			}),
		);
		panel.position.set(...position);
		panel.scale.set(w, h, 1);
		panel.lookAt(0, 0, 0);
		studio.add(panel);
	});
	const pmrem = new THREE.PMREMGenerator(gl);
	const target = pmrem.fromScene(studio, 0.02);
	pmrem.dispose();
	plane.dispose();
	ring.dispose();
	for (const panel of studio.children)
		if (panel instanceof THREE.Mesh) panel.material.dispose();
	return target;
}

export default function TestAnimationScene() {
	const group = useRef<THREE.Group>(null);
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);

	// Layout effect: set before the canvas compiles the scene's shaders.
	useLayoutEffect(() => {
		const env = studioEnvironment(gl);
		scene.environment = env.texture;
		return () => {
			scene.environment = null;
			env.dispose();
		};
	}, [gl, scene]);

	useFrame((state, delta) => {
		const g = group.current;
		if (!g) return;
		// The pointer only moves on the open card (list cards ignore the mouse).
		const k = 1 - Math.exp(-3 * delta);
		g.rotation.y += (state.pointer.x * 0.35 - g.rotation.y) * k;
		g.rotation.x += (-state.pointer.y * 0.2 - g.rotation.x) * k;
	});

	return (
		<>
			<PerspectiveCamera makeDefault position={[0, 0, 4]} fov={45} />
			<group ref={group}>
				<Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
					<RoundedBox args={[1.7, 1.05, 0.2]} radius={0.09} smoothness={6}>
						<meshPhysicalMaterial
							color="#f4f4f5"
							roughness={0.4}
							clearcoat={1}
							clearcoatRoughness={0.08}
						/>
					</RoundedBox>
				</Float>
				<Float speed={2} rotationIntensity={0.5} floatIntensity={1.3}>
					<RoundedBox
						args={[0.66, 0.66, 0.2]}
						radius={0.07}
						smoothness={6}
						position={[1.05, 0.62, 0.4]}
					>
						<meshPhysicalMaterial
							color="#a78bfa"
							roughness={0.28}
							metalness={0.15}
							iridescence={1}
							iridescenceIOR={1.35}
							iridescenceThicknessRange={[120, 420]}
							clearcoat={0.6}
							clearcoatRoughness={0.1}
						/>
					</RoundedBox>
				</Float>
			</group>
			<ambientLight intensity={0.25} />
			<directionalLight position={[2, 3, 4]} intensity={1.2} />
			<directionalLight
				position={[-3, -1, 2]}
				intensity={0.4}
				color="#a78bfa"
			/>
			<FilmGrade vignette={0.35} grain={0.03} />
		</>
	);
}
