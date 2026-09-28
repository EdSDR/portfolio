/**
 * Gallery images: every file in `./gallery/` becomes an item, ordered by
 * filename (prefix with numbers to control order). Dimensions are read from the
 * file at build time (`?size`, see vite-plugins/image-size.ts), so the masonry
 * lays out before any image loads. Files are content-hashed by Vite.
 *
 * Alt text defaults to the humanized filename ("02-torus-dashboard.png" →
 * "Torus dashboard"); override it or add a caption below, keyed by id (the
 * filename without extension).
 */
import type { ImageSize } from "../../vite-plugins/image-size.ts";

export interface GalleryImage {
	id: string;
	src: string;
	width: number;
	height: number;
	alt: string;
	caption?: string;
}

const details: Record<string, { alt?: string; caption?: string }> = {
	// "02-torus-dashboard": { alt: "Torus agent dashboard", caption: "Torus, 2026" },
};

const urls = import.meta.glob<string>(
	"./gallery/*.{png,jpg,jpeg,webp,avif,gif}",
	{ eager: true, query: "?url", import: "default" },
);
const sizes = import.meta.glob<ImageSize>(
	"./gallery/*.{png,jpg,jpeg,webp,avif,gif}",
	{ eager: true, query: "?size", import: "default" },
);

const toId = (path: string) =>
	path
		.split("/")
		.pop()
		?.replace(/\.[^.]+$/, "") ?? path;

const humanize = (id: string) => {
	const words = id
		.replace(/^\d+[-_ ]*/, "")
		.replace(/[-_]+/g, " ")
		.trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
};

export const galleryImages: GalleryImage[] = Object.keys(urls)
	.sort()
	.map((path) => {
		const id = toId(path);
		return {
			id,
			src: urls[path],
			...sizes[path],
			alt: details[id]?.alt ?? humanize(id),
			caption: details[id]?.caption,
		};
	});

export function getGalleryImage(id: string): GalleryImage | undefined {
	return galleryImages.find((image) => image.id === id);
}
