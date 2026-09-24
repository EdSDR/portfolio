import { Float, PerspectiveCamera, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

/** Placeholder hero: a starfield with a slowly turning emerald knot. */
export default function PolarisScene() {
	const knot = useRef<Mesh>(null);

	useFrame((_, delta) => {
		if (knot.current) knot.current.rotation.y += delta * 0.3;
	});

	return (
		<>
			<PerspectiveCamera makeDefault position={[0, 0, 4]} fov={45} />
			<Stars radius={40} depth={30} count={1200} factor={3} fade speed={0.5} />
			<Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.8}>
				<mesh ref={knot}>
					<torusKnotGeometry args={[0.85, 0.27, 128, 24]} />
					<meshStandardMaterial
						color="#34d399"
						emissive="#065f46"
						emissiveIntensity={0.6}
						roughness={0.3}
						metalness={0.4}
					/>
				</mesh>
			</Float>
			<ambientLight intensity={0.4} />
			<directionalLight position={[3, 4, 5]} intensity={1.2} />
		</>
	);
}
