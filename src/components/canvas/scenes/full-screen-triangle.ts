import * as THREE from "three";

/**
 * One triangle that covers the whole screen, in clip space (its vertex shader
 * writes `position.xy` straight to gl_Position): the cheapest full-screen pass.
 */
export function fullScreenTriangle() {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(
			new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
			3,
		),
	);
	return geometry;
}
