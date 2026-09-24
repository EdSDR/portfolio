import type { Variants } from "motion/react";

/** A single item fading up into place. */
export const fadeUp: Variants = {
	hidden: { opacity: 0, y: 10 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
	},
};

/** A container that reveals its children one after another. */
export function staggerContainer(
	staggerChildren = 0.07,
	delayChildren = 0,
): Variants {
	return {
		hidden: {},
		show: { transition: { staggerChildren, delayChildren } },
	};
}
