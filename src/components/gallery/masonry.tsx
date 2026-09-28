import { type Easing, motion, useReducedMotion } from "motion/react";
import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FLY_PENDING, type FlyFrom, flyIn, POWER3_OUT } from "@/lib/fly-in";

const POWER2_OUT: Easing = [0.25, 0.46, 0.45, 0.94];

export interface MasonryItem {
	id: string;
	img: string;
	/** Intrinsic size; tiles keep this aspect ratio at the column width. */
	width: number;
	height: number;
	alt: string;
	/** Opened in a new tab on click when no `onItemClick` is given. */
	url?: string;
}

interface MasonryProps {
	items: MasonryItem[];
	/** Easing/duration for re-flowing tiles when the column count or width changes. */
	ease?: Easing;
	duration?: number;
	/** Delay between tiles' entrances, in seconds. */
	stagger?: number;
	animateFrom?: FlyFrom;
	scaleOnHover?: boolean;
	hoverScale?: number;
	blurToFocus?: boolean;
	colorShiftOnHover?: boolean;
	gap?: number;
	onItemClick?: (item: MasonryItem, element: HTMLElement) => void;
	/** Tile currently shown elsewhere (e.g. a lightbox) via its shared layoutId. */
	activeId?: string;
}

/** Shared-layout id of a tile's image, for animating it into a lightbox. */
export const masonryLayoutId = (id: string) => `masonry-${id}`;

/** Columns from the container's own width (it lives in a column, not the viewport). */
const columnsFor = (width: number) =>
	width >= 1400 ? 4 : width >= 860 ? 3 : width >= 480 ? 2 : 1;

