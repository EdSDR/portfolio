import { flyUpStyle } from "@/lib/fly-in";

/**
 * Shown in place of a view when a route fails (and as the router's default
 * error component). The usual cause is a chunk that no longer exists after a
 * deploy, which a reload fixes.
 */
export function ErrorView() {
	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
			<h2
				style={flyUpStyle({ i: 0 })}
				className="fly-up text-balance font-semibold text-2xl"
			>
				Something went wrong
			</h2>
			<p
				style={flyUpStyle({ i: 1 })}
				className="fly-up text-muted-foreground text-sm"
			>
				The site may have just been updated. Reloading usually fixes it.
			</p>
			<button
				type="button"
				onClick={() => window.location.reload()}
				style={flyUpStyle({ i: 2 })}
				className="fly-up mt-3 inline-flex h-9 items-center rounded-lg bg-foreground px-4 font-medium text-background text-sm transition-transform active:scale-[0.97]"
			>
				Reload
			</button>
		</div>
	);
}
