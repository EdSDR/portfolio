import type { Easing } from "motion/react";
import type { CSSProperties } from "react";

/**
 * The site's entrance: elements rise in from just off-screen and blur into
 * focus, staggered. Started by the Gallery masonry (ported from reactbits'
 * GSAP version) and shared by the scene cards, sidebar and tabs.
 *
 * The motion (opacity + translate) runs on the compositor, so the heavy
 * main-thread work of starting WebGL scenes can overlap it without stutter.
 * The blur is a separate animation: blur can't be composited ("may move
 * pixels"), and one non-composited property would pull the whole animation
 * onto the main thread. A main-thread stall then only holds the focus a beat.
 * Keyframes only define the start state and end at the element's own style:
 * nothing lingers (no filter layer over live canvases, no transform).
 */

/** GSAP's `power3.out`. */
export const POWER3_OUT: Easing = [0.215, 0.61, 0.355, 1];
const POWER3_OUT_CSS = "cubic-bezier(0.215, 0.61, 0.355, 1)";

/**
 * Markup attribute that keeps an element hidden until its JS fly-in starts
 * (styles.css), so server-rendered HTML doesn't flash it in place first.
 * `flyIn` removes it once the animation holds the start state.
 */
export const FLY_PENDING = "pending";

/**
 * Style for a CSS fly-up (`.fly-up` in styles.css): position `i` in a sequence
 * starting at `start`s, `step`s apart. Pure CSS, so it plays from first paint,
 * before JS hydrates (and on insertion, for elements mounted later).
 * `distance` is px, or any CSS length; negative drops in from above.
 */
export function flyUpStyle({
	i = 0,
	start = 0,
	step = 0.055,
	distance = 40,
	blur = 8,
}: {
	i?: number;
	start?: number;
	step?: number;
	distance?: number | string;
	blur?: number;
} = {}): CSSProperties {
	return {
		"--fly-delay": `${+(start + i * step).toFixed(3)}s`,
		"--fly-distance": typeof distance === "number" ? `${distance}px` : distance,
		"--fly-blur": `${blur}px`,
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
function flyInOffset(
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
 * Plays the fly-in on `el` with the Web Animations API. The element should
 * carry `data-fly="pending"` until now. With `reduced` it only fades. Cancel
 * the returned handle to undo it (e.g. effect cleanup).
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
): { cancel: () => void } {
	const timing: KeyframeAnimationOptions = {
		duration: (reduced ? 0.4 : duration) * 1000,
		delay: delay * 1000,
		easing: POWER3_OUT_CSS,
		// Holds the start state through the delay; nothing is kept at the end.
		fill: "backwards",
	};
	const animations: Animation[] = [];
	if (reduced) {
		animations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], timing));
	} else {
		const { x, y } = flyInOffset(el.getBoundingClientRect(), from, bounds);
		animations.push(
			el.animate(
				[
					{ opacity: 0, translate: `${x}px ${y}px` },
					{ opacity: 1, translate: "0px 0px" },
				],
				timing,
			),
		);
		if (blur > 0) {
			animations.push(
				el.animate(
					[{ filter: `blur(${blur}px)` }, { filter: "blur(0px)" }],
					timing,
				),
			);
		}
	}
	el.removeAttribute("data-fly");
	return {
		cancel: () => {
			for (const animation of animations) animation.cancel();
		},
	};
}
