import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { galleryImages, getGalleryImage } from "@/content/gallery";
import { Lightbox } from "./lightbox";
import { Masonry, type MasonryItem } from "./masonry";

/**
 * The Gallery tab: a masonry of still images; clicking one opens it in the
 * lightbox. The open image is the `?image=` search param, so the back button
 * closes it and a lightbox can be linked to directly.
 */
export function GalleryView() {
	const image = useSearch({ strict: false, select: (s) => s.image });
	const active = image ? getGalleryImage(image) : undefined;
	const navigate = useNavigate();
	const router = useRouter();

	// Opened by a click here → closing pops that history entry (so back/forward
	// stay sane). Opened from a shared link → closing replaces the URL instead.
	const openedHere = useRef(false);
	const returnFocus = useRef<HTMLElement | null>(null);
	useEffect(() => {
		if (!active) openedHere.current = false;
	}, [active]);

	const items = useMemo<MasonryItem[]>(
		() =>
			galleryImages.map(({ id, src, width, height, alt }) => ({
				id,
				img: src,
				width,
				height,
				alt,
			})),
		[],
	);

	const open = useCallback(
		(item: MasonryItem, element: HTMLElement) => {
			returnFocus.current = element;
			openedHere.current = true;
			navigate({
				to: "/gallery",
				search: { image: item.id },
				resetScroll: false,
			});
		},
		[navigate],
	);

	const close = useCallback(() => {
		if (openedHere.current) {
			openedHere.current = false;
			router.history.back();
		} else {
			navigate({
				to: "/gallery",
				search: {},
				replace: true,
				resetScroll: false,
			});
		}
	}, [navigate, router]);

	if (galleryImages.length === 0) {
		return (
			<p className="py-24 text-center text-muted-foreground text-sm">
				Nothing here yet.
			</p>
		);
	}

	return (
		<>
			<Masonry items={items} onItemClick={open} activeId={active?.id} />
			<Lightbox
				image={active}
				onClose={close}
				onExitComplete={() =>
					returnFocus.current?.focus({ preventScroll: true })
				}
			/>
		</>
	);
}
