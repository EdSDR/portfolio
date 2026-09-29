/*
Model: "Thor and the Midgard Serpent" by MrEmjeR
(https://sketchfab.com/MatthijsDeRijk), CC BY 4.0
(http://creativecommons.org/licenses/by/4.0/), from
https://sketchfab.com/models/2ef4c45caa35450db1b876a7f94ff79d, via the pmndrs
viking-ship example. Modified: flattened and cleaned up, and relit for night.
*/
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
	Bloom,
	EffectComposer,
	Noise,
	ToneMapping,
	Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SwellBody } from "./midgard-sea";
import { MOON_DIR, SKY_GLSL, Storm } from "./midgard-storm";
import { useWeather } from "./midgard-weather";

const DRACO_PATH = "/draco/";
const MODEL = "/midgard.glb";

/** Model point the camera orbits (moved to the origin): between the deck and the serpent's head. */
const FOCUS = new THREE.Vector3(-2, 9, -1);
const FOG = "#1a2130";
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** The fort on the cliff is burning (model space): the light, and the flames around it. */
const FIRE: [number, number, number] = [17, 11, -10.5];
const FLAMES: [number, number, number][] = [
	[16.2, 10.3, -10.8],
	[17.6, 10.6, -10.2],
	[18.5, 10.2, -11.2],
];
const FIRE_COLOR = new THREE.Color("#ff8a3d");
/** Lantern light on the ship's deck, and the serpent's eyes glowing on its head (model space). */
const LANTERN: [number, number, number] = [4.5, 5, 1];
const EYES: [number, number, number] = [-5.2, 14.6, -1.6];

/**
 * Distance fog, as in the original example: linear from the camera, so the
 * front of the island stays crisp and the back dissolves into the sky (whose
 * lower band is the fog colour); zooming in and out changes it.
 */
const FOG_NEAR = 12;
const FOG_FAR = 75;

type Part = "ship" | "rock" | "serpent" | "eyes" | "boat1" | "boat2" | "water";
type Model = { nodes: Record<Part, THREE.Mesh> };

// The night sky (no flash) rendered once into an environment map, so the model
// picks up the same blues and moon highlights as the water and the backdrop.
const ENV_SKY_VERTEX = /* glsl */ `
	varying vec3 vDir;
	void main() {
		vDir = normalize(position);
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const ENV_SKY_FRAGMENT = /* glsl */ `
	${SKY_GLSL}
	varying vec3 vDir;
	void main() {
		vec3 d = normalize(vDir);
		gl_FragColor = vec4(d.y < 0.0 ? uHorizon * (1.0 + d.y) : skyColor(d), 1.0);
	}
`;

function nightEnvironment(gl: THREE.WebGLRenderer, storm: Storm) {
	const u = storm.uniforms;
	const sky = new THREE.Mesh(
		new THREE.SphereGeometry(100, 32, 16),
		new THREE.ShaderMaterial({
			vertexShader: ENV_SKY_VERTEX,
			fragmentShader: ENV_SKY_FRAGMENT,
			uniforms: {
				...u,
				// Brighter than the visible sky: a moonlit overcast, so reflections
				// (the glassy water above all) have something to show.
				uHorizon: { value: new THREE.Color("#2c3850") },
				uZenith: { value: new THREE.Color("#141a28") },
				uSky: { value: 0 },
			},
			side: THREE.BackSide,
		}),
	);
	const scene = new THREE.Scene();
	scene.add(sky);
	const pmrem = new THREE.PMREMGenerator(gl);
	const target = pmrem.fromScene(scene, 0.04);
	pmrem.dispose();
	sky.geometry.dispose();
	sky.material.dispose();
	return target;
}

/**
 * The water mirrors the sky strongly, but point and moon highlights on a
 * surface that smooth bloom into hard blobs. Keep the reflections, soften only
 * the direct-light highlights.
 */
function softenWaterGlints(shader: THREE.WebGLProgramParametersWithUniforms) {
	shader.fragmentShader = shader.fragmentShader.replace(
		"#include <lights_fragment_end>",
		`#include <lights_fragment_end>
		reflectedLight.directSpecular *= 0.15;
		#ifdef USE_CLEARCOAT
			clearcoatSpecularDirect *= 0.15;
		#endif`,
	);
}

