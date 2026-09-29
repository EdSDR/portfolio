/**
 * Turns the originals in gallery-originals/ (gitignored: big PNGs stay off the
 * repo and out of the deploy) into web images in src/content/gallery/:
 *   <name>.webp          full view (lightbox), longest side ≤ 2400px
 *   thumbs/<name>.webp   grid tile, ≤ 1000px wide
 *
 * Names: `NN-project-what.png` → `NN-project-what.webp`. The number only sets
 * the order; the image's id (its `?image=` URL) is the name without it, so
 * reordering never breaks a shared link. Names are lowercased and slugified;
 * two originals that end up with the same id are an error.
 *
 * Encodes with the installed Google Chrome (playwright-core, like
 * `bun run posters`), so there's no image dependency. Only new or changed
 * originals are converted. `--prune` deletes outputs whose original is gone.
 *
 *   bun run gallery           # convert new/changed
 *   bun run gallery --force   # re-encode everything
 *   bun run gallery --prune   # also delete orphaned outputs
 */
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const SRC = "gallery-originals";
const OUT = "src/content/gallery";
const THUMBS = join(OUT, "thumbs");
const FULL = { maxSide: 2400, quality: 0.86 };
const THUMB = { maxWidth: 1000, quality: 0.82 };
const INPUT = /\.(png|jpe?g|webp|avif|gif)$/i;

const force = process.argv.includes("--force");
const prune = process.argv.includes("--prune");

/** "02 Torus DAO_landing.PNG" → "02-torus-dao-landing". */
const slugify = (file: string) =>
	file
		.replace(/\.[^.]+$/, "")
		.normalize("NFKD")
		.replace(/\p{M}/gu, "") // the accents NFKD split off: "ã" → "a"
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** Keep in sync with `toId` in src/content/gallery.ts. */
const idOf = (name: string) => name.replace(/^\d+-/, "");

if (
	!existsSync(SRC) ||
	readdirSync(SRC).filter((f) => INPUT.test(f)).length === 0
) {
	console.error(
		`No originals in ${SRC}/ — nothing to do (outputs left as they are).`,
	);
	process.exit(1);
}
mkdirSync(THUMBS, { recursive: true });

const originals = readdirSync(SRC)
	.filter((f) => INPUT.test(f))
	.map((file) => ({ file, name: slugify(file) }));

const byId = new Map<string, string>();
for (const { file, name } of originals) {
	const id = idOf(name);
	if (!id) throw new Error(`${file}: no name left after the order number`);
	const clash = byId.get(id);
	if (clash)
		throw new Error(`${file} and ${clash} both become id "${id}"; rename one`);
	byId.set(id, file);
}

const stale = originals.filter(({ file, name }) => {
	if (force) return true;
	const src = statSync(join(SRC, file)).mtimeMs;
	return [join(OUT, `${name}.webp`), join(THUMBS, `${name}.webp`)].some(
		(out) => !existsSync(out) || statSync(out).mtimeMs < src,
	);
});

if (stale.length > 0) {
	const browser = await chromium.launch({ channel: "chrome" });
	try {
		const page = await browser.newPage();
		for (const { file, name } of stale) {
			const bytes = readFileSync(join(SRC, file)).toString("base64");
			const type = `image/${extname(file).slice(1).toLowerCase().replace("jpg", "jpeg")}`;
			const out = await page.evaluate(
				async ({ bytes, type, FULL, THUMB }) => {
					const data = Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0));
					const source = await createImageBitmap(new Blob([data], { type }));
					const encode = async (scale: number, quality: number) => {
						const w = Math.round(source.width * scale);
						const h = Math.round(source.height * scale);
						const bitmap = await createImageBitmap(source, {
							resizeWidth: w,
							resizeHeight: h,
							resizeQuality: "high",
						});
						const canvas = new OffscreenCanvas(w, h);
						canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
						const blob = await canvas.convertToBlob({
							type: "image/webp",
							quality,
						});
						const buf = new Uint8Array(await blob.arrayBuffer());
						let bin = "";
						for (let i = 0; i < buf.length; i += 0x8000)
							bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
						return btoa(bin);
					};
					const long = Math.max(source.width, source.height);
					return {
						full: await encode(Math.min(1, FULL.maxSide / long), FULL.quality),
						thumb: await encode(
							Math.min(1, THUMB.maxWidth / source.width),
							THUMB.quality,
						),
						size: `${source.width}×${source.height}`,
					};
				},
				{ bytes, type, FULL, THUMB },
			);
			const full = Buffer.from(out.full, "base64");
			const thumb = Buffer.from(out.thumb, "base64");
			writeFileSync(join(OUT, `${name}.webp`), full);
			writeFileSync(join(THUMBS, `${name}.webp`), thumb);
			const kb = (b: Buffer) => `${Math.round(b.length / 1024)} KB`;
			console.log(
				`✓ ${file} (${out.size}) → ${name}.webp ${kb(full)}, thumb ${kb(thumb)}`,
			);
		}
	} finally {
		await browser.close();
	}
} else {
	console.log("Gallery is up to date.");
}

// Outputs with no original: other images in the folder (e.g. placeholders)
// or originals that were renamed/removed.
const wanted = new Set(originals.map(({ name }) => `${name}.webp`));
for (const dir of [OUT, THUMBS]) {
	for (const file of readdirSync(dir).filter((f) => INPUT.test(f))) {
		if (wanted.has(file)) continue;
		if (prune) {
			unlinkSync(join(dir, file));
			console.log(`- removed ${join(dir, file)}`);
		} else {
			console.warn(`! ${join(dir, file)} has no original (--prune deletes it)`);
		}
	}
}
