import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { flyUpStyle } from "@/lib/fly-in";

// Rises in with the sidebar and cards (CSS, from first paint).
const entrance = flyUpStyle({ start: 0.2, distance: 16, blur: 6 });

const TABS = [
	{ view: "scenes", to: "/", label: "Scenes" },
	{ view: "gallery", to: "/gallery", label: "Gallery" },
] as const;

export type View = (typeof TABS)[number]["view"];

/**
 * Scenes / Gallery switch: a frosted-glass pill pinned while content scrolls
 * under it. Desktop: top-right, within the 1600px page width (at the top of the
 * page it sits 16px inside the first card's corner). Below `lg`: bottom-center,
 * where it's in thumb reach and clear of the sidebar header.
 * The active pill slides between tabs (shared layoutId). Each tab is a route,
 * so views are linkable, prerendered, and the back button switches back.
 */
export function ViewTabs({ view }: { view?: View }) {
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 lg:top-8 lg:bottom-auto">
			<div className="mx-auto flex w-full max-w-[1600px] justify-center lg:justify-end lg:px-8">
				<nav
					aria-label="View"
					style={entrance}
					// Glass: translucent tint + heavy backdrop blur/saturation, a hairline
					// edge, an inner top highlight, and a soft drop shadow. Equal columns so
					// the sliding pill keeps one size.
					className="fly-up pointer-events-auto grid grid-cols-2 rounded-full border border-foreground/10 bg-foreground/[0.06] p-1 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),0_10px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur-xl backdrop-saturate-150"
				>
					{TABS.map((tab) => {
						const active = tab.view === view;
						return (
							<Link
								key={tab.view}
								to={tab.to}
								aria-current={active ? "page" : undefined}
								className={cn(
									"relative flex h-8 items-center justify-center rounded-full px-4 font-medium text-sm outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring/60",
									active
										? "text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{active && (
									<motion.span
										layoutId="view-tab"
										aria-hidden
										// A lighter glass chip with its own top highlight.
										className="absolute inset-0 rounded-full border border-foreground/10 bg-foreground/[0.14] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),0_2px_8px_-2px_rgb(0_0_0/0.4)]"
										transition={{ type: "spring", stiffness: 420, damping: 36 }}
									/>
								)}
								<span className="relative">{tab.label}</span>
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
