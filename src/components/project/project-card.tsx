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
	scenes,
} from "@/components/canvas/scenes/registry";
import type { Project } from "@/content";
import { cn } from "@/lib/cn";
import { FLY_HIDDEN, flyIn } from "@/lib/fly-in";
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

	// Staggered fly-in (same as the gallery tiles), interleaved with the sidebar
	// cascade. Decided at mount only: `index` changes when a card opens (the list
	// filters to it), which must not replay the entrance.
	const entering = useRef(enter).current;
	const enterDelay = useRef(entering ? 0.25 + index * 0.12 : 0).current;
	const articleRef = useRef<HTMLElement>(null);
	useLayoutEffect(() => {
		const el = articleRef.current;
		if (!entering || !el) return;
		const controls = flyIn(el, {
			delay: enterDelay,
			reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		});
		return () => controls.stop();
	}, [entering, enterDelay]);
	const sceneBg = scenes[project.slug]?.background ?? DEFAULT_SCENE_BG;

	// Opening: the click scrolled to the top and held the page visually in place
	// (see holdScrollForOpen). Release it at commit — before Motion measures the
	// new layout and before paint — so the expand starts from the on-screen spot.
	const wasActive = useRef(active);
	useLayoutEffect(() => {
		if (active && !wasActive.current) releaseScrollHold();
		wasActive.current = active;
	}, [active]);

	// Hold scene start-up (chunk parse, context, shader compile) until this card
	// has landed, so it doesn't jank the fly-in; the poster covers the gap.
	const [entranceDone, setEntranceDone] = useState(!entering);
	useEffect(() => {
		if (!entering) return;
		const t = setTimeout(
			() => setEntranceDone(true),
			(enterDelay + 0.8) * 1000,
		);
		return () => clearTimeout(t);
	}, [entering, enterDelay]);

	// Live 3D on desktop pointers while near/visible, or whenever a card is
	// opened. Mobile / reduced-motion stay on the poster.
	const live =
		mounted &&
		!reduced &&
		project.slug in scenes &&
		(active || (fine && entranceDone && state !== "far"));
	const paused = !active && state !== "visible";

	// The poster fades only after the scene has drawn, so there's never a blank frame.
	const [ready, setReady] = useState(false);
	const markReady = useCallback(() => setReady(true), []);
	useEffect(() => {
		if (!live) setReady(false);
	}, [live]);

	return (
		<motion.article
			ref={articleRef}
			layout
			initial={entering ? FLY_HIDDEN : false}
			transition={{ layout: { type: "spring", stiffness: 220, damping: 30 } }}
			className="relative w-full"
		>
			{/* borderRadius lives in `style` so Motion corrects it during layout
			    animations (a class radius would stretch with the scale transform). */}
			<motion.div
				layout
				ref={ref}
				data-scene-media
				data-scene-ready={ready || undefined}
				style={{ borderRadius: 16 }}
				className={cn(
					"relative w-full overflow-hidden border border-border",
					active ? "aspect-video" : "aspect-16/10",
				)}
			>
				{live && (
					<Suspense fallback={null}>
						<SceneCanvas
							slug={project.slug}
							paused={paused}
							onReady={markReady}
						/>
					</Suspense>
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
					transition={{ duration: 0.6, ease: "easeOut" }}
				>
					<img
						src={posterUrl(project.slug)}
						alt=""
						decoding="async"
						loading={index < 2 ? "eager" : "lazy"}
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
