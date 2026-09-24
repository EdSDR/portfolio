# AGENTS.md

Portfolio site: a sticky bio sidebar (left ~1/4) beside a page-scrolling list of
project cards (right ~3/4). Each card's hero is a **live React Three Fiber scene**;
clicking a card expands it into a route (`/work/$slug`) with the scene on top and an
MDX writeup below. Visual reference (structure/type/color only, not code) lives in
`.plan/` (gitignored).

## Stack

- **TanStack Start** (Vite plugin, not Vinxi) + **React 19.2** + **TypeScript 6**
- **Cloudflare Workers** via `@cloudflare/vite-plugin`; static prerender enabled
- **R3F v9** (`@react-three/fiber@9`) + **drei** (WebGL — never the v10 alpha) + **three**
- **Motion** (`motion/react`) for all transitions
- **MDX** compiled at build via `@mdx-js/rollup` + `remark-frontmatter` +
  `remark-mdx-frontmatter`; frontmatter validated with **Zod**
- **Tailwind v4** (CSS-first, tokens in `src/styles.css`), **Biome**, **Bun**

## Commands (use Bun)

- `bun run dev` — dev server on :3000
- `bun run build` — production build + static prerender
- `bun run check` / `bun run lint` / `bun run format` — Biome
- `bunx tsc --noEmit` — typecheck
- `bun run deploy` — build + `wrangler deploy`

## Conventions

- **Files & folders: kebab-case** (`project-card.tsx`, `use-in-view.ts`).
  **Exported React component identifier: PascalCase** derived from the file
  (`project-card.tsx` → `ProjectCard`).
- Path aliases: `#/*` and `@/*` both map to `src/*`.
- Biome formats: tabs, double quotes, organize-imports on save.

## Architecture invariants (do not break)

- **One fixed `<Canvas>`**, mounted once in the persistent shell **above `<Outlet/>`**
  (owned by `__root`), `pointer-events:none`, `eventSource` = app-root ref,
  `frameloop="demand"`, `dpr={[1, 1.5]}`. Never mount a second Canvas.
- **One drei `<View track={ref}>` per visible card**; the scene follows the tracked
  DOM rect (incl. Motion layout animations).
- **Scenes never live inside a route component.** Route components (`work.$slug.tsx`)
  own only URL + loader + head/OG meta + the lazy MDX body. Keeping the Canvas/scenes
  above the router is what prevents WebGL/clock resets on navigation.
- **IntersectionObserver** drives discrete `far`/`near`/`visible` states
  (far = View unmounted; near = mounted + paused via `<Activity>` + `gl.compileAsync`
  prewarm; visible = animating). **Never set React state on scroll events.**
- Expanded state **is the route**; back button closes. Prerender each `/work/$slug`.
- Honor `prefers-reduced-motion` (static frame / poster, no scene animation).
- Mobile/low-power: list shows a static poster; the live scene mounts on open.

## Skills

On-demand TanStack docs (current APIs — prefer these over memory):

- `npx -y @tanstack/intent list` — list available package skills
- `npx -y @tanstack/intent load <package>#<skill>` — load one, e.g.
  `@tanstack/router-core#router-core/path-params`,
  `@tanstack/start-client-core#start-core/ssr`,
  `@tanstack/react-start#react-start`

Installed R3F / three.js skills (in `.claude/skills/`, auto-discovered):
`r3f-fundamentals`, `r3f-animation`, `r3f-shaders`, `r3f-postprocessing`,
`threejs-fundamentals`. They target Fiber 9 / React 19 — match the installed
versions; do not adopt Fiber 10 alpha APIs.
