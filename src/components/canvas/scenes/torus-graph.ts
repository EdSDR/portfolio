import {
	forceCenter,
	forceLink,
	forceManyBody,
	forceSimulation,
	type SimNode,
	type Simulation,
} from "d3-force-3d";
import * as THREE from "three";
import {
	type GraphLink,
	type GraphNode,
	generateGraph,
	type NodeType,
} from "@/lib/graph-data";

/** Force-simulation layout. Tuned by eye; edits hot-reload (the graph rebuilds). */
const FORCE = { charge: -60, linkDistance: 42, center: 0.55 };
/** Ticks run before the first frame, then one per frame until it settles. */
const SIM = { warmupTicks: 80, cooldownTicks: 260, alphaDecay: 0.025 };

/** Base tint of every link thread. */
const LINK_TINT = "#e6ebf2";
/** Link brightness at rest (additive, so crossings add up). */
const LINK_BASE = 0.17;
/** Pulse trail length, in link lengths. */
const PULSE_TRAIL = 0.09;
/** The data's particle speeds are link lengths per 60fps frame; scaled for a calm flow. */
const PULSE_SPEED = 0.18 * 60;
/** Pulse head diameter, in graph units. */
const PULSE_SIZE = 4;
/**
 * Atmospheric depth: everything dims from full at `near` to `floor` at `far`
 * (view-space distance), so the graph reads as a volume, not a flat web.
 */
const DEPTH = { near: 330, far: 820, floor: 0.35 };

// Shared by every shader: fade factor for a view-space position.
const DEPTH_FADE = /* glsl */ `
	uniform vec3 uDepth; // near, far, floor
	float depthFade(vec4 mv) {
		return mix(uDepth.z, 1.0, 1.0 - smoothstep(uDepth.x, uDepth.y, -mv.z));
	}
`;

type Node = GraphNode & SimNode;
type Link = Omit<GraphLink, "source" | "target"> & {
	source: string | Node;
	target: string | Node;
};

type Shape = "sphere" | "icosa" | "tetra" | "octa";

/** Node roles get their own silhouettes; faceted ones read as crystals. */
const SHAPE_OF: Record<NodeType, Shape> = {
	hub: "sphere",
	root: "sphere",
	agent: "sphere",
	perm: "icosa",
	signal: "tetra",
	user: "octa",
};

/** Unit-radius geometry per shape; each instance is scaled to its node's size. */
const makeShape: Record<Shape, () => THREE.BufferGeometry> = {
	sphere: () => new THREE.SphereGeometry(1, 20, 14),
	icosa: () => new THREE.IcosahedronGeometry(1, 0),
	tetra: () => new THREE.TetrahedronGeometry(1),
	octa: () => new THREE.OctahedronGeometry(1, 0),
};

