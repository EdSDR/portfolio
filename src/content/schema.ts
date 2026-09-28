import { z } from "zod";

/**
 * Typed frontmatter for each project MDX file. Kept flat and serializable;
 * `date` drives list ordering. `accent` is a per-project color, not used yet.
 * `company` + `year` (optional) form the meta line under a writeup's title,
 * e.g. "Renlabs · 2025" for the work the scene recreates.
 */
export const frontmatterSchema = z.object({
	name: z.string(),
	description: z.string(),
	company: z.string().optional(),
	year: z.string().optional(),
	date: z.coerce.date(),
	accent: z.string().default("#34d399"),
	tags: z.array(z.string()).default([]),
	links: z.array(z.object({ text: z.string(), url: z.string() })).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
