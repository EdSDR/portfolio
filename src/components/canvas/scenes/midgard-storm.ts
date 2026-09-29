import * as THREE from "three";
import { makeRng } from "@/lib/random";
import { fullScreenTriangle } from "./full-screen-triangle";

/**
 * The storm over Midgard: when lightning strikes, how bright it is over time,
 * the bolts themselves, and the night sky. Everything else in the scene reads
 * the flash through `StormUniforms`, so one `update()` per frame drives the
 * bolt, the lights, the fog and the sky together.
 */

/** Scene height where bolts start (out of the dark) and of the sea (where they end). */
export const CLOUD_BASE_Y = 30;
export const SEA_Y = -9;

/** Direction to the moon (before the scene's swing turns it). */
export const MOON_DIR = new THREE.Vector3(-0.45, 0.28, -1).normalize();

/** Flash colour: a cold blue-white. */
const FLASH_COLOR = "#cfdcff";

// -- Flash envelopes ---------------------------------------------------------
// A strike is a leader (the channel drawn top-down), then 2–4 return strokes
// tens of milliseconds apart. Small areas (the bolt, the point light's falloff)
// flicker with every stroke; large areas (sky, fog, hemisphere) get one soft
// hump, so the screen never flashes more than about three times a second.

const pulse = (age: number, attack: number, decay: number) =>
	age < 0 ? 0 : age < attack ? age / attack : Math.exp(-(age - attack) / decay);

export interface Strike {
	/** Stroke start times (s after the strike begins) and amplitudes. */
	strokes: { t: number; a: number }[];
	bolt: number;
	position: THREE.Vector3;
	yaw: number;
	scale: number;
}

const LEADER = 0.05;

/** Bolt brightness: every stroke flickers it. */
export const channelAt = (s: Strike, age: number) =>
	Math.min(
		1,
		s.strokes.reduce(
			(sum, k) => sum + k.a * pulse(age - LEADER - k.t, 0.012, 0.045),
			0,
		),
	);

/** Sky/fog/ambient brightness: one hump per strike. */
export const skyAt = (s: Strike, age: number, channel = channelAt(s, age)) =>
	0.6 * pulse(age - LEADER, 0.03, 0.4) + 0.025 * channel;

/** How far down the channel is drawn (the leader), 0–1. */
export const revealAt = (age: number) => Math.min(1, Math.max(0, age / LEADER));

/** Seconds from one strike to the next (a restrike follows 20% of the time). */
export function nextGap(random: () => number) {
	if (random() < 0.2) return 0.8 + random() * 0.5;
	return Math.min(10, Math.max(2.2, -Math.log(1 - random()) * 4.5));
}

export function makeStrokes(random: () => number) {
	const count = 2 + Math.floor(random() * 3);
	const strokes = [{ t: 0, a: 1 }];
	for (let i = 1; i < count; i++)
		strokes.push({
			t: strokes[i - 1].t + 0.05 + random() * 0.06,
			a: 0.3 + random() * 0.6,
		});
	return strokes;
}

// -- Bolt geometry ------------------------------------------------------------

const BOLTS = 4;

/** A jagged line from `a` to `b`: midpoint displacement, `depth` times. */
function jagged(
	a: THREE.Vector3,
	b: THREE.Vector3,
	depth: number,
	roughness: number,
	random: () => number,
) {
	let points = [a, b];
	for (let d = 0; d < depth; d++) {
		const next: THREE.Vector3[] = [];
		for (let i = 0; i < points.length - 1; i++) {
			const p = points[i];
			const q = points[i + 1];
			const len = p.distanceTo(q);
			const mid = p.clone().lerp(q, 0.5);
			mid.x += (random() - 0.5) * 2 * roughness * len;
			mid.z += (random() - 0.5) * 2 * roughness * len;
			mid.y += (random() - 0.5) * roughness * len * 0.5;
			next.push(p, mid);
		}
		next.push(points[points.length - 1]);
		points = next;
	}
	return points;
}

interface Polyline {
	points: THREE.Vector3[];
	/** Channel position (0 top → 1 bottom) of each point, for the leader. */
	t: number[];
	branch: boolean;
}

