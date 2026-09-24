/**
 * Remembers the home scroll position across an open→close cycle. Opening a card
 * collapses the list (page shrinks, scroll clamps to top), which loses the
 * position; we restore it when the card closes so the card appears to collapse
 * back into its spot instead of dumping the user at the top.
 */
let homeScrollY = 0;

export function rememberHomeScroll(): void {
	if (typeof window !== "undefined") homeScrollY = window.scrollY;
}

export function restoreHomeScroll(): void {
	if (typeof window === "undefined") return;
	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	window.scrollTo({ top: homeScrollY, behavior: reduce ? "auto" : "smooth" });
}