/** Stable pseudo-random in [0, 1) per integer, for phases and tilts. */
const hash = (i: number) => {
	const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

// Nodes: unlit color with a bright fresnel rim, so each reads as a lit orb or
// crystal (faceted shapes have flat normals, so every face gets its own rim
// value) and the rim is what Bloom picks up. A slow per-node breathing keeps
// the settled graph alive.
const NODE_VERTEX = /* glsl */ `
	${DEPTH_FADE}
	attribute float aPhase;
	uniform float uTime;
	varying vec3 vColor;
	varying vec3 vNormal;
	varying vec3 vView;
	varying float vBreath;

	void main() {
		vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
		vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
		vView = normalize(-mv.xyz);
		vColor = instanceColor * depthFade(mv);
		vBreath = 0.5 + 0.5 * sin(uTime * 0.9 + aPhase * 6.2831);
		gl_Position = projectionMatrix * mv;
	}
`;

const NODE_FRAGMENT = /* glsl */ `
	varying vec3 vColor;
	varying vec3 vNormal;
	varying vec3 vView;
	varying float vBreath;

	void main() {
		float facing = abs(dot(normalize(vNormal), normalize(vView)));
		// Clamped: rounding can put facing a hair above 1, and pow() of a negative
		// base is NaN, which Bloom's mip chain smears into a dark flash.
		float rim = pow(clamp(1.0 - facing, 0.0, 1.0), 2.2);
		vec3 core = vColor * (0.72 + 0.18 * vBreath);
		vec3 edge = mix(vColor, vec3(1.0), 0.3) * rim * 1.6;
		gl_FragColor = vec4(core + edge, 1.0);
		#include <colorspace_fragment>
	}
`;

// Links: 1px threads, additive. Links that carried particles now carry pulses:
// a bright head with a fading trail, computed per fragment from the position
// along the link (aT: 0 at the source, 1 at the target), so any number of
// pulses costs one draw call.
const LINK_VERTEX = /* glsl */ `
	${DEPTH_FADE}
	attribute float aT;
	attribute vec3 aFlow; // pulses per second (link lengths), phase, pulse count
	attribute vec3 aColor;
	varying float vT;
	varying vec3 vFlow;
	varying vec3 vColor;
	varying float vFade;

	void main() {
		vec4 mv = modelViewMatrix * vec4(position, 1.0);
		vT = aT;
		vFlow = aFlow;
		vColor = aColor;
		vFade = depthFade(mv);
		gl_Position = projectionMatrix * mv;
	}
`;

const LINK_FRAGMENT = /* glsl */ `
	uniform float uTime;
	uniform vec3 uTint;
	uniform float uBase;
	uniform float uTrail;
	varying float vT;
	varying vec3 vFlow;
	varying vec3 vColor;
	varying float vFade;

	void main() {
		vec3 color = uTint * uBase;
		if (vFlow.z > 0.5) {
			// Distance behind the nearest head, in link lengths.
			float behind = fract(vFlow.z * (uTime * vFlow.x + vFlow.y - vT)) / vFlow.z;
			color += vColor * exp(-behind / uTrail) * 0.9;
		}
		gl_FragColor = vec4(color * vFade, 1.0);
		#include <colorspace_fragment>
	}
`;

// Pulse heads: one point sprite per pulse, placed along its link on the GPU.
const PULSE_VERTEX = /* glsl */ `
	${DEPTH_FADE}
	attribute vec3 aEnd;
	attribute vec2 aFlow; // speed, phase
	attribute vec3 aColor;
	uniform float uTime;
	uniform float uSize;
	uniform float uHeight;
	varying vec3 vColor;

	void main() {
		float t = fract(uTime * aFlow.x + aFlow.y);
		vec4 mv = modelViewMatrix * vec4(mix(position, aEnd, t), 1.0);
		gl_Position = projectionMatrix * mv;
		// World-size sprite: diameter → pixels at this depth.
		gl_PointSize = uSize * projectionMatrix[1][1] * uHeight * 0.5 / max(-mv.z, 1.0);
		vColor = aColor * depthFade(mv);
	}
`;

const PULSE_FRAGMENT = /* glsl */ `
	varying vec3 vColor;

	void main() {
		float r = length(gl_PointCoord - 0.5) * 2.0;
		float a = 1.0 - smoothstep(0.0, 1.0, r);
		gl_FragColor = vec4(vColor * a * a * 1.8, 1.0);
		#include <colorspace_fragment>
	}
`;

/**
 * The Torus hypergraph, drawn in a handful of draw calls: one InstancedMesh
 * per node shape, every link in one LineSegments, every pulse head in one
 * Points. The d3-force-3d simulation writes positions into those buffers
 * while it runs; once it settles the buffers stay put and only `uTime` moves.
 */
export class TorusGraph {
	readonly object = new THREE.Group();
	private readonly sim: Simulation<Node>;
	private readonly links: Link[];
	private readonly buckets: { mesh: THREE.InstancedMesh; nodes: Node[] }[] = [];
	private readonly tilts: THREE.Quaternion[] = [];
	private readonly linePositions: Float32Array;
	private readonly lineGeometry = new THREE.BufferGeometry();
	private readonly pulseGeometry = new THREE.BufferGeometry();
	private readonly pulseStart: THREE.BufferAttribute;
	private readonly pulseEnd: THREE.BufferAttribute;
	/** Link index of each pulse head. */
	private readonly pulseLinks: number[] = [];
	private readonly time = { value: 0 };
	private readonly height = { value: 1 };
	private readonly depth = {
		value: new THREE.Vector3(DEPTH.near, DEPTH.far, DEPTH.floor),
	};
	private ticks = 0;

	constructor() {
		const data = generateGraph();
		const nodes: Node[] = data.nodes;
		this.links = data.links;

		// The warmup runs with d3's default forces (a compact start), then the
		// tuned ones take over from a reheated sim: the sequence FORCE was tuned
		// against (the graph library this replaced did the same).
		const link = forceLink<Node, Link>(this.links).id((n) => n.id);
		const charge = forceManyBody();
		const center = forceCenter();
		this.sim = forceSimulation(nodes, 3)
			.alphaDecay(SIM.alphaDecay)
			.force("link", link)
			.force("charge", charge)
			.force("center", center)
			.stop()
			.tick(SIM.warmupTicks);
		link.distance(FORCE.linkDistance);
		charge.strength(FORCE.charge);
		center.strength(FORCE.center);
		this.sim.alpha(1);

		this.buildNodes(nodes);
		this.linePositions = this.buildLinks();
		[this.pulseStart, this.pulseEnd] = this.buildPulses();
		this.sync();
	}

	/** Advances pulses and, until it settles, the layout. */
	update(delta: number, drawingBufferHeight: number) {
		this.time.value += delta;
		this.height.value = drawingBufferHeight;
		if (this.ticks < SIM.cooldownTicks) {
			this.ticks++;
			this.sim.tick();
			this.sync();
		}
	}

	private buildNodes(nodes: Node[]) {
		const byShape = new Map<Shape, Node[]>();
		for (const n of nodes) {
			const shape = SHAPE_OF[n.type];
			const group = byShape.get(shape);
			if (group) group.push(n);
			else byShape.set(shape, [n]);
		}
		const material = new THREE.ShaderMaterial({
			vertexShader: NODE_VERTEX,
			fragmentShader: NODE_FRAGMENT,
			uniforms: { uTime: this.time, uDepth: this.depth },
		});
		const color = new THREE.Color();
		const euler = new THREE.Euler();
		let seed = 0;
		for (const [shape, group] of byShape) {
			const geometry = makeShape[shape]();
			const phases = new Float32Array(group.length);
			const mesh = new THREE.InstancedMesh(geometry, material, group.length);
			group.forEach((n, i) => {
				mesh.setColorAt(i, color.set(n.color));
				phases[i] = hash(seed);
				// A fixed random tilt per crystal, so facets don't all line up.
				this.tilts.push(
					new THREE.Quaternion().setFromEuler(
						euler.set(hash(seed + 0.3) * 6.28, hash(seed + 0.7) * 6.28, 0),
					),
				);
				seed++;
			});
			geometry.setAttribute(
				"aPhase",
				new THREE.InstancedBufferAttribute(phases, 1),
			);
			// Positions change while the layout settles and the graph always fills
			// the view; skip the (stale) bounding-sphere test.
			mesh.frustumCulled = false;
			this.buckets.push({ mesh, nodes: group });
			this.object.add(mesh);
		}
	}

	private buildLinks() {
		const count = this.links.length;
		const positions = new Float32Array(count * 6);
		const t = new Float32Array(count * 2);
		const flow = new Float32Array(count * 6);
		const colors = new Float32Array(count * 6);
		const color = new THREE.Color();
		this.links.forEach((l, i) => {
			t[i * 2 + 1] = 1;
			color.set(l.color);
			for (let v = 0; v < 2; v++) {
				flow.set(
					[l.speed * PULSE_SPEED, hash(i + 1000), l.particles],
					i * 6 + v * 3,
				);
				color.toArray(colors, i * 6 + v * 3);
			}
		});
		const geometry = this.lineGeometry;
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("aT", new THREE.BufferAttribute(t, 1));
		geometry.setAttribute("aFlow", new THREE.BufferAttribute(flow, 3));
		geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

		const lines = new THREE.LineSegments(
			geometry,
			new THREE.ShaderMaterial({
				vertexShader: LINK_VERTEX,
				fragmentShader: LINK_FRAGMENT,
				uniforms: {
					uTime: this.time,
					uDepth: this.depth,
					uTint: { value: new THREE.Color(LINK_TINT) },
					uBase: { value: LINK_BASE },
					uTrail: { value: PULSE_TRAIL },
				},
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		);
		lines.frustumCulled = false;
		this.object.add(lines);
		return positions;
	}

	private buildPulses() {
		const flow: number[] = [];
		const colors: number[] = [];
		const color = new THREE.Color();
		this.links.forEach((l, i) => {
			// Same speed and spacing as the link's trails, so heads lead them.
			for (let k = 0; k < l.particles; k++) {
				this.pulseLinks.push(i);
				flow.push(l.speed * PULSE_SPEED, hash(i + 1000) + k / l.particles);
				color.set(l.color).toArray(colors, colors.length);
			}
		});
		const count = this.pulseLinks.length;
		const start = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
		const end = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
		const geometry = this.pulseGeometry;
		geometry.setAttribute("position", start);
		geometry.setAttribute("aEnd", end);
		geometry.setAttribute(
			"aFlow",
			new THREE.BufferAttribute(new Float32Array(flow), 2),
		);
		geometry.setAttribute(
			"aColor",
			new THREE.BufferAttribute(new Float32Array(colors), 3),
		);

		const points = new THREE.Points(
			geometry,
			new THREE.ShaderMaterial({
				vertexShader: PULSE_VERTEX,
				fragmentShader: PULSE_FRAGMENT,
				uniforms: {
					uTime: this.time,
					uDepth: this.depth,
					uSize: { value: PULSE_SIZE },
					uHeight: this.height,
				},
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		);
		points.frustumCulled = false;
		this.object.add(points);
		return [start, end] as const;
	}

	/** Copies simulated positions into the instance, line and pulse buffers. */
	private sync() {
		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();
		const scale = new THREE.Vector3();
		let seed = 0;
		for (const { mesh, nodes } of this.buckets) {
			nodes.forEach((n, i) => {
				position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
				scale.setScalar(n.val);
				mesh.setMatrixAt(
					i,
					matrix.compose(position, this.tilts[seed++], scale),
				);
			});
			mesh.instanceMatrix.needsUpdate = true;
		}

		// d3's link force has replaced each link's ids with its node objects.
		const at = (n: string | Node, i: number, out: Float32Array) => {
			if (typeof n === "string") return;
			out[i] = n.x ?? 0;
			out[i + 1] = n.y ?? 0;
			out[i + 2] = n.z ?? 0;
		};
		const p = this.linePositions;
		this.links.forEach((l, i) => {
			at(l.source, i * 6, p);
			at(l.target, i * 6 + 3, p);
		});
		this.lineGeometry.attributes.position.needsUpdate = true;

		const { pulseStart: start, pulseEnd: end } = this;
		this.pulseLinks.forEach((li, j) => {
			start.setXYZ(j, p[li * 6], p[li * 6 + 1], p[li * 6 + 2]);
			end.setXYZ(j, p[li * 6 + 3], p[li * 6 + 4], p[li * 6 + 5]);
		});
		start.needsUpdate = true;
		end.needsUpdate = true;
	}
}
