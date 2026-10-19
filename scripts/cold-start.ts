/**
 * Measures the first-ever visit: each run launches the installed Chrome with a
 * throwaway profile, so the GPU shader cache is empty (the HTTP cache too).
 * Clearing the browser cache or an incognito window doesn't reproduce this:
 * compiled shaders live in the profile and survive both. On macOS there's a
 * second, system-wide cache per app (Metal, keyed by the translated shader
 * source), so each run also makes every shader unique (UNIQUE_SHADERS):
 * otherwise only the very first run on a machine would be cold.
 *
 * Reports how long the screen went without a new frame (presentation gaps over
 * 100 ms, from a Chrome trace), main-thread long tasks, LCP, when the entrance
 * finished, and when each card's live scene was ready (poster faded).
 *
 *   bun run cold-start                     # serves dist/client (run `bun run build` first)
 *   bun run cold-start --dir path/to/client
 *   bun run cold-start --url https://edsdr.com
 *   bun run cold-start --runs 5 --headed
 */
import { execFile } from "node:child_process";
import { createReadStream, existsSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { chromium } from "playwright-core";

const { values: opts } = parseArgs({
	options: {
		url: { type: "string" },
		dir: { type: "string", default: "dist/client" },
		runs: { type: "string", default: "3" },
		wait: { type: "string", default: "9000" },
		headed: { type: "boolean", default: false },
		single: { type: "boolean", default: false },
		/** With --runs 1: write the raw trace (with JS samples) here. */
		save: { type: "string" },
	},
});

const TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".png": "image/png",
	".jpg": "image/jpeg",
	".woff2": "font/woff2",
	".glb": "model/gltf-binary",
	".wasm": "application/wasm",
};

/** Static server for a prerendered build (`/work/x` → `work/x/index.html`). */
async function serve(dir: string) {
	const server = createServer((req, res) => {
		const path = decodeURIComponent(
			new URL(req.url ?? "/", "http://x").pathname,
		);
		for (const candidate of [path, `${path}/index.html`, `${path}.html`]) {
			const file = join(dir, candidate);
			if (existsSync(file) && statSync(file).isFile()) {
				res.writeHead(200, {
					"Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
				});
				createReadStream(file).pipe(res);
				return;
			}
		}
		res.writeHead(404).end();
	});
	await new Promise<void>((resolve) => server.listen(0, resolve));
	return server;
}

const CATEGORIES = [
	"-*",
	"devtools.timeline",
	"disabled-by-default-devtools.timeline",
	"disabled-by-default-devtools.timeline.frame",
	"toplevel",
	"benchmark",
	"cc",
	"viz",
	"gpu",
	"loading",
	"blink.user_timing",
];

interface TraceEvent {
	name: string;
	ph: string;
	ts: number;
	dur?: number;
	pid: number;
	tid: number;
	args?: { name?: string; data?: { frame?: string; url?: string } };
}

/**
 * Wraps each shader's `main` with a check on a uniform whose name is new every
 * run. It never changes the output, but it's in the translated source, so the
 * Metal cache can't match it.
 */
const UNIQUE_SHADERS = (nonce: string) => {
	for (const proto of [
		WebGLRenderingContext.prototype,
		WebGL2RenderingContext.prototype,
	]) {
		const { createShader, shaderSource } = proto;
		const fragments = new WeakSet<WebGLShader>();
		// Track the type at creation: asking the GPU process (getShaderParameter)
		// is a synchronous round trip, and would add stalls of its own.
		proto.createShader = function (type) {
			const shader = createShader.call(this, type);
			if (shader && type === this.FRAGMENT_SHADER) fragments.add(shader);
			return shader;
		};
		proto.shaderSource = function (shader, source) {
			const fragment = fragments.has(shader);
			const u = `uColdStart_${nonce}`;
			const lines = source.split("\n");
			const head = lines[0].startsWith("#version") ? `${lines.shift()}\n` : "";
			const body = fragment
				? `if (${u} > 1e30) discard;`
				: `if (${u} > 1e30) gl_Position = vec4(0.0);`;
			shaderSource.call(
				this,
				shader,
				`${head}#define main coldStartMain\n${lines.join("\n")}\n#undef main\nuniform float ${u};\nvoid main() { coldStartMain(); ${body} }\n`,
			);
		};
	}
};

/** Collected in the page: LCP, entrance end, scene-ready times (ms). */
const PAGE_PROBE = () => {
	const probe = {
		lcp: 0,
		entranceEnd: 0,
		ready: {} as Record<string, number>,
	};
	Object.assign(window, { __coldStart: probe });
	new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) probe.lcp = entry.startTime;
	}).observe({ type: "largest-contentful-paint", buffered: true });
	const watch = () => {
		new MutationObserver((records) => {
			for (const r of records) {
				const el = r.target as HTMLElement;
				const slug = el
					.closest("article")
					?.querySelector("a[href^='/work/']")
					?.getAttribute("href")
					?.replace("/work/", "");
				if (el.hasAttribute("data-scene-ready") && slug && !probe.ready[slug])
					probe.ready[slug] = Math.round(performance.now());
			}
		}).observe(document.body, {
			subtree: true,
			attributes: true,
			attributeFilter: ["data-scene-ready"],
		});
		const entrance = document
			.getAnimations()
			.filter(
				(a) => a instanceof CSSAnimation && a.animationName.startsWith("fly-"),
			);
		Promise.all(entrance.map((a) => a.finished.catch(() => {}))).then(() => {
			probe.entranceEnd = Math.round(performance.now());
		});
	};
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", watch);
	else watch();
};

