import { useEffect, useState } from "react";

/** Matches a media query reactively; SSR-safe (returns `false` until mounted). */
function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia(query);
		setMatches(mql.matches);
		const onChange = () => setMatches(mql.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);
	return matches;
}

/** True on precise-pointer devices (desktop) — where live scenes run in the list. */
export const usePointerFine = () => useMediaQuery("(pointer: fine)");

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** True when the user asked the OS to minimize motion. */
export const usePrefersReducedMotion = () => useMediaQuery(REDUCED_MOTION);

/**
 * The same preference read once, for event handlers and effects that run
 * before the hook's first update (client-only).
 */
export const prefersReducedMotion = () =>
	window.matchMedia(REDUCED_MOTION).matches;
