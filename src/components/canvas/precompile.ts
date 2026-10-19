import * as THREE from "three";

/**
 * Shader compiles are what froze the page on a first visit. A program links in
 * the GPU process, and the first draw that uses it waits for the link on the
 * main thread (three reads its uniforms). On a cold shader cache that took
 * 0.1–1.9 s per scene. Chrome's GPU process also draws the page, so nothing on
 * screen moved during it, compositor animations included. `compileAsync`
 * alone didn't help: it only knows the materials in the scene graph, under the
 * screen's render state. It misses composer passes, shadow maps, transmission,
 * custom passes and PMREM, and compiles scene materials that a composer draws
 * into a render target under the wrong key (output color space, tone mapping),
 * so those were compiled twice.
 *
 * `precompile` runs `draw` (a frame, a PMREM bake) with every draw call stubbed
 * out, creating the program each draw would use under that draw's exact state
 * (render target, scene, material state), then waits for the links without
 * blocking (KHR_parallel_shader_compile). The real draw that follows reuses
 * the linked programs.
 */

interface Draw {
	scene: THREE.Object3D;
	camera: THREE.Camera;
	material: THREE.Material;
	object: THREE.Object3D;
}

/** three's WebGLProgram; `isReady` polls COMPLETION_STATUS_KHR (no stall). */
type Program = THREE.WebGLProgram & { isReady(): boolean };

export async function precompile(
	gl: THREE.WebGLRenderer,
	draw: () => void,
): Promise<void> {
	const before = new Set(gl.info.programs);
	record(gl, draw);
	// Every program created on the way, not each material's last one: a
	// material can need several (a transparent double-sided one draws twice).
	let pending = (gl.info.programs ?? []).filter(
		(program) => !before.has(program),
	) as Program[];
	if (!gl.extensions.has("KHR_parallel_shader_compile")) return;
	const ready = [...pending];
	while (pending.length > 0) {
		pending = pending.filter((program) => !program.isReady());
		if (pending.length > 0) await new Promise((r) => setTimeout(r, 16));
	}
	// Linked isn't the whole cost: on ANGLE/Metal a program's first use still
	// blocks (60–450 ms per scene, on a cold cache, with every program ready).
	// Pay it here, one program per frame, rather than in one block at the
	// first draw. Reading the uniforms is three's first use (it caches them).
	for (const program of ready) {
		await new Promise(requestAnimationFrame);
		program.getUniforms();
		program.getAttributes();
	}
}

/**
 * Draws `draw` for real, but only a few never-seen draw calls per frame (the
 * rest are skipped), repeating until a frame has nothing new. A draw's first
 * time costs the GPU process more than the program link: on Metal it builds
 * the pipeline state, and textures upload. In one frame that was another
 * 100–350 ms during which the page couldn't present. Call while the canvas is
 * still covered (the card's poster), since the partial frames are wrong.
 */
export async function drawInSteps(
	gl: THREE.WebGLRenderer,
	draw: () => void,
	newPerFrame = 2,
): Promise<void> {
	const { renderBufferDirect } = gl;
	const drawn = new Set<string>();
	// Bounded: a frame should run out of new draws within a few dozen frames.
	for (let round = 0; round < MAX_STEPS; round++) {
		let budget = newPerFrame;
		let skipped = false;
		const shadowsNeedUpdate = gl.shadowMap.needsUpdate;
		gl.renderBufferDirect = (
			camera,
			scene,
			geometry,
			material,
			object,
			group,
		) => {
			// No material version: some passes flag needsUpdate every frame.
			const key = drawKey(gl, material, object, false);
			if (!drawn.has(key)) {
				if (budget === 0) {
					skipped = true;
					return;
				}
				budget--;
				drawn.add(key);
			}
			renderBufferDirect.call(
				gl,
				camera,
				scene,
				geometry,
				material,
				object,
				group,
			);
		};
		try {
			draw();
		} finally {
			gl.renderBufferDirect = renderBufferDirect;
			// A one-shot shadow map must still get its complete frame.
			gl.shadowMap.needsUpdate = shadowsNeedUpdate;
		}
		if (!skipped) return;
		await new Promise(requestAnimationFrame);
	}
}

const MAX_STEPS = 60;

/** What makes a draw call's GPU state distinct, for de-duplicating draws. */
function drawKey(
	gl: THREE.WebGLRenderer,
	material: THREE.Material,
	object: THREE.Object3D,
	version = true,
) {
	const target = gl.getRenderTarget() ? 1 : 0;
	return `${material.uuid}:${version ? material.version : ""}:${material.side}:${object.id}:${target}`;
}

/**
 * Runs `draw` with draw calls stubbed out, creating the program each one would
 * use. Programs are created at the draw, under its exact state: materials
 * change between draws of one frame (three's shadow pass reuses one depth
 * material, flipping its side per object; a pass rewrites its defines).
 */
