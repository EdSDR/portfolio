# portfolio

Personal portfolio for Ed (EdSDR). A sticky bio sidebar sits beside a
page-scrolling list of project cards; each card's hero is a **live React Three
Fiber scene**, and opening a card expands it into its own route (`/work/$slug`)
with the scene on top and an MDX writeup below. A second tab, **Gallery**
(`/gallery`), shows still images of the work in a masonry grid with a lightbox.

## Stack

- [TanStack Start](https://tanstack.com/start) (Vite) + React 19 + TypeScript
- [React Three Fiber](https://r3f.docs.pmnd.rs/) v9 + [drei](https://drei.docs.pmnd.rs/) (WebGL)
- [Motion](https://motion.dev/) for transitions
- MDX (build-time, `@mdx-js/rollup`) with Zod-validated frontmatter
- Tailwind CSS v4, Biome, Bun
- Deployed to Cloudflare Workers (`@cloudflare/vite-plugin`), statically prerendered

## Develop

```bash
bun install
bun run dev        # http://localhost:3000
```

| Script            | Does                                   |
| ----------------- | -------------------------------------- |
| `bun run dev`     | Dev server on :3000                    |
| `bun run build`   | Production build + static prerender    |
| `bun run preview` | Preview the built app                  |
| `bun run check`   | Biome format + lint (report only)      |
| `bun run fix`     | Biome format + lint, applying fixes    |
| `bun run typecheck` | TypeScript (`tsc --noEmit`)          |
| `bun run posters` | Re-capture card posters + OG images    |
| `bun run deploy`  | Build and `wrangler deploy` to Workers |

## Layout

```
src/
  routes/       # __root (persistent shell), index, work.$slug, gallery
  components/   # layout/, canvas/ (per-card Canvas + scenes), project/, gallery/
  content/      # MDX writeups + Zod frontmatter schema, gallery images
  lib/          # hooks + utils
  styles.css    # Tailwind v4 tokens + Geist + entrance keyframes
```

Contributor and architecture notes live in [AGENTS.md](./AGENTS.md).