interface GridItem extends MasonryItem {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Masonry grid: each tile drops into the shortest column at its image's aspect
 * ratio. Tiles fly in (from `animateFrom`, blurred into focus) as their image
 * loads, staggered; re-flows (column count / width changes) glide tiles to
 * their new spots.
 * A Motion port of the GSAP masonry from reactbits.dev.
 */
export function Masonry({
	items,
	ease = POWER3_OUT,
	duration = 0.6,
	stagger = 0.05,
	animateFrom = "bottom",
	scaleOnHover = true,
	hoverScale = 0.95,
	blurToFocus = true,
	colorShiftOnHover = false,
	gap = 16,
	onItemClick,
	activeId,
}: MasonryProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	// Entrance stagger is scheduled from mount, so tiles that load late (lazy,
	// below the fold) don't wait out their whole index delay.
	const mountedAt = useRef(0);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		mountedAt.current = performance.now();
		setWidth(el.clientWidth);
		const ro = new ResizeObserver(([entry]) =>
			setWidth(entry.contentRect.width),
		);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const { grid, height } = useMemo<{ grid: GridItem[]; height: number }>(() => {
		if (!width) return { grid: [], height: 0 };
		const columns = columnsFor(width);
		const colHeights = new Array<number>(columns).fill(0);
		const w = (width - (columns - 1) * gap) / columns;
		const grid = items.map((item) => {
			const col = colHeights.indexOf(Math.min(...colHeights));
			const h = (w * item.height) / item.width;
			const placed = { ...item, x: col * (w + gap), y: colHeights[col], w, h };
			colHeights[col] += h + gap;
			return placed;
		});
		return { grid, height: Math.max(0, Math.max(...colHeights) - gap) };
	}, [items, width, gap]);

	return (
		<div ref={containerRef} className="relative w-full" style={{ height }}>
			{grid.map((item, index) => (
				<Tile
					key={item.id}
					item={item}
					index={index}
					containerRef={containerRef}
					mountedAt={mountedAt}
					layoutTransition={{ duration, ease }}
					stagger={stagger}
					animateFrom={animateFrom}
					scaleOnHover={scaleOnHover}
					hoverScale={hoverScale}
					blurToFocus={blurToFocus}
					colorShiftOnHover={colorShiftOnHover}
					onItemClick={onItemClick}
					active={item.id === activeId}
				/>
			))}
		</div>
	);
}

function Tile({
	item,
	index,
	containerRef,
	mountedAt,
	layoutTransition,
	stagger,
	animateFrom,
	scaleOnHover,
	hoverScale,
	blurToFocus,
	colorShiftOnHover,
	onItemClick,
	active,
}: {
	item: GridItem;
	index: number;
	containerRef: RefObject<HTMLDivElement | null>;
	mountedAt: RefObject<number>;
	layoutTransition: { duration: number; ease: Easing };
	stagger: number;
	animateFrom: FlyFrom;
	scaleOnHover: boolean;
	hoverScale: number;
	blurToFocus: boolean;
	colorShiftOnHover: boolean;
	onItemClick?: (item: MasonryItem, element: HTMLElement) => void;
	active: boolean;
}) {
	const scope = useRef<HTMLDivElement>(null);
	const reduced = useReducedMotion();
	// Kept above the lightbox backdrop while flying to/from it; lowered once the
	// return flight is over (a timer: Motion's layout-complete callback doesn't
	// fire when the lightbox opened on page load).
	const [raised, setRaised] = useState(false);
	if (active && !raised) setRaised(true);
	useEffect(() => {
		if (active || !raised) return;
		const t = setTimeout(() => setRaised(false), 900);
		return () => clearTimeout(t);
	}, [active, raised]);

	// Plays once, when the tile's image has loaded (or failed).
	const entered = useRef(false);
	const enter = () => {
		const el = scope.current;
		if (!el || entered.current) return;
		entered.current = true;
		const delay = Math.max(
			0,
			mountedAt.current + index * stagger * 1000 - performance.now(),
		);
		flyIn(el, {
			from: animateFrom,
			delay: delay / 1000,
			blur: blurToFocus ? 10 : 0,
			reduced: !!reduced,
			bounds: containerRef.current?.getBoundingClientRect(),
		});
	};

	return (
		// Position/size are animated directly (as the GSAP original did) rather
		// than with `layout`: Motion deliberately skips layout animations caused by
		// window resizes, which is exactly when the grid re-flows.
		<motion.div
			className="absolute top-0 left-0"
			initial={false}
			animate={{ x: item.x, y: item.y, width: item.w, height: item.h }}
			transition={reduced ? { duration: 0 } : layoutTransition}
			style={{ zIndex: raised ? 60 : undefined }}
		>
			{/* Entrance wrapper: hidden until its image has loaded. */}
			<div ref={scope} data-fly={FLY_PENDING} className="size-full">
				<motion.button
					type="button"
					aria-label={item.alt}
					className="relative block size-full cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
					initial="rest"
					whileHover="hover"
					variants={{
						rest: { scale: 1 },
						hover: { scale: scaleOnHover ? hoverScale : 1 },
					}}
					transition={{ duration: 0.3, ease: POWER2_OUT }}
					onClick={(e) => {
						if (onItemClick) onItemClick(item, e.currentTarget);
						else if (item.url) window.open(item.url, "_blank", "noopener");
					}}
				>
					<motion.img
						layoutId={masonryLayoutId(item.id)}
						transition={{ layout: LIGHTBOX_SPRING }}
						src={item.img}
						alt=""
						width={item.width}
						height={item.height}
						loading="lazy"
						decoding="async"
						draggable={false}
						onLoad={enter}
						onError={enter}
						className="size-full object-cover shadow-[0_10px_50px_-10px_rgba(0,0,0,0.35)]"
						style={{ borderRadius: 12 }}
					/>
					{colorShiftOnHover && (
						<motion.span
							aria-hidden
							className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-tr from-pink-500/50 to-sky-500/50"
							variants={{ rest: { opacity: 0 }, hover: { opacity: 0.3 } }}
							transition={{ duration: 0.3 }}
						/>
					)}
				</motion.button>
			</div>
		</motion.div>
	);
}

/** Spring shared by a tile and its lightbox copy (see Lightbox). */
export const LIGHTBOX_SPRING = {
	type: "spring",
	stiffness: 300,
	damping: 34,
} as const;
