import { Float, RoundedBox } from "@react-three/drei";

/** Placeholder hero: soft floating rounded cards. */
export default function SmoothUIScene() {
	return (
		<>
			<color attach="background" args={["#222222"]} />
			<Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
				<RoundedBox args={[1.7, 1.05, 0.2]} radius={0.09} smoothness={6}>
					<meshStandardMaterial
						color="#f4f4f5"
						roughness={0.5}
						metalness={0.1}
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
					<meshStandardMaterial color="#a78bfa" roughness={0.4} />
				</RoundedBox>
			</Float>
			<ambientLight intensity={0.6} />
			<directionalLight position={[2, 3, 4]} intensity={1.5} />
			<directionalLight
				position={[-3, -1, 2]}
				intensity={0.4}
				color="#a78bfa"
			/>
		</>
	);
}
