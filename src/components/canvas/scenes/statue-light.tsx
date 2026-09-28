import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo } from "react";
import * as THREE from "three";

/**
 * The statue's key light made visible: light scattering in the air (god rays,
 * with her shadow cut out of them) and dust motes that glint only inside the
 * beam. Both read the scene's own spotLight each frame — position, direction,
 * cone, and its (VSM) shadow map — so they always agree with how she's lit, and
 * both fade with the scene's fog.
 */

/** How much light the air scatters toward the camera (the god rays' strength). */
const SCATTER = {
	intensity: 0.018,
	falloff: 0.03,
	steps: 16,
	/** The march runs at 1/downscale of the canvas resolution per axis. */
	downscale: 4,
	color: "#f3eee6",
};
const DUST = { count: 700, size: 2.4, brightness: 1.4 };
/** Box the motes drift in (world units), around the statue and the beam. */
const DUST_BOX = { min: [-5, -3.5, -1.5], max: [5, 4.5, 10] } as const;

/**
 * Spot light at a world position: cone × shadow × distance falloff. The shadow
 * test mirrors three's VSM (mean + std dev of light-space depth; Chebyshev
 * bound with the same light-bleed cut).
 */
const SPOT = /* glsl */ `
	uniform vec3 uLightPos;
	uniform vec3 uLightDir;
	uniform vec2 uCone; // cos(outer), cos(inner)
	uniform sampler2D uShadowMap;
	uniform mat4 uShadowMatrix;
	uniform float uFalloff;

	float spotShadow(vec3 p) {
		vec4 sc = uShadowMatrix * vec4(p, 1.0);
		sc.xyz /= sc.w;
		if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
		vec2 m = texture2D(uShadowMap, sc.xy).rg;
		if (sc.z <= m.x) return 1.0;
		float variance = max(m.y * m.y, 1e-7);
		float d = sc.z - m.x;
		return clamp((variance / (variance + d * d) - 0.3) / 0.65, 0.0, 1.0);
	}

	float spotLight(vec3 p) {
		vec3 toP = p - uLightPos;
		float d2 = dot(toP, toP);
		float cone = smoothstep(uCone.x, uCone.y, dot(toP * inversesqrt(d2), uLightDir));
		if (cone <= 0.0) return 0.0;
		return cone * spotShadow(p) / (1.0 + d2 * uFalloff);
	}
`;

const NOISE = /* glsl */ `
	float hash3(vec3 p) {
		p = fract(p * 0.3183099 + 0.1);
		p *= 17.0;
		return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
	}
	// Value noise: lumpy, slowly drifting density, so the rays read as air.
	float haze(vec3 x) {
		vec3 i = floor(x);
		vec3 f = fract(x);
		f = f * f * (3.0 - 2.0 * f);
		return mix(
			mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
				mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
			mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
				mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
			f.z);
	}
`;

// Single scattering, ray-marched per pixel from the camera to the end of the
// fog. Lit haze is soft, so it's marched at quarter resolution (1/16 of the
// pixels; indistinguishable from half, measured ~0.15ms cheaper) into its own
// target, then composited at full resolution by a full-screen triangle at the
// far plane with the depth test on: it lands only on the air around her (her
// surface keeps its own shading; lit air in front of her would only grey her
// out) and her silhouette stays sharp. The start of each ray is offset per
// pixel (interleaved gradient noise), trading step banding for fine grain the
// film grade then hides.
const SCATTER_VERTEX = /* glsl */ `
	uniform mat4 uProjInv;
	uniform mat4 uCamWorld;
	varying vec3 vDir;

	void main() {
		vec4 view = uProjInv * vec4(position.xy, 1.0, 1.0);
		vDir = mat3(uCamWorld) * (view.xyz / view.w);
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`;

const COMPOSITE_VERTEX = /* glsl */ `
	void main() {
		gl_Position = vec4(position.xy, 1.0, 1.0);
	}
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
	uniform sampler2D uScatter;
	uniform vec2 uResolution;

	void main() {
		gl_FragColor = vec4(texture2D(uScatter, gl_FragCoord.xy / uResolution).rgb, 1.0);
		#include <colorspace_fragment>
	}
`;

