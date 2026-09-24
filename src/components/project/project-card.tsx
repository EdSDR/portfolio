import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { CardView } from "@/components/canvas/card-view";
import type { Project } from "@/content";
import { cn } from "@/lib/cn";
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
}: {
	project: Project;
	active: boolean;
}) {
	const [ref, state] = useInView<HTMLDivElement>();
	const mounted = useMounted();
	const fine = usePointerFine();
	const reduced = usePrefersReducedMotion();

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
	// reduced-motion stay on the poster.
	const live = sized && mounted && !reduced && (active || fine);
	const viewState = active ? "visible" : state;

	return (
		<motion.article
			layout
			transition={{ type: "spring", stiffness: 220, damping: 30 }}
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
					active ? "aspect-[16/9]" : "aspect-[16/10]",
				)}
			>
				{/* Poster fallback: mobile, reduced-motion, and pre-hydration. */}
				{!live && (
					<div
						className="absolute inset-0"
						style={{
							background: `radial-gradient(120% 120% at 50% 20%, ${project.accent}33, #06070a 62%)`,
						}}
					/>
				)}

				{/* Live scene: a drei <View> filling this media, tunneled to the shell canvas. */}
				{live && <CardView slug={project.slug} state={viewState} />}

				{/* Clickable label, painted above the canvas. */}
				<Link
					to="/work/$slug"
					params={{ slug: project.slug }}
					aria-label={`Open ${project.name}`}
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