/** A part of the model that moves on its own, rotating about `pivot` (model space). */
function Tossed({
	pivot,
	body,
	children,
}: {
	pivot: [number, number, number];
	body: SwellBody;
	children: ReactNode;
}) {
	const toss = useRef<THREE.Group>(null);
	useFrame((_, delta) => {
		if (toss.current) body.update(toss.current, delta);
	});
	return (
		<group position={pivot}>
			<group ref={toss}>
				<group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
			</group>
		</group>
	);
}

const Part = ({ mesh }: { mesh: THREE.Mesh }) => (
	<mesh geometry={mesh.geometry} material={mesh.material} />
);

export default function MidgardScene() {
	const { nodes } = useGLTF(MODEL, DRACO_PATH) as unknown as Model;
	const scene = useThree((s) => s.scene);

	const fogColor = useMemo(() => new THREE.Color(FOG), []);
	const baseFog = useMemo(() => new THREE.Color(FOG), []);
	// `bun run posters` sets this: the cover freezes on a strike, at the home angle.
	const poster = typeof window !== "undefined" && "__posterCapture" in window;
	const storm = useMemo(
		() => new Storm(fogColor, { posterStrike: poster }),
		[fogColor, poster],
	);
	// The original example's swing, slower: the whole scene turns up to half a
	// turn each way over ~100 s. The moon (its disc, its light and the baked sky
	// reflections) turns with it, so it reads as the camera circling the battle.
	// Own time base (R3F's clock resets on pause).
	const spin = useRef<THREE.Group>(null);
	const spinTime = useRef(0);
	const moon = useRef<THREE.DirectionalLight>(null);
	/** World position of the fire (the embers rise from it). */
	const fire = useMemo(
		() => ({ pos: new THREE.Uniform(new THREE.Vector3(0, 0, 0)) }),
		[],
	);
	const gl = useThree((s) => s.gl);
	// Layout effect: set before the canvas compiles the scene's shaders.
	useLayoutEffect(() => {
		const env = nightEnvironment(gl, storm);
		scene.environment = env.texture;
		scene.environmentIntensity = 2.8;
		// The glass water's transmission pass (the opaque scene rendered again,
		// to refract) at half resolution: it's blurred by roughness anyway.
		gl.transmissionResolutionScale = 0.5;
		return () => {
			scene.environment = null;
			env.dispose();
		};
	}, [gl, scene, storm]);
	const bodies = useMemo(
		() => ({
			// The floating island rocks slowly, as one piece.
			diorama: new SwellBody(0, 0, 40, 26, 0.03, 0.5),
		}),
		[],
	);

	// Absolute values on the (globally cached) glTF materials: safe to repeat.
	useMemo(() => {
		const eyes = nodes.eyes.material as THREE.MeshStandardMaterial;
		eyes.emissive.set("#ff4a1a");
		eyes.emissiveIntensity = 8;
		eyes.toneMapped = false;
	}, [nodes]);

	const hemi = useRef<THREE.HemisphereLight>(null);
	const flash = useRef<THREE.PointLight>(null);
	const fireLight = useRef<THREE.PointLight>(null);
	const lantern = useRef<THREE.PointLight>(null);
	const fireTime = useRef(0);
	const weather = useWeather(storm.uniforms, fire.pos, FLAMES);

	useFrame((state, delta) => {
		storm.update(delta, state.camera);
		const { uSky, uChannel, uFlashPos, uFlashColor } = storm.uniforms;
		if (hemi.current) hemi.current.intensity = 3.8 + 2 * uSky.value;
		if (flash.current) {
			flash.current.position.copy(uFlashPos.value);
			flash.current.intensity = uChannel.value * 9000;
		}
		fogColor.copy(baseFog).lerp(uFlashColor.value, uSky.value * 0.1);
		if (scene.fog) scene.fog.color = fogColor;

		if (spin.current && !poster) {
			spinTime.current += delta;
			const angle = Math.sin(spinTime.current / 16) * Math.PI;
			spin.current.rotation.y = angle;
			storm.uniforms.uMoonDir.value
				.copy(MOON_DIR)
				.applyAxisAngle(Y_AXIS, angle);
			moon.current?.position
				.copy(storm.uniforms.uMoonDir.value)
				.multiplyScalar(65);
			scene.environmentRotation.y = angle;
		}

		// Firelight flicker: three unrelated rhythms, so it never visibly loops.
		fireTime.current += delta;
		const t = fireTime.current;
		const flicker =
			0.8 +
			0.12 * Math.sin(t * 13.1) +
			0.08 * Math.sin(t * 33.3 + 1.3) +
			0.06 * Math.sin(t * 61.0);
		const light = fireLight.current;
		if (light) {
			light.intensity = 360 * flicker;
			light.getWorldPosition(fire.pos.value);
		}
		if (lantern.current)
			lantern.current.intensity = 110 * (0.92 + 0.08 * Math.sin(t * 7.3 + 2));
	});

	return (
		<>
			<fog attach="fog" args={[FOG, FOG_NEAR, FOG_FAR]} />
			<hemisphereLight ref={hemi} args={["#34426a", "#0a0d14", 3.8]} />
			{/* Moonlight from the moon's direction (behind the battle): a cold rim. */}
			<directionalLight
				ref={moon}
				position={[MOON_DIR.x * 65, MOON_DIR.y * 65, MOON_DIR.z * 65]}
				intensity={4.6}
				color="#9fb4d8"
			/>
			{/* Faint cool fill from the viewer's side, so faces aren't pure black. */}
			<directionalLight
				position={[10, 15, 40]}
				intensity={3.4}
				color="#5b6c8f"
			/>
			<pointLight ref={flash} color="#cfdcff" intensity={0} decay={2} />

			<group ref={spin}>
				<group position={[-FOCUS.x, -FOCUS.y, -FOCUS.z]}>
					{/* The floating island: water block, rock, ship and fort rock as one. */}
					<Tossed pivot={[0, 0, 0]} body={bodies.diorama}>
						{/* The example's glass water, tinted for night: you see the serpent's
					    coils and the keels through it. */}
						<mesh geometry={nodes.water.geometry}>
							<meshPhysicalMaterial
								color="#6f9fc0"
								transmission={1}
								thickness={5}
								roughness={0.04}
								specularIntensity={0.5}
								clearcoat={1}
								clearcoatRoughness={0.12}
								// The night sky is dark: reflect it harder than the rest of the
								// scene so the water reads as glassy, like the original's sunset.
								envMapIntensity={5}
								onBeforeCompile={softenWaterGlints}
							/>
						</mesh>
						<Part mesh={nodes.ship} />
						<Part mesh={nodes.rock} />
						{/* Local lights do the lighting: the burning fort, a lantern on deck. */}
						<pointLight
							ref={fireLight}
							position={FIRE}
							color={FIRE_COLOR}
							intensity={0}
							decay={2}
						/>
						<pointLight
							ref={lantern}
							position={LANTERN}
							color="#ffb070"
							intensity={0}
							decay={2}
						/>
						<group renderOrder={3}>
							<primitive object={weather.flames} />
						</group>
						{/* Everything rocks as one piece: the crews are part of the ship's
						    objects, so moving the boats or the serpent on their own
						    left them standing in mid-air. */}
						<Part mesh={nodes.serpent} />
						<Part mesh={nodes.eyes} />
						<pointLight
							position={EYES}
							color="#ff3a14"
							intensity={60}
							decay={2}
						/>
						<Part mesh={nodes.boat1} />
						<Part mesh={nodes.boat2} />
					</Tossed>
				</group>
			</group>

			<primitive object={storm.sky} />
			<group renderOrder={1}>
				<primitive object={storm.bolts} />
			</group>
			{/* Additive, so their order doesn't matter. */}
			<group renderOrder={3}>
				<primitive object={weather.rain} />
				<primitive object={weather.embers} />
			</group>

			{/* The composer turns the renderer's tone mapping off (and defaults to
			    AgX), so ACES is applied here explicitly, after Bloom. */}
			<EffectComposer multisampling={4}>
				<Bloom
					mipmapBlur
					luminanceThreshold={1}
					luminanceSmoothing={0.15}
					intensity={0.9}
					radius={0.7}
				/>
				<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
				<Vignette offset={0.3} darkness={0.6} />
				<Noise premultiply opacity={0.35} />
			</EffectComposer>
		</>
	);
}

useGLTF.preload(MODEL, DRACO_PATH);
