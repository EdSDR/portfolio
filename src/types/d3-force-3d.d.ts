// d3-force-3d ships no types. This covers only what the Torus scene uses; the
// API mirrors d3-force (https://d3js.org/d3-force) with an optional z axis.
declare module "d3-force-3d" {
	export interface SimNode {
		index?: number;
		x?: number;
		y?: number;
		z?: number;
		vx?: number;
		vy?: number;
		vz?: number;
		fx?: number | null;
		fy?: number | null;
		fz?: number | null;
	}

	export interface SimLink<N extends SimNode> {
		source: string | N;
		target: string | N;
	}

	export interface Simulation<N extends SimNode> {
		tick(iterations?: number): this;
		stop(): this;
		alpha(): number;
		alpha(alpha: number): this;
		alphaDecay(decay: number): this;
		velocityDecay(decay: number): this;
		force(name: string, force: object | null): this;
		nodes(): N[];
	}

	export interface LinkForce<N extends SimNode, L extends SimLink<N>> {
		id(id: (node: N) => string): this;
		distance(distance: number): this;
		links(): L[];
	}

	export interface StrengthForce {
		strength(strength: number): this;
	}

	export function forceSimulation<N extends SimNode>(
		nodes: N[],
		numDimensions?: 1 | 2 | 3,
	): Simulation<N>;
	export function forceLink<N extends SimNode, L extends SimLink<N>>(
		links: L[],
	): LinkForce<N, L>;
	export function forceManyBody(): StrengthForce;
	export function forceCenter(
		x?: number,
		y?: number,
		z?: number,
	): StrengthForce;
}
