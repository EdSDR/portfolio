import {
	type AnimationPlaybackControls,
	animate,
	type Easing,
	type Variants,
} from "motion/react";

/**
 * The site's entrance: elements rise in from just off-screen and blur into
 * focus, staggered. Started by the Gallery masonry (ported from reactbits'
 * GSAP version) and shared by the scene cards and the sidebar.
 */

/** GSAP's `power3.out`. */
export const POWER3_OUT: Easing = [0.215, 0.61, 0.355, 1];

/** Resting state of an element before its fly-in (use as SSR/initial style). */
export const FLY_HIDDEN = { opacity: 0 } as const;

/**
 * Sequenced blur-rise (the site entrance) for declarative elements: pass the
 * element's position in the sequence as `custom`. A flat sequence, because
 * Motion doesn't carry a parent's stagger into nested containers.
 */
export function flyUpSequence({
	start = 0,
	step = 0.055,
	distance = 40,
	blur = 8,
} = {}): Variants {
	return {
		hidden: { opacity: 0, y: distance, filter: `blur(${blur}px)` },
		show: (i: number) => ({
			opacity: 1,
			y: 0,
			filter: "blur(0px)",
			// A lingering `blur(0px)` still costs a filter layer; drop it at rest.
			transitionEnd: { filter: "none" },
			transition: { duration: 0.8, ease: POWER3_OUT, delay: start + i * step },
		}),
	};
}

export type FlyFrom = "bottom" | "top" | "left" | "right" | "center" | "random";

interface Box {
	top: number;
	left: number;
	width: number;
	height: number;
}

/**
 * Start offset (relative to the element's resting spot) so it enters from just
 * outside the viewport on the given side. Measured at the moment it starts, so
 * elements that appear while scrolled still come from just off-screen; always
 * at least 80px so off-screen elements still visibly move. `center` flies out
 * of the middle of `bounds` (e.g. the grid).
 */
export function flyInOffset(
	rect: Box,
	from: FlyFrom,
	bounds?: Box,
): { x: number; y: number } {
	const dir =
		from === "random"
			? (["top", "bottom", "left", "right"] as const)[
					Math.floor(Math.random() * 4)
				]
			: from;
	switch (dir) {
		case "bottom":
			return { x: 0, y: Math.max(window.innerHeight + 200 - rect.top, 80) };
		case "top":
			return { x: 0, y: Math.min(-200 - (rect.top + rect.height), -80) };
		case "left":
			return { x: Math.min(-200 - (rect.left + rect.width), -80), y: 0 };
		case "right":
			return { x: Math.max(window.innerWidth + 200 - rect.left, 80), y: 0 };
		case "center": {
			const b = bounds ?? {
				top: 0,
				left: 0,
				width: window.innerWidth,
				height: window.innerHeight,
			};
			return {
				x: b.left + b.width / 2 - (rect.left + rect.width / 2),
				y: b.top + b.height / 2 - (rect.top + rect.height / 2),
			};
		}
	}
}

/**
 * Plays the fly-in on `el` (which should start at FLY_HIDDEN). With `reduced`
 * it only fades. Clears the filter afterwards so no blur layer lingers (it
 * would sit above live WebGL canvases).
 */
export function flyIn(
	el: HTMLElement,
	{
		from = "bottom",
		delay = 0,
		duration = 0.8,
		blur = 10,
		reduced = false,
		bounds,
	}: {
		from?: FlyFrom;
		delay?: number;
		duration?: number;
		blur?: number;
		reduced?: boolean;
		bounds?: Box;
	} = {},
): AnimationPlaybackControls {
	if (reduced) {
		return animate(el, { opacity: [0, 1] }, { duration: 0.4, delay });
	}
	const { x, y } = flyInOffset(restingRect(el), from, bounds);
	const controls = animate(
		el,
		{
			opacity: [0, 1],
			x: [x, 0],
			y: [y, 0],
			...(blur > 0 && { filter: [`blur(${blur}px)`, "blur(0px)"] }),
		},
		{ duration, ease: POWER3_OUT, delay },
	);
	// Set through Motion so a motion component doesn't re-apply its blur value.
	if (blur > 0)
		controls.then(() => animate(el, { filter: "none" }, { duration: 0 }));
	return controls;
}

/**
 * The element's box without its current translation, i.e. where it rests.
 * (A restarted fly-in, e.g. React StrictMode re-running effects, would
 * otherwise measure it already shifted to its start offset.)
 */
function restingRect(el: HTMLElement): Box {
	const r = el.getBoundingClientRect();
	const t = getComputedStyle(el).transform;
	if (!t || t === "none") return r;
	const m = new DOMMatrixReadOnly(t);
	return {
		top: r.top - m.m42,
		left: r.left - m.m41,
		width: r.width,
		height: r.height,
	};
}
