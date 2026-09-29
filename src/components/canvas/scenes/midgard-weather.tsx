import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { makeRng } from "@/lib/random";
import { WIND } from "./midgard-sea";
import { SEA_Y, type StormUniforms } from "./midgard-storm";

/**
 * Rain, embers and flames, one draw call each. All three are additive (their
 * order doesn't matter, nothing is sorted per frame) and animated on the GPU
 * from a time uniform: the CPU only writes a few uniforms per frame.
 */

const RAIN = { drops: 2000, box: new THREE.Vector3(70, 45, 70), length: 1.1 };
const EMBERS = 160;

const RAIN_VERTEX = /* glsl */ `
	attribute vec4 aSeed;   // xyz: spot in the box, w: speed variation
	attribute vec2 aCorner; // x: side (±1), y: 0 tail → 1 head
	uniform float uTime;
	uniform vec3 uBox;
	uniform vec3 uVel;
	uniform float uLength;
	uniform float uHeight;
	varying float vAlpha;
	varying float vHead;

	void main() {
		vec3 vel = uVel * (0.85 + 0.3 * aSeed.w);
		// Drops fall through a box that wraps around the camera: they stay put in
		// the world while you orbit, and are recycled with no CPU work.
		vec3 p = aSeed.xyz * uBox + vel * uTime;
		vec3 rel = mod(p - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox;
		vec3 center = cameraPosition + rel;
		vec3 axis = normalize(vel);
		vec3 across = normalize(cross(axis, cameraPosition - center));
		vec4 mv = viewMatrix * vec4(center, 1.0);
		// At least a pixel wide (thinner drops would shimmer); fainter to match.
		float pixel = -mv.z * 2.0 / (projectionMatrix[1][1] * uHeight);
		float width = max(0.02, pixel);
		vec3 world = center + axis * (aCorner.y - 0.5) * uLength + across * aCorner.x * width * 0.5;
		vec3 edge = abs(rel / uBox) * 2.0;
		// Fade drops right at the lens (they'd smear across the screen) and at the
		// box faces (where they wrap).
		vAlpha = (0.02 / width) * (1.0 - smoothstep(0.7, 1.0, max(max(edge.x, edge.y), edge.z)))
			* smoothstep(3.0, 9.0, -mv.z)
			* step(${SEA_Y.toFixed(1)}, world.y);
		vHead = aCorner.y;
		gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
	}
`;

const RAIN_FRAGMENT = /* glsl */ `
	uniform float uSky;
	varying float vAlpha;
	varying float vHead;

	void main() {
		float a = vAlpha * vHead * vHead * (0.16 + 2.0 * uSky);
		gl_FragColor = vec4(vec3(0.55, 0.62, 0.75) * a, 1.0);
	}
`;

const EMBER_VERTEX = /* glsl */ `
	attribute vec4 aSeed;
	uniform float uTime;
	uniform vec3 uFirePos;
	uniform vec3 uWind;
	uniform float uHeight;
	varying float vLife;

	void main() {
		float duration = 2.5 + 1.5 * aSeed.x;
		float life = fract(uTime / duration + aSeed.y);
		float age = life * duration;
		vec3 p = uFirePos + vec3(aSeed.z - 0.5, 0.0, aSeed.w - 0.5) * 3.0;
		p.y += age * 1.4;
		p.xz += uWind.xz * 0.12 * age;
		p.x += sin(uTime * 2.1 + aSeed.x * 40.0) * 0.4 * life;
		p.z += cos(uTime * 1.7 + aSeed.y * 40.0) * 0.4 * life;
		vec4 mv = viewMatrix * vec4(p, 1.0);
		gl_Position = projectionMatrix * mv;
		gl_PointSize = 0.16 * projectionMatrix[1][1] * uHeight * 0.5 / max(-mv.z, 1.0);
		vLife = life;
	}
`;

const EMBER_FRAGMENT = /* glsl */ `
	varying float vLife;

	void main() {
		float r = length(gl_PointCoord - 0.5) * 2.0;
		float a = (1.0 - smoothstep(0.0, 1.0, r)) * (1.0 - vLife) * smoothstep(0.0, 0.08, vLife);
		gl_FragColor = vec4(vec3(1.0, 0.42, 0.1) * 3.0 * a, 1.0);
	}
`;

// Flames: camera-facing quads (turning about the vertical only) with a
// flickering teardrop of noise. The core is HDR, so Bloom makes the glow.
const FLAME_VERTEX = /* glsl */ `
	attribute vec3 aBase;
	attribute vec3 aFlame; // corner x (±1), corner y (0–1), seed
	uniform vec2 uSize;
	varying vec2 vUv;
	varying float vSeed;

	void main() {
		vec3 base = (modelMatrix * vec4(aBase, 1.0)).xyz;
		vec3 toCamera = cameraPosition - base;
		vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x));
		vec3 world = base + right * aFlame.x * uSize.x * 0.5 + vec3(0.0, aFlame.y * uSize.y, 0.0);
		vUv = vec2(aFlame.x * 0.5 + 0.5, aFlame.y);
		vSeed = aFlame.z;
		gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
	}
`;

