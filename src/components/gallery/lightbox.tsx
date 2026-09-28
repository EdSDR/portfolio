import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { GalleryImage } from "@/content/gallery";
import { LIGHTBOX_SPRING, masonryLayoutId } from "./masonry";

/**
 * Full-view image over a blurred backdrop. The image shares its tile's
 * layoutId, so it flies out of the grid and back. Closes on Esc, backdrop
 * click, or the browser back button (the open image lives in the URL).
 */
export function Lightbox({
	image,
	onClose,
	onExitComplete,
}: {
	image?: GalleryImage;
	onClose: () => void;
	onExitComplete?: () => void;
}) {
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!image) return;
		// Lock page scroll while open (the gutter is reserved, so nothing shifts).
		const root = document.documentElement;
		const overflow = root.style.overflow;
		root.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		closeRef.current?.focus({ preventScroll: true });
		return () => {
			root.style.overflow = overflow;
			window.removeEventListener("keydown", onKey);
		};
	}, [image, onClose]);

	return (
		<AnimatePresence onExitComplete={onExitComplete}>
			{image && (
				<motion.div
					key="lightbox"
					role="dialog"
					aria-modal="true"
					aria-label={image.alt}
					className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-4 p-4 sm:p-10"
					onClick={onClose}
				>
					<motion.div
						aria-hidden
						className="absolute inset-0 bg-background/85 backdrop-blur-md"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					/>
					<motion.img
						layoutId={masonryLayoutId(image.id)}
						transition={{ layout: LIGHTBOX_SPRING }}
						src={image.src}
						alt={image.alt}
						width={image.width}
						height={image.height}
						draggable={false}
						className="relative object-cover shadow-2xl"
						style={{
							borderRadius: 12,
							aspectRatio: `${image.width} / ${image.height}`,
							// Fit inside the viewport (minus room for the caption) without upscaling.
							width: `min(100%, ${image.width}px, calc((100dvh - 9rem) * ${image.width / image.height}))`,
						}}
					/>
					{image.caption && (
						<motion.p
							className="relative text-muted-foreground text-sm"
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{ delay: 0.15, duration: 0.3 }}
						>
							{image.caption}
						</motion.p>
					)}
					<motion.button
						ref={closeRef}
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
							strokeLinecap="round"
							className="size-4"
							aria-hidden="true"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</motion.button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
