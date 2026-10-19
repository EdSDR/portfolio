import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Starts the cards' live scenes one at a time, and never while the site
 * entrance is playing. Starting a scene (WebGL context, shader links, texture
 * uploads) occupies Chrome's GPU process, which also draws the page: on a first
 * visit, four scenes starting with the fly-in froze it for seconds,
 * compositor animations included. Each scene holds the slot until its first
 * frame is drawn (or it fails); the next one starts when the page is idle.
 * Visible cards go first, in list order; cards near the viewport after.
 */

interface Ticket {
	rank: number;
	start: () => void;
}

const waiting = new Set<Ticket>();
let running: Ticket | null = null;
let pumping = false;

/** A scene that never reports (stalled download) stops holding the queue. */
const MAX_HOLD_MS = 10_000;
let holdTimer: ReturnType<typeof setTimeout> | undefined;

/** The CSS entrance (`.fly-up`: fly-up + fly-blur) still playing anywhere. */
function entrance(): Promise<unknown> {
	return Promise.all(
		document
			.getAnimations()
			.filter(
				(a) =>
					a instanceof CSSAnimation &&
					a.animationName.startsWith("fly-") &&
					a.playState !== "finished",
			)
			.map((a) => a.finished.catch(() => {})),
	);
}

const idle = () =>
	new Promise<void>((resolve) => {
		if ("requestIdleCallback" in window)
			requestIdleCallback(() => resolve(), { timeout: 500 });
		else setTimeout(resolve, 50);
	});

async function pump() {
	if (pumping) return;
	pumping = true;
	try {
		while (!running && waiting.size > 0) {
			await entrance();
			await idle();
			if (running || waiting.size === 0) break;
			let next: Ticket | undefined;
			for (const ticket of waiting)
				if (!next || ticket.rank < next.rank) next = ticket;
			if (!next) break;
			waiting.delete(next);
			running = next;
			const ticket = next;
			holdTimer = setTimeout(() => release(ticket), MAX_HOLD_MS);
			ticket.start();
		}
	} finally {
		pumping = false;
	}
}

function release(ticket: Ticket) {
	waiting.delete(ticket);
	if (running !== ticket) return;
	running = null;
	clearTimeout(holdTimer);
	void pump();
}

/**
 * While `wanted`, queues this card's scene; `started` turns true when it may
 * mount, and stays true until `wanted` turns false. Call `done` once the scene
 * has drawn its first frame or failed. Lower `rank` starts first.
 */
export function useSceneStart(
	wanted: boolean,
	rank: number,
): [started: boolean, done: () => void] {
	const [started, setStarted] = useState(false);
	const ticket = useRef<Ticket | null>(null);
	const rankRef = useRef(rank);
	rankRef.current = rank;

	useEffect(() => {
		if (!wanted) return;
		const t: Ticket = { rank: rankRef.current, start: () => setStarted(true) };
		ticket.current = t;
		waiting.add(t);
		void pump();
		return () => {
			release(t);
			ticket.current = null;
			setStarted(false);
		};
	}, [wanted]);

	useEffect(() => {
		if (ticket.current) ticket.current.rank = rank;
	}, [rank]);

	const done = useCallback(() => {
		if (ticket.current) release(ticket.current);
	}, []);
	return [started, done];
}