const FLAME_FRAGMENT = /* glsl */ `
	uniform float uTime;
	varying vec2 vUv;
	varying float vSeed;

	float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
	float noise(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		f = f * f * (3.0 - 2.0 * f);
		return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
	}

	void main() {
		vec2 uv = vUv;
		float t = uTime * 2.2 + vSeed * 10.0;
		float n = noise(vec2(uv.x * 4.0, uv.y * 3.0 - t)) * 0.6 + noise(vec2(uv.x * 9.0, uv.y * 7.0 - t * 1.7)) * 0.4;
		// Teardrop: wide at the bottom, licking up to a point.
		float width = mix(0.45, 0.02, uv.y) * (0.8 + 0.5 * n);
		float shape = 1.0 - smoothstep(width * 0.6, width, abs(uv.x - 0.5));
		float body = shape * smoothstep(1.0, 0.25, uv.y + n * 0.35) * smoothstep(0.0, 0.08, uv.y);
		vec3 color = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.75, 0.35), body * (1.0 - uv.y));
		gl_FragColor = vec4(color * body * 4.0, 1.0);
	}
`;

function rainGeometry() {
	const seeds: number[] = [];
	const corners: number[] = [];
	const index: number[] = [];
	const random = makeRng(99);
	for (let i = 0; i < RAIN.drops; i++) {
		const seed = [random(), random(), random(), random()];
		for (const [x, y] of [
			[-1, 0],
			[1, 0],
			[-1, 1],
			[1, 1],
		]) {
			seeds.push(...seed);
			corners.push(x, y);
		}
		const v = i * 4;
		index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
	}
	const geometry = new THREE.BufferGeometry();
	// Positions come from the seeds; `position` only sets the vertex count.
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(new Float32Array(RAIN.drops * 12), 3),
	);
	geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 4));
	geometry.setAttribute(
		"aCorner",
		new THREE.Float32BufferAttribute(corners, 2),
	);
	geometry.setIndex(index);
	return geometry;
}

function emberGeometry() {
	const random = makeRng(7);
	const seeds = Array.from({ length: EMBERS * 4 }, random);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(new Float32Array(EMBERS * 3), 3),
	);
	geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 4));
	return geometry;
}

/** Flame quads at the given points (in the parent's space, so they move with it). */
function flameGeometry(points: [number, number, number][]) {
	const base: number[] = [];
	const flame: number[] = [];
	const index: number[] = [];
	points.forEach((p, i) => {
		for (const [x, y] of [
			[-1, 0],
			[1, 0],
			[-1, 1],
			[1, 1],
		]) {
			base.push(...p);
			flame.push(x, y, i * 0.37);
		}
		const v = i * 4;
		index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
	});
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(base, 3));
	geometry.setAttribute("aBase", new THREE.Float32BufferAttribute(base, 3));
	geometry.setAttribute("aFlame", new THREE.Float32BufferAttribute(flame, 3));
	geometry.setIndex(index);
	return geometry;
}

const additive = {
	transparent: true,
	depthWrite: false,
	blending: THREE.AdditiveBlending,
} as const;

/** Rain and embers (world space); the flames are returned for the fire's own group. */
export function useWeather(
	storm: StormUniforms,
	firePos: THREE.Uniform<THREE.Vector3>,
	flamePoints: [number, number, number][],
) {
	const { rain, embers, flames } = useMemo(() => {
		const time = new THREE.Uniform(0);
		const height = new THREE.Uniform(1);
		const rain = new THREE.Mesh(
			rainGeometry(),
			new THREE.ShaderMaterial({
				vertexShader: RAIN_VERTEX,
				fragmentShader: RAIN_FRAGMENT,
				uniforms: {
					uTime: time,
					uHeight: height,
					uBox: { value: RAIN.box },
					uVel: { value: WIND },
					uLength: { value: RAIN.length },
					uSky: storm.uSky,
				},
				...additive,
			}),
		);
		const embers = new THREE.Points(
			emberGeometry(),
			new THREE.ShaderMaterial({
				vertexShader: EMBER_VERTEX,
				fragmentShader: EMBER_FRAGMENT,
				uniforms: {
					uTime: time,
					uHeight: height,
					uFirePos: firePos,
					uWind: { value: WIND },
				},
				...additive,
			}),
		);
		const flames = new THREE.Mesh(
			flameGeometry(flamePoints),
			new THREE.ShaderMaterial({
				vertexShader: FLAME_VERTEX,
				fragmentShader: FLAME_FRAGMENT,
				uniforms: { uTime: time, uSize: { value: new THREE.Vector2(1.6, 3) } },
				...additive,
				side: THREE.DoubleSide,
			}),
		);
		for (const o of [rain, embers, flames]) o.frustumCulled = false;
		return { rain, embers, flames };
	}, [storm, firePos, flamePoints]);

	useFrame((state, delta) => {
		const u = rain.material.uniforms;
		u.uTime.value += delta;
		u.uHeight.value = state.size.height * state.gl.getPixelRatio();
	});

	return { rain, embers, flames };
}
