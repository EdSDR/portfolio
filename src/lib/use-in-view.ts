import { useEffect, useRef, useState } from "react";

/**
 * Discrete visibility state for a card, driven only by IntersectionObserver
 * (never by scroll events):
 * - `far`     — off-screen and not close; scene should unmount.
 * - `near`    — approaching; scene mounts but stays paused + prewarms.
 * - `visible` — on-screen; scene animates.
 */
export type InViewState = "far" | "near" | "visible";

export function useInView<T extends HTMLElement>(nearMargin = "150% 0px") {
	const ref = useRef<T>(null);
	const [state, setState] = useState<InViewState>("far");

	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === "undefined") return;

		let near = false;
		let visible = false;
		const apply = () => setState(visible ? "visible" : near ? "near" : "far");

		const nearObs = new IntersectionObserver(
			([entry]) => {
				near = entry.isIntersecting;
				apply();
			},
			{ rootMargin: nearMargin },
		);
		const visibleObs = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				apply();
			},
			{ threshold: 0.01 },
		);

		nearObs.observe(el);
		visibleObs.observe(el);
		return () => {
			nearObs.disconnect();
			visibleObs.disconnect();
		};
	}, [nearMargin]);

	return [ref, state] as const;
}
