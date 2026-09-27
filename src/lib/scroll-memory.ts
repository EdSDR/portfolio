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

/**
 * Opening a card scrolls the page to the top. Motion measures layout in page
 * coordinates, so if that scroll happens after its "before" snapshot the card
 * starts its expand `scrollY` px below where the user saw it (it always "came
 * from below"). So on click we scroll to the top *first* and hold each page
 * column visually in place with a CSS `translate` (Motion only owns
 * `transform`), all before the next paint. Motion's snapshot then sees the card
 * where it is on screen; the card releases the hold when it commits as the open
 * route, before Motion measures the new layout. Columns are marked with
 * `data-scroll-anchor`; a sticky column measures no shift and is left alone.
 */
let held: HTMLElement[] = [];
let holdTimer: ReturnType<typeof setTimeout> | undefined;

export function holdScrollForOpen(): void {
	const scrolled = window.scrollY;
	if (scrolled === 0) return;
	const cols = [
		...document.querySelectorAll<HTMLElement>("[data-scroll-anchor]"),
	];
	const before = cols.map((el) => el.getBoundingClientRect().top);
	window.scrollTo(0, 0);
	held = cols;
	cols.forEach((el, i) => {
		const shift = before[i] - el.getBoundingClientRect().top;
		if (shift !== 0) el.style.translate = `0 ${shift}px`;
	});
	// Safety net: if the navigation never commits, put the page back as it was.
	clearTimeout(holdTimer);
	holdTimer = setTimeout(() => {
		if (!held.length) return;
		releaseScrollHold();
		window.scrollTo(0, scrolled);
	}, 3000);
}

export function releaseScrollHold(): void {
	clearTimeout(holdTimer);
	for (const el of held) el.style.translate = "";
	held = [];
}
