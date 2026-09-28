import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

/**
 * `import size from "./photo.jpg?size"` → `{ width, height }`, read from the
 * file header at build time (no dependency). Lets the gallery lay images out
 * before they load. Supports PNG, JPEG (incl. EXIF rotation), WebP, GIF, AVIF.
 */
export function imageSize(): Plugin {
	return {
		name: "image-size",
		enforce: "pre",
		async load(id) {
			const [file, query] = id.split("?");
			if (query !== "size") return null;
			this.addWatchFile(file);
			const size = readImageSize(await readFile(file));
			if (!size) this.error(`image-size: can't read dimensions of ${file}`);
			return `export default ${JSON.stringify(size)};`;
		},
	};
}

export interface ImageSize {
	width: number;
	height: number;
}

export function readImageSize(buf: Buffer): ImageSize | null {
	const ascii = (start: number, end: number) =>
		buf.toString("latin1", start, end);

	// PNG: IHDR is always the first chunk.
	if (buf.readUInt32BE(0) === 0x89504e47) {
		return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	}
	// GIF
	if (ascii(0, 4) === "GIF8") {
		return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
	}
	// WebP: lossy (VP8), lossless (VP8L), extended (VP8X).
	if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
		const chunk = ascii(12, 16);
		if (chunk === "VP8 ") {
			return {
				width: buf.readUInt16LE(26) & 0x3fff,
				height: buf.readUInt16LE(28) & 0x3fff,
			};
		}
		if (chunk === "VP8L") {
			const [b0, b1, b2, b3] = buf.subarray(21, 25);
			return {
				width: 1 + (((b1 & 0x3f) << 8) | b0),
				height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
			};
		}
		if (chunk === "VP8X") {
			return {
				width: 1 + buf.readUIntLE(24, 3),
				height: 1 + buf.readUIntLE(27, 3),
			};
		}
		return null;
	}
	// AVIF / HEIF: the `ispe` (image spatial extents) property box.
	if (ascii(4, 8) === "ftyp") {
		const at = buf.indexOf("ispe");
		if (at < 0) return null;
		return {
			width: buf.readUInt32BE(at + 8),
			height: buf.readUInt32BE(at + 12),
		};
	}
	// JPEG: walk the markers to the frame header, noting EXIF orientation on the way.
	if (buf[0] === 0xff && buf[1] === 0xd8) return readJpegSize(buf);
	return null;
}

/** Start-of-frame markers (C4 = DHT, C8 = JPG, CC = DAC are not frames). */
const SOF = new Set([
	0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpegSize(buf: Buffer): ImageSize | null {
	let orientation = 1;
	let i = 2;
	while (i + 9 < buf.length) {
		if (buf[i] !== 0xff) return null;
		const marker = buf[i + 1];
		if (marker === 0xff) {
			i++; // fill byte
			continue;
		}
		// Standalone markers carry no length.
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			i += 2;
			continue;
		}
		const length = buf.readUInt16BE(i + 2);
		if (marker === 0xe1) orientation = readExifOrientation(buf, i + 4) ?? 1;
		if (SOF.has(marker)) {
			const height = buf.readUInt16BE(i + 5);
			const width = buf.readUInt16BE(i + 7);
			// Orientations 5–8 rotate by 90°; browsers display them swapped.
			return orientation >= 5
				? { width: height, height: width }
				: { width, height };
		}
		i += 2 + length;
	}
	return null;
}

/** Orientation tag (0x0112) from an APP1 "Exif" segment starting at `start`. */
function readExifOrientation(buf: Buffer, start: number): number | null {
	if (buf.toString("latin1", start, start + 4) !== "Exif") return null;
	const tiff = start + 6;
	const little = buf.toString("latin1", tiff, tiff + 2) === "II";
	const u16 = (o: number) =>
		little ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
	const u32 = (o: number) =>
		little ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
	const ifd = tiff + u32(tiff + 4);
	const entries = u16(ifd);
	for (let e = 0; e < entries; e++) {
		const entry = ifd + 2 + e * 12;
		if (u16(entry) === 0x0112) return u16(entry + 8);
	}
	return null;
}
