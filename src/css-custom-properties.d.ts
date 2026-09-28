import "react";

// Lets style objects carry CSS custom properties (e.g. `--fly-delay`).
declare module "react" {
	interface CSSProperties {
		[property: `--${string}`]: string | number | undefined;
	}
}