function boltLines(random: () => number): Polyline[] {
	const top = new THREE.Vector3(0, CLOUD_BASE_Y, 0);
	const bottom = new THREE.Vector3(
		(random() - 0.5) * 10,
		SEA_Y,
		(random() - 0.5) * 10,
	);
	const main = jagged(top, bottom, 6, 0.2, random);
	const height = CLOUD_BASE_Y - SEA_Y;
	const tOf = (p: THREE.Vector3) => (CLOUD_BASE_Y - p.y) / height;
	const lines: Polyline[] = [{ points: main, t: main.map(tOf), branch: false }];
	const branches = 3 + Math.floor(random() * 3);
	for (let i = 0; i < branches; i++) {
		const start = main[4 + Math.floor(random() * (main.length * 0.6))];
		const length = (start.y - SEA_Y) * (0.2 + random() * 0.25);
		const angle = random() * Math.PI * 2;
		const end = start
			.clone()
			.add(
				new THREE.Vector3(
					Math.cos(angle) * length * 0.7,
					-length,
					Math.sin(angle) * length * 0.7,
				),
			);
		const points = jagged(start, end, 4, 0.25, random);
		lines.push({ points, t: points.map(tOf), branch: true });
	}
	return lines;
}

/**
 * All bolts in one mesh: every line becomes a camera-facing ribbon (expanded
 * in the vertex shader). Only the active bolt, placed by uniforms, is drawn;
 * the others are clipped away, so a strike costs no geometry work.
 */
