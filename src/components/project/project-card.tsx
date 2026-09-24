import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
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
import { hasEnteredOnce } from "@/lib/entrance";
import { rememberHomeScroll } from "@/lib/scroll-memory";
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
export function ProjectCard({
	project,
	active,
	index,
}: {
	project: Project;
	active: boolean;
	index: number;
}) {
	const [ref, state] = useInView<HTMLDivElement>();
	const mounted = useMounted();
	const fine = usePointerFine();
	const reduced = usePrefersReducedMotion();

	// Staggered entrance, only on the first page load (cards re-appearing after an
	// open/close snap in instantly). Cards come in after the sidebar cascade.
	const firstLoad = useRef(!hasEnteredOnce()).current;
	const enterDelay = firstLoad ? 0.9 + index * 0.16 : 0;
	const sceneBg = scenes[project.slug]?.background ?? DEFAULT_SCENE_BG;

	// On first load, hold scene start-up (chunk parse, context, shader compile)
	// until this card's entrance has played so it doesn't jank the cascade; the
	// poster covers the gap.
	const [entranceDone, setEntranceDone] = useState(!firstLoad);
	useEffect(() => {
		if (!firstLoad) return;
		const t = setTimeout(
			() => setEntranceDone(true),
			(enterDelay + 0.65) * 1000,
		);
		return () => clearTimeout(t);
	}, [firstLoad, enterDelay]);

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
			layout
			initial={firstLoad ? { opacity: 0, y: 18 } : false}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				layout: { type: "spring", stiffness: 220, damping: 30 },
				opacity: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: enterDelay },
				y: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: enterDelay },
			}}
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
					onClick={active ? undefined : rememberHomeScroll}
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