async function run(url: string, wait: number) {
	// launch() (not launchPersistentContext) starts from a new temporary
	// profile every time: empty HTTP and GPU shader caches.
	const browser = await chromium.launch({
		channel: "chrome",
		headless: !opts.headed,
		args: ["--enable-gpu", "--ignore-gpu-blocklist"],
	});
	try {
		const page = await browser.newPage({
			viewport: { width: 1512, height: 900 },
			deviceScaleFactor: 2,
			reducedMotion: "no-preference",
		});
		await page.addInitScript(PAGE_PROBE);
		await page.addInitScript(
			UNIQUE_SHADERS,
			Math.random().toString(36).slice(2, 10),
		);
		// Browser-wide trace: the GPU process is where the stalls happen.
		const cdp = await browser.newBrowserCDPSession();
		const events: TraceEvent[] = [];
		cdp.on("Tracing.dataCollected", ({ value }) =>
			events.push(...(value as unknown as TraceEvent[])),
		);
		const done = new Promise((resolve) =>
			cdp.once("Tracing.tracingComplete", resolve),
		);
		await cdp.send("Tracing.start", {
			transferMode: "ReportEvents",
			traceConfig: {
				includedCategories: opts.save
					? [...CATEGORIES, "disabled-by-default-v8.cpu_profiler"]
					: CATEGORIES,
			},
		});
		await page.goto(url, { waitUntil: "load" });
		await page.waitForTimeout(wait);
		const probe = await page.evaluate(
			() => (window as unknown as { __coldStart: unknown }).__coldStart,
		);
		await cdp.send("Tracing.end");
		await done;
		if (opts.save) writeFileSync(opts.save, JSON.stringify(events));
		return { ...analyze(events, wait), ...(probe as object) };
	} finally {
		await browser.close();
	}
}

function analyze(events: TraceEvent[], wait: number) {
	const nav = events.find(
		(e) =>
			e.name === "navigationStart" &&
			JSON.stringify(e.args ?? {}).includes("http"),
	);
	const t0 = nav?.ts ?? Math.min(...events.map((e) => e.ts).filter(Boolean));
	const ms = (us: number) => (us - t0) / 1000;
	const threads = new Map<string, string>();
	for (const e of events)
		if (e.ph === "M" && e.name === "thread_name")
			threads.set(`${e.pid}:${e.tid}`, e.args?.name ?? "");

	const presented = [
		...new Set(
			events
				.filter(
					(e) =>
						e.name === "SwapEndToPresentationCompositorFrame" &&
						(e.ph === "e" || e.ph === "E" || e.ph === "X"),
				)
				.map((e) => Math.round(ms(e.ts + (e.dur ?? 0)))),
		),
	]
		.filter((t) => t > 0 && t < wait)
		.sort((a, b) => a - b);
	const gaps = presented.slice(1).map((t, i) => t - presented[i]);
	const stalls = gaps.filter((g) => g > 100);

	const longTasks = events.filter(
		(e) =>
			e.ph === "X" &&
			e.name === "RunTask" &&
			(e.dur ?? 0) > 50_000 &&
			threads.get(`${e.pid}:${e.tid}`) === "CrRendererMain" &&
			ms(e.ts) > 0 &&
			ms(e.ts) < wait,
	);
	const gpuTasks = events.filter(
		(e) =>
			e.ph === "X" &&
			e.name === "RunTask" &&
			(e.dur ?? 0) > 50_000 &&
			threads.get(`${e.pid}:${e.tid}`) === "CrGpuMain" &&
			ms(e.ts) > 0 &&
			ms(e.ts) < wait,
	);
	const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0));
	return {
		frames: presented.length,
		stallMs: sum(stalls),
		worstStall: Math.max(0, ...gaps),
		longTaskMs: sum(longTasks.map((e) => (e.dur ?? 0) / 1000)),
		worstTask: Math.round(
			Math.max(0, ...longTasks.map((e) => (e.dur ?? 0) / 1000)),
		),
		gpuBusyMs: sum(gpuTasks.map((e) => (e.dur ?? 0) / 1000)),
	};
}

if (opts.single) {
	// One measurement per process: a second chromium.launch() in the same Bun
	// process hangs.
	console.log(JSON.stringify(await run(opts.url ?? "", Number(opts.wait))));
	process.exit(0);
}

const server = opts.url ? null : await serve(opts.dir ?? "dist/client");
const url =
	opts.url ?? `http://localhost:${(server?.address() as AddressInfo).port}/`;
const runs = Number(opts.runs);
console.log(`Cold start × ${runs}: ${url}`);
const results: Record<string, unknown>[] = [];
for (let i = 0; i < runs; i++) {
	const args = [fileURLToPath(import.meta.url), "--single", "--url", url];
	args.push("--wait", opts.wait ?? "9000");
	if (opts.headed) args.push("--headed");
	if (opts.save) args.push("--save", opts.save);
	const { stdout } = await promisify(execFile)("bun", args, {
		maxBuffer: 1 << 24,
	});
	const out = stdout.trim().split("\n").pop() ?? "{}";
	results.push(JSON.parse(out));
	console.log(out);
}
const median = (key: string) => {
	const xs = results
		.map((r) => r[key])
		.filter((x): x is number => typeof x === "number")
		.sort((a, b) => a - b);
	return xs[Math.floor(xs.length / 2)];
};
console.log(
	"median:",
	Object.fromEntries(
		[
			"stallMs",
			"worstStall",
			"frames",
			"longTaskMs",
			"worstTask",
			"gpuBusyMs",
			"lcp",
			"entranceEnd",
		].map((k) => [k, Math.round(median(k) ?? 0)]),
	),
);
server?.close();
