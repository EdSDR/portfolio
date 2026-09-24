import { useEffect, useRef, useState } from "react";

/**
 * Discrete visibility state for a card, driven only by IntersectionObserver
 * (never by scroll events):
 * - `far`     — off-screen and not close; scene unmounts (frees its WebGL context).
 * - `near`    — approaching; scene mounts, prewarms, and stays paused.
 * - `visible` — on-screen; scene animates.
 *
 * Hysteresis: a card becomes `near` inside `nearMargin` but only drops back to
 * `far` once it leaves the wider `keepMargin`, so scrolling back and forth around
 * the edge doesn't create and destroy a WebGL context each time.
 */
export type InViewState = "far" | "near" | "visible";

export function useInView<T extends HTMLElement>(
	nearMargin = "150% 0px",
	keepMargin = "300% 0px",
) {
	const ref = useRef<T>(null);
	const [state, setState] = useState<InViewState>("far");

	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === "undefined") return;

		let near = false;
		let kept = false;
		let visible = false;
		const apply = () => {
			if (visible || near) kept = true;
			setState(visible ? "visible" : near || kept ? "near" : "far");
		};

		const observe = (
			options: IntersectionObserverInit,
			set: (hit: boolean) => void,
		) => {
			const obs = new IntersectionObserver(([entry]) => {
				set(entry.isIntersecting);
				apply();
			}, options);
			obs.observe(el);
			return obs;
		};

		const observers = [
			observe({ rootMargin: keepMargin }, (hit) => {
				if (!hit) kept = false;
			}),
			observe({ rootMargin: nearMargin }, (hit) => {
				near = hit;
			}),
			observe({ threshold: 0.01 }, (hit) => {
				visible = hit;
			}),
		];
		return () => {
			for (const obs of observers) obs.disconnect();
		};
	}, [nearMargin, keepMargin]);

	return [ref, state] as const;
}