const SCATTER_FRAGMENT = /* glsl */ `
	uniform vec2 uFog; // near, far
	uniform vec3 uColor;
	uniform float uIntensity;
	uniform float uTime;
	varying vec3 vDir;
	${SPOT}
	${NOISE}

	bool inCone(vec3 p) {
		vec3 w = p - uLightPos;
		float wa = dot(w, uLightDir);
		return wa > 0.0 && wa * wa >= uCone.x * uCone.x * dot(w, w);
	}

	// The stretch of the ray [0, tMax] inside the light's (forward) cone,
	// solved analytically, so the march spends its steps only where there's
	// light and pixels whose ray misses the cone cost almost nothing.
	vec2 coneSpan(vec3 o, vec3 d, float tMax) {
		vec3 w = o - uLightPos;
		float c2 = uCone.x * uCone.x;
		float da = dot(d, uLightDir);
		float wa = dot(w, uLightDir);
		float A = da * da - c2;
		float B = da * wa - c2 * dot(d, w);
		float C = wa * wa - c2 * dot(w, w);
		float disc = B * B - A * C;
		if (disc < 0.0 || abs(A) < 1e-6) return vec2(0.0, inCone(o) ? tMax : 0.0);
		float s = sqrt(disc);
		float r0 = (-B - s) / A;
		float r1 = (-B + s) / A;
		float lo = min(r0, r1);
		float hi = max(r0, r1);
		vec2 span = vec2(0.0);
		if (A < 0.0) {
			if (inCone(o + d * (lo + hi) * 0.5)) span = vec2(lo, hi);
		} else if (inCone(o + d * (hi + 0.01))) {
			span = vec2(hi, tMax);
		} else if (inCone(o + d * (lo - 0.01))) {
			span = vec2(0.0, lo);
		}
		return clamp(span, 0.0, tMax);
	}

	void main() {
		vec3 dir = normalize(vDir);
		vec2 span = coneSpan(cameraPosition, dir, uFog.y);
		float stepLen = (span.y - span.x) / float(STEPS);
		if (stepLen <= 0.0) discard;
		float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
		float sum = 0.0;
		for (int i = 0; i < STEPS; i++) {
			float t = span.x + (float(i) + jitter) * stepLen;
			vec3 p = cameraPosition + dir * t;
			float light = spotLight(p);
			if (light > 0.0) {
				vec3 q = p * 0.6 + vec3(0.0, uTime * 0.06, uTime * 0.025);
				float n = 0.65 * haze(q) + 0.35 * haze(q * 2.7 + 11.0);
				float air = 0.15 + 2.6 * n * n;
				sum += light * air * (1.0 - smoothstep(uFog.x, uFog.y, t));
			}
		}
		gl_FragColor = vec4(uColor * sum * stepLen * uIntensity, 1.0);
		#include <colorspace_fragment>
	}
`;

type SpotUniforms = ReturnType<typeof makeSpotUniforms>;

function makeSpotUniforms() {
	return {
		uLightPos: new THREE.Uniform(new THREE.Vector3()),
		uLightDir: new THREE.Uniform(new THREE.Vector3(0, 0, -1)),
		uCone: new THREE.Uniform(new THREE.Vector2(1, 1)),
		uShadowMap: new THREE.Uniform<THREE.Texture | null>(null),
		uShadowMatrix: new THREE.Uniform(new THREE.Matrix4()),
		uFalloff: new THREE.Uniform(SCATTER.falloff),
		uTime: new THREE.Uniform(0),
		uFog: new THREE.Uniform(new THREE.Vector2(0, 20)),
	};
}

