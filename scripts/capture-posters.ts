/**
 * Captures a still of every card's live scene into public/posters/:
 *   <slug>.webp     — the card cover (loading / mobile / reduced-motion)
 *   <slug>-og.jpg   — 1200×630 link-preview image (og:image)
 *
 * Drives the installed Google Chrome via playwright-core against the dev server
 * (started automatically unless BASE_URL is already serving). Usage:
 *   bun run posters            # all projects
 *   bun run posters torus      # just one
 */
import { spawn } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "public/posters";
const COVER_MAX_WIDTH = 1600;

/** Extra time after the first frame for scenes that settle (Torus' force sim). */
const SETTLE_MS: Record<string, number> = { torus: 7000 };
const DEFAULT_SETTLE_MS = 2500;

const allSlugs = readdirSync("src/content/projects")
	.filter((f) => f.endsWith(".mdx"))
	.map((f) => f.replace(/\.mdx$/, ""));
const slugs = process.argv.length > 2 ? process.argv.slice(2) : allSlugs;

async function isUp(): Promise<boolean> {
	try {
		return (await fetch(BASE_URL)).ok;
	} catch {
		return false;
	}
}

async function ensureServer() {
	if (await isUp()) return null;
	console.log("Starting dev server…");
	const server = spawn("bun", ["run", "dev"], { stdio: "ignore" });
	for (let i = 0; i < 60; i++) {
		await new Promise((r) => setTimeout(r, 500));
		if (await isUp()) return server;
	}
	server.kill();
	throw new Error(`Dev server did not come up at ${BASE_URL}`);
}

const server = await ensureServer();
const browser = await chromium.launch({
	channel: "chrome",
	args: ["--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
	const page = await browser.newPage({
		viewport: { width: 1600, height: 1000 },
		deviceScaleFactor: 1.5,
		reducedMotion: "no-preference",
	});
	await page.goto(BASE_URL, { waitUntil: "networkidle" });
	// Raw scene only: no label pill, border, rounded corners, or dev overlays
	// (the app shell is <body>'s first child; devtools render after it).
	await page.addStyleTag({
		content: [
			"[data-card-label]{display:none!important}",
			"[data-scene-media]{border:0!important;border-radius:0!important}",
			"body>:not(:first-child){display:none!important}",
		].join(""),
	});

	for (const slug of slugs) {
		const media = page
			.locator("article", { has: page.locator(`a[href="/work/${slug}"]`) })
			.locator("[data-scene-media]");
		if ((await media.count()) === 0) {
			console.warn(`skip ${slug}: no card`);
			continue;
		}
		await media.scrollIntoViewIfNeeded();
		await media.evaluate((el) => el.scrollIntoView({ block: "center" }));
		await page.waitForSelector(
			`article:has(a[href="/work/${slug}"]) [data-scene-ready]`,
			{ timeout: 60_000 },
		);
		await page.waitForTimeout(SETTLE_MS[slug] ?? DEFAULT_SETTLE_MS);

		const png = (await media.screenshot({ type: "png" })).toString("base64");
		const { cover, og } = await page.evaluate(
			async ({ png, maxWidth }) => {
				const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
				const img = await createImageBitmap(new Blob([bytes]));
				const encode = async (
					w: number,
					h: number,
					type: string,
					quality: number,
				) => {
					// Center-crop to the target aspect, then scale.
					const scale = Math.max(w / img.width, h / img.height);
					const sw = w / scale;
					const sh = h / scale;
					const canvas = new OffscreenCanvas(w, h);
					canvas
						.getContext("2d")
						?.drawImage(
							img,
							(img.width - sw) / 2,
							(img.height - sh) / 2,
							sw,
							sh,
							0,
							0,
							w,
							h,
						);
					const blob = await canvas.convertToBlob({ type, quality });
					const buf = new Uint8Array(await blob.arrayBuffer());
					let bin = "";
					for (const b of buf) bin += String.fromCharCode(b);
					return btoa(bin);
				};
				const coverW = Math.min(maxWidth, img.width);
				const coverH = Math.round((img.height * coverW) / img.width);
				return {
					cover: await encode(coverW, coverH, "image/webp", 0.82),
					og: await encode(1200, 630, "image/jpeg", 0.85),
				};
			},
			{ png, maxWidth: COVER_MAX_WIDTH },
		);

		writeFileSync(`${OUT_DIR}/${slug}.webp`, Buffer.from(cover, "base64"));
		writeFileSync(`${OUT_DIR}/${slug}-og.jpg`, Buffer.from(og, "base64"));
		console.log(`✓ ${slug}`);
	}
} finally {
	await browser.close();
	server?.kill();
}
