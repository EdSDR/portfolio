/**
 * Deterministic synthetic graph for the Torus force-graph scene. This is a
 * visual stand-in for an on-chain agent network — NOT real chain data. Seeded so
 * the layout is stable across renders.
 */

export type NodeType = "hub" | "root" | "agent" | "signal" | "user" | "perm";

export interface GraphNode {
	id: string;
	type: NodeType;
	color: string;
	/** Sphere radius in graph units. */
	val: number;
	/** Optional fixed position (d3-force) — used to pin the hub at the center. */
	fx?: number;
	fy?: number;
	fz?: number;
}

export interface GraphLink {
	source: string;
	target: string;
	color: string;
	/** Number of directional particles flowing along the link (0 = none). */
	particles: number;
	speed: number;
}

export interface GraphData {
	nodes: GraphNode[];
	links: GraphLink[];
}

const NODE_STYLE: Record<NodeType, { color: string; val: number }> = {
	hub: { color: "#ffffff", val: 22 },
	root: { color: "#63cbff", val: 9 },
	agent: { color: "#1fdb77", val: 6 },
	signal: { color: "#ce5cff", val: 6 },
	user: { color: "#d946ef", val: 8 },
	perm: { color: "#f2b907", val: 5 },
};

// Light link colors so they read on the dark background.
const LINK_COLOR = {
	allocation: "#e2e8f0",
	emission: "#93c5fd",
	signal: "#86efac",
	cross: "#7dd3fc",
};

/** Small, fast, deterministic PRNG (mulberry32). */
function makeRng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function generateGraph(seed = 6767): GraphData {
	const rng = makeRng(seed);
	const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
	const rangeInt = (min: number, max: number) =>
		min + Math.floor(rng() * (max - min + 1));

	const nodes: GraphNode[] = [];
	const links: GraphLink[] = [];
	const node = (id: string, type: NodeType) => {
		nodes.push({ id, type, ...NODE_STYLE[type] });
		return id;
	};
	const link = (
		source: string,
		target: string,
		color: string,
		particles: number,
		speed: number,
	) => links.push({ source, target, color, particles, speed });

	// Central hub → root clusters → agents → sub-agents. A dense-ish network.
	// The hub is pinned at the origin so it stays centered in the view.
	const hub = "hub";
	nodes.push({ id: hub, type: "hub", ...NODE_STYLE.hub, fx: 0, fy: 0, fz: 0 });
	const rootCount = 16;

	for (let r = 0; r < rootCount; r++) {
		const root = node(`root-${r}`, "root");
		link(hub, root, LINK_COLOR.allocation, 2, 0.006);

		const childCount = rangeInt(10, 20);
		for (let c = 0; c < childCount; c++) {
			const type = pick<NodeType>([
				"agent",
				"agent",
				"agent",
				"signal",
				"perm",
				r % 3 === 0 && c === 0 ? "user" : "agent",
			]);
			const child = node(`n-${r}-${c}`, type);
			link(
				root,
				child,
				type === "signal" ? LINK_COLOR.signal : LINK_COLOR.emission,
				rng() > 0.55 ? 1 : 0,
				0.004 + rng() * 0.004,
			);

			// Some agents fan out to a second tier of leaf nodes.
			if ((type === "agent" || type === "user") && rng() > 0.45) {
				const leafCount = rangeInt(2, 5);
				for (let l = 0; l < leafCount; l++) {
					const leafType = pick<NodeType>(["agent", "signal", "perm", "perm"]);
					const leaf = node(`n-${r}-${c}-${l}`, leafType);
					link(
						child,
						leaf,
						leafType === "signal" ? LINK_COLOR.signal : LINK_COLOR.emission,
						rng() > 0.7 ? 1 : 0,
						0.003 + rng() * 0.004,
					);
				}
			}
		}
	}

	// Cross-cluster links to weave the graph together.
	const agents = nodes.filter((n) => n.type === "agent" || n.type === "signal");
	const crossCount = Math.floor(agents.length / 4);
	for (let i = 0; i < crossCount; i++) {
		const a = pick(agents);
		const b = pick(agents);
		if (a.id === b.id) continue;
		link(
			a.id,
			b.id,
			LINK_COLOR.cross,
			rng() > 0.6 ? 1 : 0,
			0.003 + rng() * 0.003,
		);
	}

	return { nodes, links };
}