/** A triangle that covers the whole screen (clip space). */
function fullScreenTriangle() {
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

/** The low-resolution scatter pass and the full-resolution composite. */
function scatterPass(spot: SpotUniforms) {
	const geometry = fullScreenTriangle();
	const march = new THREE.Mesh(
		geometry,
		new THREE.ShaderMaterial({
			vertexShader: SCATTER_VERTEX,
			fragmentShader: SCATTER_FRAGMENT,
			defines: { STEPS: SCATTER.steps },
			uniforms: {
				...spot,
				uProjInv: { value: new THREE.Matrix4() },
				uCamWorld: { value: new THREE.Matrix4() },
				uColor: { value: new THREE.Color(SCATTER.color) },
				uIntensity: { value: SCATTER.intensity },
			},
			depthTest: false,
			depthWrite: false,
		}),
	);
	march.frustumCulled = false;
	const scene = new THREE.Scene();
	scene.add(march);
	const target = new THREE.WebGLRenderTarget(1, 1, {
		type: THREE.HalfFloatType,
		depthBuffer: false,
	});

	const composite = new THREE.Mesh(
		geometry,
		new THREE.ShaderMaterial({
			vertexShader: COMPOSITE_VERTEX,
			fragmentShader: COMPOSITE_FRAGMENT,
			uniforms: {
				uScatter: { value: target.texture },
				uResolution: { value: new THREE.Vector2(1, 1) },
			},
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		}),
	);
	composite.frustumCulled = false;
	// After the clouds and stars (it lights the air they sit in).
	composite.renderOrder = 1;
	return { march, scene, target, composite };
}

const DUST_VERTEX = /* glsl */ `
	#include <fog_pars_vertex>
	${SPOT}
	attribute vec4 aSeed;
	uniform float uTime;
	uniform float uSize;
	uniform float uHeight;
	varying float vLit;

	void main() {
		// Each mote drifts on its own slow loop.
		vec3 p = position + vec3(
			sin(uTime * 0.13 * aSeed.x + aSeed.w * 6.28),
			sin(uTime * 0.09 * aSeed.y + aSeed.w * 3.1) * 0.6,
			cos(uTime * 0.11 * aSeed.z + aSeed.w * 4.7)
		) * 0.35;
		// Motes tumble, so they catch the light unevenly: a slow twinkle.
		float glint = 0.55 + 0.45 * sin(uTime * (0.7 + aSeed.x) + aSeed.w * 12.0);
		vLit = spotLight(p) * glint;
		vec4 mvPosition = viewMatrix * vec4(p, 1.0);
		gl_Position = projectionMatrix * mvPosition;
		gl_PointSize = uSize * (0.6 + aSeed.y) * uHeight / 1000.0 * (8.0 / max(-mvPosition.z, 0.5));
		#include <fog_vertex>
	}
`;

const DUST_FRAGMENT = /* glsl */ `
	#include <fog_pars_fragment>
	uniform float uBrightness;
	varying float vLit;

	void main() {
		float r = length(gl_PointCoord - 0.5) * 2.0;
		float a = (1.0 - smoothstep(0.2, 1.0, r)) * vLit * uBrightness;
		#ifdef USE_FOG
			a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
		#endif
		gl_FragColor = vec4(vec3(a), 1.0);
		#include <colorspace_fragment>
	}
`;

function dustGeometry() {
	const { count } = DUST;
	const positions = new Float32Array(count * 3);
	const seeds = new Float32Array(count * 4);
	// Deterministic scatter, so the scene looks the same on every load.
	let s = 7;
	const rand = () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
	for (let i = 0; i < count; i++) {
		for (let a = 0; a < 3; a++) {
			const lo = DUST_BOX.min[a];
			positions[i * 3 + a] = lo + rand() * (DUST_BOX.max[a] - lo);
		}
		for (let a = 0; a < 4; a++) seeds[i * 4 + a] = rand();
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
	return geometry;
}

const targetPos = new THREE.Vector3();
const bufferSize = new THREE.Vector2();

/**
 * The dust and the scattered light, sharing one set of spot uniforms synced
 * from the light every frame.
 */
export function StatueLight({
	light,
}: {
	light: RefObject<THREE.SpotLight | null>;
}) {
	const { spot, dust, scatter } = useMemo(() => {
		const spot = makeSpotUniforms();
		const material = new THREE.ShaderMaterial({
			vertexShader: DUST_VERTEX,
			fragmentShader: DUST_FRAGMENT,
			uniforms: {
				...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
				...spot,
				uSize: { value: DUST.size },
				uBrightness: { value: DUST.brightness },
				uHeight: { value: 1 },
			},
			fog: true,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});
		const dust = new THREE.Points(dustGeometry(), material);
		// The dust box always overlaps the view.
		dust.frustumCulled = false;
		return { spot, dust, scatter: scatterPass(spot) };
	}, []);

	useFrame((state, delta) => {
		const l = light.current;
		if (!l) return;
		spot.uTime.value += delta;
		l.getWorldPosition(spot.uLightPos.value);
		l.target.getWorldPosition(targetPos);
		spot.uLightDir.value
			.subVectors(targetPos, spot.uLightPos.value)
			.normalize();
		spot.uCone.value.set(
			Math.cos(l.angle),
			Math.cos(l.angle * (1 - l.penumbra)),
		);
		// Written by the renderer's shadow pass; one frame behind, which a slow
		// light doesn't show.
		spot.uShadowMap.value = l.shadow.map?.texture ?? null;
		spot.uShadowMatrix.value.copy(l.shadow.matrix);

		const { camera, scene, gl } = state;
		if (scene.fog instanceof THREE.Fog)
			spot.uFog.value.set(scene.fog.near, scene.fog.far);
		gl.getDrawingBufferSize(bufferSize);
		dust.material.uniforms.uHeight.value = bufferSize.y;

		const { march, target, composite } = scatter;
		march.material.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
		march.material.uniforms.uCamWorld.value.copy(camera.matrixWorld);
		composite.material.uniforms.uResolution.value.copy(bufferSize);
		const w = Math.ceil(bufferSize.x / SCATTER.downscale);
		const h = Math.ceil(bufferSize.y / SCATTER.downscale);
		if (target.width !== w || target.height !== h) target.setSize(w, h);
		const previous = gl.getRenderTarget();
		gl.setRenderTarget(target);
		gl.render(scatter.scene, camera);
		gl.setRenderTarget(previous);
	});

	return (
		<>
			<primitive object={dust} />
			<primitive object={scatter.composite} />
		</>
	);
}
