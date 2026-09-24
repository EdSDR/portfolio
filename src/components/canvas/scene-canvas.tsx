import { View } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";

/**
 * The single, app-wide <Canvas>. Fixed to the viewport, non-interactive, and
 * behind the DOM. Each card's <View> scissors its scene to the card's rect and
 * the rest stays transparent, so the scenes show through the (transparent) card
 * windows while DOM overlays (labels) paint on top. One WebGL context total.
 */
export function SceneCanvas({
	eventSource,
}: {
	eventSource: RefObject<HTMLElement | null>;
}) {
	return (
		<Canvas
			eventSource={eventSource as RefObject<HTMLElement>}
			eventPrefix="client"
			dpr={[1, 1.5]}
			gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
			style={{
				position: "fixed",
				inset: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
				zIndex: 0,
			}}
		>
			<View.Port />
		</Canvas>
	);
}
