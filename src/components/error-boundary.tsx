import { Component, type ReactNode } from "react";

/** Renders `fallback` instead of a subtree that threw while rendering. */
export class ErrorBoundary extends Component<
	{ fallback: ReactNode; onError?: () => void; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch() {
		this.props.onError?.();
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
