import { z } from "zod";

/**
 * Typed frontmatter for each project MDX file. Kept flat and serializable;
 * `accent` tints the scene/poster, `date` drives list ordering.
 */
export const frontmatterSchema = z.object({
	name: z.string(),
	description: z.string(),
	date: z.coerce.date(),
	accent: z.string().default("#34d399"),
	tags: z.array(z.string()).default([]),
	links: z.array(z.object({ text: z.string(), url: z.string() })).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;
