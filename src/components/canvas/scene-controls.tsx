import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { SceneEntry } from "./scenes/registry";

/** Per-frame scratch (frames run one canvas at a time). */
const current = new THREE.Spherical();
const ORIGIN = new THREE.Vector3();

/**
 * Orbit controls for an open card. Every scene frames its camera on the
 * origin, so the controls orbit that point (no panning: the subject stays in
 * frame). When the card closes, the camera eases back to where the scene put it,
 * so the collapsed card shows the same framing as its poster.
 */
export function SceneControls({
	enabled,
	limits,
	onStart,
}: {
	enabled: boolean;
	limits: SceneEntry["controls"];
	onStart?: () => void;
}) {
	const camera = useThree((s) => s.camera);
	const target = useThree((s) => s.events.connected) as HTMLElement | null;
	// The scene's own framing, read when its camera becomes the default.
	const home = useMemo(
		() => new THREE.Spherical().setFromVector3(camera.position),
		[camera],
	);

	// The open hero fills most of the viewport, so a plain wheel keeps scrolling
	// the page; zooming takes ⌘/Ctrl (which is also what a trackpad pinch sends).
	// Capture on the controls' own element runs before their wheel listener.
	useEffect(() => {
		if (!enabled || !target) return;
		const gate = (e: WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
		};
		target.addEventListener("wheel", gate, { capture: true });
		return () => target.removeEventListener("wheel", gate, { capture: true });
	}, [enabled, target]);

	useFrame((_, delta) => {
		if (enabled) return;
		current.setFromVector3(camera.position);
		// Shortest way round, so a half-turned camera doesn't spin back the long way.
		const dTheta =
			THREE.MathUtils.euclideanModulo(
				home.theta - current.theta + Math.PI,
				Math.PI * 2,
			) - Math.PI;
		if (
			Math.abs(dTheta) < 1e-4 &&
			Math.abs(home.phi - current.phi) < 1e-4 &&
			Math.abs(home.radius - current.radius) < home.radius * 1e-4
		)
			return;
		const t = 1 - Math.exp(-4 * delta);
		current.theta += dTheta * t;
		current.phi += (home.phi - current.phi) * t;
		current.radius += (home.radius - current.radius) * t;
		camera.position.setFromSpherical(current);
		camera.lookAt(ORIGIN);
	});

	if (!enabled) return null;
	return (
		<OrbitControls
			enablePan={false}
			dampingFactor={0.08}
			rotateSpeed={0.6}
			zoomSpeed={0.6}
			onStart={onStart}
			{...limits}
		/>
	);
}