function record(gl: THREE.WebGLRenderer, draw: () => void) {
	const { render, renderBufferDirect } = gl;
	const shadowsNeedUpdate = gl.shadowMap.needsUpdate;
	const seen = new Set<string>();
	const nested: { draw: Draw; target: THREE.WebGLRenderTarget | null }[] = [];
	// The scene of the render() in progress: its lights and fog shape every
	// program in it, including the shadow pass (which passes no scene).
	let current: THREE.Object3D | null = null;
	let depth = 0;
	gl.render = (scene, camera) => {
		const outer = current;
		current = scene;
		depth++;
		try {
			render.call(gl, scene, camera);
		} finally {
			depth--;
			current = outer;
		}
	};
	gl.renderBufferDirect = (camera, scene, _geometry, material, object) => {
		// No scene (the shadow pass and its blur): three draws those as an empty
		// scene, unfogged, lit by the render() in progress.
		const at = scene ?? (current && unfogged(current)) ?? object;
		const key = `${drawKey(gl, material, object)}:${at.id}`;
		if (seen.has(key)) return;
		seen.add(key);
		const call: Draw = { scene: at, camera, material, object };
		// compile() leaves three's current render state set to the scene's
		// top-level one. Inside a top-level render() of that scene it's the same
		// object (and nothing is drawn), but a nested render() has its own: those
		// draws are compiled after the frame, from their last state.
		if (depth === 1 && current) {
			compileDraw(gl, call);
			// A stand-in scene has its own render state: compile() left that one
			// current. An empty compile of the real scene puts its state back.
			if (at !== current) gl.compile(NOTHING, camera, current as THREE.Scene);
		} else nested.push({ draw: call, target: gl.getRenderTarget() });
	};
	try {
		draw();
	} finally {
		gl.render = render;
		gl.renderBufferDirect = renderBufferDirect;
		// A one-shot shadow map (autoUpdate off) still renders in the real frame.
		gl.shadowMap.needsUpdate = shadowsNeedUpdate;
	}
	const previous = gl.getRenderTarget();
	for (const { draw, target } of nested) {
		gl.setRenderTarget(target);
		compileDraw(gl, draw);
	}
	gl.setRenderTarget(previous);
}

const NOTHING = new THREE.Object3D();
const unfoggedScenes = new WeakMap<THREE.Object3D, THREE.Object3D>();

/** `scene` (its lights) as three's empty scene sees it: no fog, environment. */
function unfogged(scene: THREE.Object3D) {
	let view = unfoggedScenes.get(scene);
	if (!view) {
		view = Object.create(scene, {
			fog: { value: null },
			environment: { value: null },
		}) as THREE.Object3D;
		unfoggedScenes.set(scene, view);
	}
	return view;
}

/** Creates (doesn't wait for) the program of one draw. */
function compileDraw(gl: THREE.WebGLRenderer, draw: Draw) {
	// compile() walks a subtree and uses each object's own material. A stand-in
	// keeps everything the program depends on (geometry attributes, instancing,
	// skinning) but has this draw's material (a shadow pass draws the object
	// with a depth material) and no children.
	const stand = Object.create(draw.object, {
		material: { value: draw.material },
		children: { value: [] },
	}) as THREE.Object3D;
	gl.compile(stand, draw.camera, draw.scene as THREE.Scene);
}

/**
 * Work a scene must finish before its first frame is compiled, e.g. an
 * environment map: programs depend on it. Register it from a layout effect;
 * the canvas' prewarm (a passive effect of the same commit) waits for it.
 */
const setups = new WeakMap<THREE.WebGLRenderer, Set<Promise<unknown>>>();

export function beforeFirstFrame(
	gl: THREE.WebGLRenderer,
	task: Promise<unknown>,
): void {
	const pending = setups.get(gl) ?? new Set();
	setups.set(gl, pending);
	pending.add(task);
}

export async function setupsSettled(gl: THREE.WebGLRenderer): Promise<void> {
	await Promise.allSettled(setups.get(gl) ?? []);
}

/**
 * Bakes `scene` into a prefiltered (PMREM) environment map, with its shaders
 * linked off the main thread first. Use with `beforeFirstFrame`.
 */
export async function prefilteredEnvironment(
	gl: THREE.WebGLRenderer,
	scene: THREE.Scene,
	sigma: number,
): Promise<THREE.WebGLRenderTarget> {
	const pmrem = new THREE.PMREMGenerator(gl);
	try {
		// Same generator for both bakes: its blur materials (and so their
		// programs) must outlive the dry run.
		await precompile(gl, () => pmrem.fromScene(scene, sigma).dispose());
		return pmrem.fromScene(scene, sigma);
	} finally {
		pmrem.dispose();
	}
}
