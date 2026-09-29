import * as THREE from "three";

/**
 * The storm's swell and wind. `swellHeight` is a few long directional waves;
 * `SwellBody` samples it across a hull to rock the floating island.
 */

/** Wind the rain, embers and chop share (scene units per second). */
export const WIND = new THREE.Vector3(-7, -25, -3);

const G = 19.6; // gravity in scene units (1 unit ≈ half a metre)
const CALM = 0.6; // slows the swell to a heavy, readable roll

const WAVES = [
	{ dir: [1, 0.35], length: 48, amp: 0.55 },
	{ dir: [-0.45, 1], length: 31, amp: 0.35 },
	{ dir: [0.7, -0.7], length: 22, amp: 0.22 },
].map(({ dir, length, amp }) => {
	const d = new THREE.Vector2(dir[0], dir[1]).normalize();
	const k = (Math.PI * 2) / length;
	return { d, k, omega: Math.sqrt(G * k) * CALM, amp };
});

/** Swell height above the water's rest level at (x, z), time t (model space). */
export function swellHeight(x: number, z: number, t: number) {
	let h = 0;
	for (const w of WAVES)
		h += w.amp * Math.sin(w.k * (w.d.x * x + w.d.y * z) - w.omega * t);
	return h;
}

/**
 * Rides the swell: heave is the mean height under the hull, pitch and roll
 * the slope across its length and beam. A long hull averages the waves, so it
 * moves slowly and heavily; a small boat bobs. Smoothed and clamped.
 */
export class SwellBody {
	private time = 0;
	private readonly rotation = new THREE.Euler();
	constructor(
		private readonly x: number,
		private readonly z: number,
		private readonly length: number,
		private readonly beam: number,
		private readonly maxTilt: number,
		private readonly heaveScale = 1,
	) {}

	update(object: THREE.Object3D, delta: number) {
		this.time += delta;
		const t = this.time;
		const { x, z } = this;
		const L = this.length;
		const W = this.beam;
		const fore = swellHeight(x, z - L / 2, t);
		const aft = swellHeight(x, z + L / 2, t);
		const port = swellHeight(x - W / 2, z, t);
		const star = swellHeight(x + W / 2, z, t);
		const heave = ((fore + aft + port + star) / 4) * this.heaveScale;
		const clamp = (v: number) =>
			Math.max(-this.maxTilt, Math.min(this.maxTilt, v));
		const pitch = clamp(Math.atan2(fore - aft, L));
		// A slow gust roll on top, so the rhythm never quite repeats.
		const roll = clamp(Math.atan2(port - star, W) + 0.01 * Math.sin(t * 0.23));
		const k = 1 - Math.exp(-3 * delta);
		object.position.y += (heave - object.position.y) * k;
		this.rotation.set(
			object.rotation.x + (pitch - object.rotation.x) * k,
			object.rotation.y,
			object.rotation.z + (roll - object.rotation.z) * k,
		);
		object.rotation.copy(this.rotation);
	}
}
