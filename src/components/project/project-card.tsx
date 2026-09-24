import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CardView } from "@/components/canvas/card-view";
import {
	DEFAULT_SCENE_BG,
	dedicatedCanvases,
	sceneBackground,
} from "@/components/canvas/scenes/dedicated";
import type { Project } from "@/content";
import { cn } from "@/lib/cn";
import { hasEnteredOnce } from "@/lib/entrance";
import { rememberHomeScroll } from "@/lib/scroll-memory";
import { usePointerFine, usePrefersReducedMotion } from "@/lib/use-device";
import { useInView } from "@/lib/use-in-view";
import { useMounted } from "@/lib/use-mounted";
import { ProjectDetail } from "./project-detail";

/**
 * One project card. The media hosts a drei <View> (in CardView) that renders its
 * own element filling this box and tunnels the scene into the shell canvas behind
 * it. drei re-measures that element every frame, so the scene follows the Motion
 * `layout` animation as the card grows into its expanded (route) state.
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
	// Dedicated-canvas scenes render in their own DOM canvas, so they fade with the
	// card and don't need the entrance hold. The cover matches the scene bg.
	const isDedicated = project.slug in dedicatedCanvases;
	const sceneBg = sceneBackground[project.slug] ?? DEFAULT_SCENE_BG;

	// Shared-canvas scenes (drei <View>) render on the fixed canvas and can't fade
	// with the DOM card, so on first load they'd pop in and track the sliding rect
	// before the card settles. Hold them until the entrance finishes; the poster
	// (DOM, fades with the card) covers the gap. Torus uses its own canvas that
	// fades with the card, so it doesn't wait.
	const [entranceDone, setEntranceDone] = useState(!firstLoad);
	useEffect(() => {
		if (!firstLoad) return;
		const t = setTimeout(
			() => setEntranceDone(true),
			(enterDelay + 0.65) * 1000,
		);
		return () => clearTimeout(t);
	}, [firstLoad, enterDelay]);

	// Mount the <View> only once the media has a real height, so drei's one-time
	// portal sizing is correct.
	const [sized, setSized] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || sized) return;
		const ro = new ResizeObserver((entries) => {
			if ((entries[0]?.contentRect.height ?? 0) > 1) setSized(true);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref, sized]);

	// Live 3D on desktop pointers, or whenever a card is opened. Mobile /
	// reduced-motion stay on the poster. Shared-canvas scenes also wait for the
	// entrance to finish (torus/active are exempt).
	const live =
		sized &&
		mounted &&
		!reduced &&
		(active || fine) &&
		(isDedicated || active || entranceDone);
	const viewState = active ? "visible" : state;

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
			{/* Rectangular clip. The scene lives on the shared canvas behind this
			    window; the mask overlay below rounds the corners by painting the
			    notches with the page background. */}
			<motion.div
				layout
				ref={ref}
				className={cn(
					"relative w-full overflow-hidden",
					active ? "aspect-video" : "aspect-16/10",
				)}
			>
				{/* Solid cover in the scene's own background color. Held opaque until
				    the scene is live, then it crossfades out to reveal the scene — no
				    gradient→black→scene flash, and it's the fallback on mobile /
				    reduced-motion (a plain dark card). */}
				<motion.div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{ background: sceneBg }}
					initial={false}
					animate={{ opacity: live ? 0 : 1 }}
					transition={{ duration: 0.6, ease: "easeOut" }}
				/>

				{/* Live scene: a drei <View> filling this media, tunneled to the shell canvas. */}
				{live && <CardView slug={project.slug} state={viewState} />}

				{/* Clickable label, painted above the canvas. */}
				<Link
					to="/work/$slug"
					params={{ slug: project.slug }}
					aria-label={`Open ${project.name}`}
					onClick={active ? undefined : rememberHomeScroll}
					className="absolute inset-0 flex items-end p-4"
				>
					<span className="hidden items-center gap-2 rounded-full bg-black/40 px-3 py-1 font-medium text-white text-xs backdrop-blur lg:inline-flex">
						{project.name}
					</span>
				</Link>

				{/* Corner mask + rounded border. The huge spread is clipped to this
				    media box by the parent's overflow-hidden, so it fills only the
				    corner notches (not neighbouring cards). */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-2xl border border-border"
					style={{ boxShadow: "0 0 0 9999px var(--background)" }}
				/>
			</motion.div>

			{active && <ProjectDetail project={project} />}
		</motion.article>
	);
}
