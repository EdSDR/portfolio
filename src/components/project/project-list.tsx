import { useParams } from "@tanstack/react-router";
import { LayoutGroup } from "motion/react";
import { useEffect, useRef } from "react";
import { projects } from "@/content";
import { restoreHomeScroll } from "@/lib/scroll-memory";
import { ProjectCard } from "./project-card";

/**
 * Persistent list of project cards. Reads the active slug from the route: with
 * no slug every card shows; with a slug only that card remains (others exit) and
 * it expands in place. This component lives in the shell above <Outlet/>, so it
 * never unmounts on navigation.
 */
export function ProjectList() {
	const { slug } = useParams({ strict: false }) as { slug?: string };
	const visible = slug ? projects.filter((p) => p.slug === slug) : projects;

	// Cards on the list's first render fly in (page load, or switching back from
	// the Gallery tab); cards re-mounting after a project closes just appear.
	const firstRender = useRef(true);
	useEffect(() => {
		firstRender.current = false;
	}, []);

	// On close (slug clears), restore the home scroll position after the list has
	// re-expanded, so the card collapses back into its spot instead of the page
	// jumping to the top.
	const prevSlug = useRef(slug);
	useEffect(() => {
		const wasOpen = prevSlug.current;
		prevSlug.current = slug;
		if (wasOpen && !slug) {
			requestAnimationFrame(() =>
				requestAnimationFrame(() => restoreHomeScroll()),
			);
		}
	}, [slug]);

	return (
		<LayoutGroup>
			<div className="flex flex-col gap-4">
				{/* No AnimatePresence: cards have no exit animation, and holding exiting
				    cards in the flow for a frame made Motion measure the opened card's
				    target too low (it dipped before rising). They unmount in the same
				    commit, so the layout Motion measures is already final. */}
				{visible.map((project, i) => (
					<ProjectCard
						key={project.slug}
						project={project}
						active={project.slug === slug}
						index={i}
						enter={firstRender.current}
					/>
				))}
			</div>
		</LayoutGroup>
	);
}
