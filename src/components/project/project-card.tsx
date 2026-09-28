import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
	lazy,
	type MouseEvent,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	DEFAULT_SCENE_BG,
	posterUrl,
	preloadScene,
	scenes,
} from "@/components/canvas/scenes/registry";
import { ErrorBoundary } from "@/components/error-boundary";
import type { Project } from "@/content";
import { cn } from "@/lib/cn";
import { flyUpStyle } from "@/lib/fly-in";
import {
	holdScrollForOpen,
	releaseScrollHold,
	rememberHomeScroll,
} from "@/lib/scroll-memory";
import { usePointerFine, usePrefersReducedMotion } from "@/lib/use-device";
import { useInView } from "@/lib/use-in-view";
import { useMounted } from "@/lib/use-mounted";
import { ProjectDetail } from "./project-detail";

// Lazy so three/R3F stay out of the entry bundle (phones may never load them).
const SceneCanvas = lazy(() => import("@/components/canvas/scene-canvas"));

/**
 * One project card. Its media box shows a poster (a pre-rendered still) and,
 * when live, the card's own <SceneCanvas> underneath, revealed by fading the
 * poster once the scene has drawn its first frame. The card grows into its
 * expanded (route) state with a Motion `layout` animation.
 */
/** Plain left clicks navigate in place; modified ones open a new tab. */
function openCard(e: MouseEvent<HTMLAnchorElement>) {
	if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
		return;
	rememberHomeScroll();
	holdScrollForOpen();
}

export function ProjectCard({
	project,
	active,
	index,
	enter,
}: {
	project: Project;
	active: boolean;
	index: number;
	/** Fly in on mount (page load / tab switch), vs. just appear (after a close). */
	enter: boolean;
}) {
	const [ref, state] = useInView<HTMLDivElement>();
	const mounted = useMounted();
	const fine = usePointerFine();
	const reduced = usePrefersReducedMotion();

	// Staggered rise + blur-in, interleaved with the sidebar cascade. CSS
	// (`.fly-up`), so server-rendered cards animate from first paint instead of
	// waiting for hydration (the first poster is the page's LCP), and cards
	// mounted later (tab switch) animate on insertion. Decided at mount only:
	// `index` changes when a card opens (the list filters to it), which must not
	// replay the entrance; cards re-mounted after a close just appear.
	const entrance = useRef(
		enter
			? flyUpStyle({
					i: index,
					start: 0.25,
					step: 0.12,
					distance: "75vh",
					blur: 10,
				})
			: undefined,
	).current;
	const sceneBg = scenes[project.slug]?.background ?? DEFAULT_SCENE_BG;

	// Opening: the click scrolled to the top and held the page visually in place
	// (see holdScrollForOpen). Release it at commit — before Motion measures the
	// new layout and before paint — so the expand starts from the on-screen spot.
	const wasActive = useRef(active);
	useLayoutEffect(() => {
		if (active && !wasActive.current) releaseScrollHold();
		wasActive.current = active;
	}, [active]);

	// Live 3D on desktop pointers while near/visible, or whenever a card is
	// opened. Mobile / reduced-motion stay on the poster. No waiting for the
	// fly-in: it runs on the compositor, so the scene starts up underneath the
	// poster while the card is still flying, and the poster fades as soon as the
	// first frame is drawn.
	const wantsScene =
		mounted && !reduced && project.slug in scenes && (active || fine);
	const live = wantsScene && (active || state !== "far");

	// Fetch + evaluate the 3D code as soon as it'll be wanted, in parallel with
	// the fly-in and the IntersectionObserver's first report.
	useEffect(() => {
		if (wantsScene) preloadScene(project.slug);
	}, [wantsScene, project.slug]);
	const paused = !active && state !== "visible";

	// The poster fades only after the scene has drawn, so there's never a blank frame.
	const [ready, setReady] = useState(false);
	const markReady = useCallback(() => setReady(true), []);
	// A scene that fails after its first frame hands the card back to its poster.
	const markFailed = useCallback(() => setReady(false), []);
	useEffect(() => {
		if (!live) setReady(false);
	}, [live]);

	return (
		<motion.article
			layout
			// Only open/close changes the card's layout; without this, Motion
			// re-measures on every re-render (visibility, pause, ready changes).
			layoutDependency={active}
			style={entrance}
			transition={{ layout: { type: "spring", stiffness: 220, damping: 30 } }}
			className={cn("relative w-full", entrance && "fly-up")}
		>
			{/* borderRadius lives in `style` so Motion corrects it during layout
			    animations (a class radius would stretch with the scale transform). */}
			<motion.div
				layout
				layoutDependency={active}
				ref={ref}
				data-scene-media
				data-scene-ready={ready || undefined}
				style={{ borderRadius: 16 }}
				className={cn(
					"relative w-full overflow-hidden border border-border",
					active ? "aspect-video" : "aspect-16/10",
				)}
			>
				{/* A scene that can't start (no WebGL, missing chunk or asset) just
				    leaves the poster in place instead of taking the page down. */}
				{live && (
					<ErrorBoundary fallback={null} onError={markFailed}>
						<Suspense fallback={null}>
							<SceneCanvas
								slug={project.slug}
								paused={paused}
								onReady={markReady}
							/>
						</Suspense>
					</ErrorBoundary>
				)}

				{/* Poster over the canvas in the scene's own background color. Stays
				    for mobile / reduced-motion; on desktop it crossfades out once the
				    live scene is ready. */}
				<motion.div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{ background: sceneBg }}
					initial={false}
					animate={{ opacity: live && ready ? 0 : 1 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
				>
					<img
						src={posterUrl(project.slug)}
						alt=""
						decoding="async"
						loading={index < 2 ? "eager" : "lazy"}
						fetchPriority={index === 0 ? "high" : undefined}
						className="size-full object-cover"
						onError={(e) => {
							e.currentTarget.hidden = true;
						}}
					/>
				</motion.div>

				{/* Clickable label, painted above the scene. */}
				<Link
					to="/work/$slug"
					params={{ slug: project.slug }}
					aria-label={`Open ${project.name}`}
					onClick={active ? undefined : openCard}
					// The click already scrolled to the top (holdScrollForOpen).
					resetScroll={false}
					className="absolute inset-0 flex items-end p-4"
				>
					<span
						data-card-label
						className="hidden items-center gap-2 rounded-full bg-black/40 px-3 py-1 font-medium text-white text-xs backdrop-blur lg:inline-flex"
					>
						{project.name}
					</span>
				</Link>
			</motion.div>

			{active && <ProjectDetail project={project} />}
		</motion.article>
	);
}