function boltGeometry(random: () => number) {
	const position: number[] = [];
	const dir: number[] = [];
	const side: number[] = [];
	const t: number[] = [];
	const kind: number[] = [];
	const bolt: number[] = [];
	const index: number[] = [];
	for (let b = 0; b < BOLTS; b++) {
		for (const line of boltLines(random)) {
			const base = position.length / 3;
			line.points.forEach((p, i) => {
				const prev = line.points[Math.max(0, i - 1)];
				const next = line.points[Math.min(line.points.length - 1, i + 1)];
				const d = next.clone().sub(prev).normalize();
				for (const s of [-1, 1]) {
					position.push(p.x, p.y, p.z);
					dir.push(d.x, d.y, d.z);
					side.push(s);
					t.push(line.t[i]);
					kind.push(line.branch ? 1 : 0);
					bolt.push(b);
				}
				if (i > 0) {
					const v = base + i * 2;
					index.push(v - 2, v - 1, v, v - 1, v + 1, v);
				}
			});
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(position, 3),
	);
	geometry.setAttribute("aDir", new THREE.Float32BufferAttribute(dir, 3));
	geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
	geometry.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
	geometry.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
	geometry.setAttribute("aBolt", new THREE.Float32BufferAttribute(bolt, 1));
	geometry.setIndex(index);
	return geometry;
}

const BOLT_VERTEX = /* glsl */ `
	attribute vec3 aDir;
	attribute float aSide;
	attribute float aT;
	attribute float aKind;
	attribute float aBolt;
	uniform vec4 uBolt;      // reveal, main, branch, active bolt
	uniform vec4 uBoltPlace; // offset x, offset z, yaw, horizontal scale
	varying float vSide;
	varying float vKind;
	varying float vT;

	void main() {
		vT = aT;
		// Inactive bolts: every vertex moves off screen, so whole ribbons vanish.
		// (The leader is cut per fragment instead: moving single vertices would
		// stretch the triangles at the cut into slivers.)
		if (abs(aBolt - uBolt.w) > 0.5) {
			gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
			return;
		}
		float c = cos(uBoltPlace.z);
		float s = sin(uBoltPlace.z);
		mat2 turn = mat2(c, -s, s, c);
		vec3 p = position;
		p.xz = turn * (p.xz * uBoltPlace.w) + uBoltPlace.xy;
		vec3 d = aDir;
		d.xz = turn * d.xz;
		vec3 across = normalize(cross(d, cameraPosition - p));
		float halfWidth = aKind < 0.5 ? 0.5 : 0.28;
		p += across * aSide * halfWidth;
		vSide = aSide;
		vKind = aKind;
		gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
	}
`;

const BOLT_FRAGMENT = /* glsl */ `
	uniform vec4 uBolt;
	uniform vec3 uFlashColor;
	varying float vSide;
	varying float vKind;
	varying float vT;

	void main() {
		if (vT > uBolt.x) discard; // not reached by the leader yet
		float x = vSide;
		float core = exp(-x * x / 0.015);
		float halo = exp(-abs(x) * 3.0) * 0.35;
		float strength = vKind < 0.5 ? uBolt.y : uBolt.z * 0.4;
		// HDR core (well above Bloom's threshold of 1) with a soft glow around it.
		// Emerges out of the dark at the top rather than starting at a hard end.
		float emerge = smoothstep(0.0, 0.2, vT);
		vec3 color = uFlashColor * (core * (4.0 + 10.0 * strength) + halo) * strength * emerge;
		gl_FragColor = vec4(color, 1.0);
	}
`;

// -- Sky ----------------------------------------------------------------------

/** GLSL: the night sky seen in direction `d` (also what the sea reflects). */
export const SKY_GLSL = /* glsl */ `
	uniform vec3 uZenith;
	uniform vec3 uHorizon;
	uniform vec3 uMoonDir;
	uniform vec3 uMoonColor;
	uniform vec3 uFlashPos;
	uniform vec3 uFlashColor;
	uniform float uSky;

	vec3 skyColor(vec3 d) {
		// The fog colour holds across the band behind the scene (so fogged parts
		// dissolve into it), darkening only higher up.
		vec3 color = mix(uHorizon, uZenith, smoothstep(0.2, 0.9, d.y));
		float moon = max(dot(d, uMoonDir), 0.0);
		// Disc and halo, faded out toward the horizon so the sky meets the fogged sea.
		color += uMoonColor * (smoothstep(0.9994, 0.9997, moon) * 3.0 + pow(moon, 24.0) * 0.08)
			* smoothstep(0.0, 0.2, d.y);
		// The glow around the strike; the overall lift comes through the fog
		// colour (uHorizon), which the fogged sea shares, so the horizon holds.
		float toFlash = max(dot(d, normalize(uFlashPos - cameraPosition)), 0.0);
		color += uFlashColor * uSky * pow(toFlash, 8.0) * 0.35 * smoothstep(0.0, 0.1, d.y);
		return color;
	}
`;

const SKY_VERTEX = /* glsl */ `
	uniform mat4 uProjInv;
	uniform mat4 uCamWorld;
	varying vec3 vDir;

	void main() {
		vec4 view = uProjInv * vec4(position.xy, 1.0, 1.0);
		vDir = mat3(uCamWorld) * (view.xyz / view.w);
		gl_Position = vec4(position.xy, 1.0, 1.0);
	}
`;

const SKY_FRAGMENT = /* glsl */ `
	${SKY_GLSL}
	varying vec3 vDir;

	void main() {
		vec3 d = normalize(vDir);
		gl_FragColor = vec4(d.y < 0.0 ? uHorizon : skyColor(d), 1.0);
		#include <colorspace_fragment>
	}
`;

// -- The storm ----------------------------------------------------------------

export type StormUniforms = ReturnType<typeof makeUniforms>;

function makeUniforms(horizon: THREE.Color) {
	return {
		/** Bolt + point light: every stroke. */
		uChannel: new THREE.Uniform(0),
		/** Sky, fog, ambient: one hump per strike. */
		uSky: new THREE.Uniform(0),
		uFlashPos: new THREE.Uniform(new THREE.Vector3(0, CLOUD_BASE_Y, -60)),
		uFlashColor: new THREE.Uniform(new THREE.Color(FLASH_COLOR)),
		uMoonDir: new THREE.Uniform(MOON_DIR.clone()),
		uMoonColor: new THREE.Uniform(new THREE.Color("#9fb4d8")),
		uZenith: new THREE.Uniform(new THREE.Color("#04060b")),
		/** The fog colour itself (same object), so the horizon always matches the fog. */
		uHorizon: new THREE.Uniform(horizon),
		uBolt: new THREE.Uniform(new THREE.Vector4(0, 0, 0, -1)),
		uBoltPlace: new THREE.Uniform(new THREE.Vector4(0, 0, 0, 1)),
		uProjInv: new THREE.Uniform(new THREE.Matrix4()),
		uCamWorld: new THREE.Uniform(new THREE.Matrix4()),
	};
}

export class Storm {
	readonly uniforms: StormUniforms;
	readonly bolts: THREE.Mesh;
	readonly sky: THREE.Mesh;
	private readonly random = makeRng(2718);
	private time = 0;
	private next: number;
	private strike: (Strike & { start: number }) | null = null;
	/** A strike still fading when a restrike begins (so the flash doesn't pop). */
	private fading: (Strike & { start: number }) | null = null;
	/** Poster capture: fire one strike early and hold it at its peak. */
	private readonly hold: number | null;

	constructor(horizon: THREE.Color, options: { posterStrike?: boolean } = {}) {
		this.uniforms = makeUniforms(horizon);
		this.hold = options.posterStrike ? 0.13 : null;
		this.next = options.posterStrike ? 0.8 : 1.6;

		this.bolts = new THREE.Mesh(
			boltGeometry(makeRng(1123)),
			new THREE.ShaderMaterial({
				vertexShader: BOLT_VERTEX,
				fragmentShader: BOLT_FRAGMENT,
				uniforms: this.uniforms,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				side: THREE.DoubleSide,
			}),
		);
		this.bolts.frustumCulled = false;

		this.sky = new THREE.Mesh(
			fullScreenTriangle(),
			new THREE.ShaderMaterial({
				vertexShader: SKY_VERTEX,
				fragmentShader: SKY_FRAGMENT,
				uniforms: this.uniforms,
				depthWrite: false,
			}),
		);
		this.sky.frustumCulled = false;
		// Last among the opaque objects: only pixels nothing else covered are shaded.
		this.sky.renderOrder = 1;
		// The camera as it is for this very render (controls and the close ease
		// move it after the scene's own frame callback).
		this.sky.onBeforeRender = (_renderer, _scene, camera) => {
			this.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
			this.uniforms.uCamWorld.value.copy(camera.matrixWorld);
		};
	}

	update(delta: number, camera: THREE.Camera) {
		const u = this.uniforms;
		const held =
			this.hold !== null &&
			this.strike &&
			this.time - this.strike.start >= this.hold;
		if (!held) this.time += delta;

		if (this.time >= this.next) this.begin(camera);
		const s = this.strike;
		if (!s) return;
		const age = this.time - s.start;
		const channel = channelAt(s, age);
		let sky = skyAt(s, age, channel);
		let light = channel;
		const f = this.fading;
		if (f) {
			const fadingAge = this.time - f.start;
			const fadingChannel = channelAt(f, fadingAge);
			sky = Math.max(sky, skyAt(f, fadingAge, fadingChannel));
			light = Math.max(light, fadingChannel);
			if (fadingAge > 3) this.fading = null;
		}
		u.uChannel.value = light;
		u.uSky.value = sky;
		u.uBolt.value.set(revealAt(age), channel, age < 0.2 ? channel : 0, s.bolt);
		if (age > 3) {
			this.strike = null;
			u.uBolt.value.set(0, 0, 0, -1);
			u.uChannel.value = 0;
			u.uSky.value = 0;
		}
	}

	private begin(camera: THREE.Camera) {
		const r = this.random;
		// Behind the battle as seen from wherever the camera is.
		const facing = Math.atan2(camera.position.x, camera.position.z) + Math.PI;
		const azimuth = facing + (r() - 0.5) * 1.6;
		const distance = 45 + r() * 30;
		const position = new THREE.Vector3(
			Math.sin(azimuth) * distance,
			CLOUD_BASE_Y,
			Math.cos(azimuth) * distance,
		);
		const bolt = Math.floor(r() * BOLTS);
		this.fading = this.strike;
		this.strike = {
			start: this.time,
			strokes: makeStrokes(r),
			bolt,
			position,
			yaw: r() * Math.PI * 2,
			scale: 0.8 + r() * 0.4,
		};
		this.uniforms.uFlashPos.value.copy(position);
		this.uniforms.uBoltPlace.value.set(
			position.x,
			position.z,
			this.strike.yaw,
			this.strike.scale,
		);
		this.next = this.time + nextGap(r);
	}
}
