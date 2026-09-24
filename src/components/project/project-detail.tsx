import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ComponentType, lazy, Suspense, useMemo } from "react";
import type { Project } from "@/content";

/** The writeup that appears under the expanded hero: meta + the compiled MDX. */
export function ProjectDetail({ project }: { project: Project }) {
	const Body = useMemo<ComponentType>(
		() => lazy(() => project.loadBody()),
		[project],
	);

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.12, duration: 0.4 }}
			className="mx-auto w-full max-w-3xl px-1 py-8"
		>
			<Link
				to="/"
				className="text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				← Back
			</Link>

			<h1 className="mt-4 font-semibold text-3xl tracking-tight">
				{project.name}
			</h1>
			<p className="mt-2 text-muted-foreground">{project.description}</p>

			{project.tags.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{project.tags.map((tag) => (
						<span
							key={tag}
							className="rounded-md bg-muted px-2 py-1 text-muted-foreground text-xs"
						>
							{tag}
						</span>
					))}
				</div>
			)}

			{project.links.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-4">
					{project.links.map((link) => (
						<a
							key={link.url}
							href={link.url}
							target="_blank"
							rel="noreferrer"
							className="text-sm underline underline-offset-4 hover:text-foreground/70"
						>
							{link.text} ↗
						</a>
					))}
				</div>
			)}

			<article className="prose-custom mt-8">
				<Suspense
					fallback={
						<p className="text-muted-foreground text-sm">Loading writeup…</p>
					}
				>
					<Body />
				</Suspense>
			</article>
		</motion.div>
	);
}
