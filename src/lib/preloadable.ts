import { type ComponentType, createElement, lazy } from "react";

/**
 * `React.lazy` that stops suspending once its module has loaded. Plain lazy()
 * suspends on its first render even when the module is already here, and a
 * boundary that just showed its fallback reveals the content no sooner than
 * 300 ms later (React's fallback throttle): a preloaded scene lost ~340 ms
 * between its turn in the queue and its canvas existing. `preload` starts the
 * download; once it's done, `Component` renders the module directly.
 */
export function preloadable<P extends object>(
	load: () => Promise<{ default: ComponentType<P> }>,
) {
	let loaded: ComponentType<P> | undefined;
	let pending: Promise<{ default: ComponentType<P> }> | undefined;
	const preload = () => {
		pending ??= load().then((module) => {
			loaded = module.default;
			return module;
		});
		return pending;
	};
	const Lazy = lazy(preload);
	function Preloadable(props: P) {
		return createElement(loaded ?? (Lazy as ComponentType<P>), props);
	}
	return { preload, Component: Preloadable };
}
