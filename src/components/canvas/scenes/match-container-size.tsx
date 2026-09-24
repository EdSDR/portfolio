import { useFrame, useThree } from "@react-three/fiber";

/**
 * Keeps a dedicated canvas matched to its container every frame. R3F sizes the
 * canvas from a ResizeObserver, which can miss the container's size change while
 * Motion animates the card's layout (transform-driven) — leaving the canvas at a
 * stale size (and a gap at the card's edge). Polling the host box each frame —
 * the same approach drei's <View> uses — guarantees the canvas fills its card.
 */
export function MatchContainerSize() {
	const gl = useThree((s) => s.gl);
	const setSize = useThree((s) => s.setSize);
	useFrame(() => {
		const host = gl.domElement.parentElement;
		if (!host) return;
		const { clientWidth: w, clientHeight: h } = host;
		if (
			w > 0 &&
			h > 0 &&
			(Math.abs(w - gl.domElement.clientWidth) > 1 ||
				Math.abs(h - gl.domElement.clientHeight) > 1)
		) {
			setSize(w, h);
		}
	});
	return null;
}
