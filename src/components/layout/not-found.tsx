import { Link } from "@tanstack/react-router";
import { flyUpStyle } from "@/lib/fly-in";

/** Shown by the shell in place of a view when the URL matches nothing. */
export function NotFound() {
	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
			<p
				style={flyUpStyle({ i: 0 })}
				className="fly-up font-mono text-muted-foreground text-sm"
			>
				404
			</p>
			<h2
				style={flyUpStyle({ i: 1 })}
				className="fly-up text-balance font-semibold text-2xl"
			>
				This page doesn't exist
			</h2>
			<p
				style={flyUpStyle({ i: 2 })}
				className="fly-up text-muted-foreground text-sm"
			>
				The link may be outdated, or the address has a typo.
			</p>
			<Link
				to="/"
				style={flyUpStyle({ i: 3 })}
				className="fly-up mt-3 inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 font-medium text-sm transition-transform hover:bg-muted active:scale-[0.97]"
			>
				Back to the work
			</Link>
		</div>
	);
}
