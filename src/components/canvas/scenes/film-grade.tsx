import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { fullScreenTriangle } from "./full-screen-triangle";

// A full-screen triangle, drawn last over the finished frame: it multiplies
// the frame by a vignette and a moving film grain. Multiply can only darken,
// so the grain lives in the lit areas and blacks stay black.
const VERTEX = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = position.xy * 0.5 + 0.5;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`;

const FRAGMENT = /* glsl */ `
	uniform float uTime;
	uniform float uVignette;
	uniform float uGrain;
	uniform vec2 uAspect;
	varying vec2 vUv;

	float hash(vec2 p) {
		return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
	}

	void main() {
		vec2 c = (vUv - 0.5) * uAspect;
		float vignette = 1.0 - uVignette * smoothstep(0.35, 1.0, length(c) * 1.25);
		float grain = 1.0 - uGrain * hash(gl_FragCoord.xy + fract(uTime * 7.3) * 91.0);
		gl_FragColor = vec4(vec3(vignette * grain), 1.0);
	}
`;

/**
 * Vignette + film grain for scenes that render straight to the canvas (no
 * EffectComposer). Nearly free: one full-screen triangle, no render target.
 */
export function FilmGrade({
	vignette = 0.45,
	grain = 0.08,
}: {
	vignette?: number;
	grain?: number;
}) {
	const mesh = useMemo(() => {
		const geometry = fullScreenTriangle();
		const material = new THREE.ShaderMaterial({
			vertexShader: VERTEX,
			fragmentShader: FRAGMENT,
			uniforms: {
				uTime: { value: 0 },
				uVignette: { value: vignette },
				uGrain: { value: grain },
				uAspect: { value: new THREE.Vector2(1, 1) },
			},
			depthTest: false,
			depthWrite: false,
			transparent: true,
			blending: THREE.CustomBlending,
			blendSrc: THREE.DstColorFactor,
			blendDst: THREE.ZeroFactor,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		mesh.renderOrder = 1000;
		return mesh;
	}, [vignette, grain]);

	useFrame((state, delta) => {
		const u = mesh.material.uniforms;
		u.uTime.value += delta;
		const { width, height } = state.size;
		u.uAspect.value.set(
			width / Math.max(width, height),
			height / Math.max(width, height),
		);
	});

	return <primitive object={mesh} />;
}
