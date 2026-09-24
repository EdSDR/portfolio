# AGENTS.md

Portfolio site for **Ed Castro (EdSDR)**: a sticky bio sidebar (left ~1/4) beside a
page-scrolling list of project cards (right ~3/4). Each card's hero is a **live React
Three Fiber scene**; clicking a card expands it in place into a route (`/work/$slug`)
with the scene on top and an MDX writeup below. Visual reference (structure/type/color
only, not code) lives in `.plan/` (gitignored): `ui-reference.png`, `ui-reference-repo/`,
and `torus-ts/` (the real Torus codebase, reference for the Torus scene).

## Stack

- **TanStack Start** (Vite plugin, not Vinxi) + **React 19.2** + **TypeScript 6**
- **Cloudflare Workers** via `@cloudflare/vite-plugin`; static prerender enabled
  (`crawlLinks` discovers each `/work/$slug` from `/`)
- **R3F v9** + **drei 10** (WebGL — never the Fiber v10 alpha) + **three 0.186**
- **@react-three/postprocessing** (Bloom), **r3f-forcegraph** (Torus graph)
- **Motion** (`motion/react`) for all transitions
- **MDX** compiled at build via `@mdx-js/rollup` + `remark-frontmatter` +
  `remark-mdx-frontmatter`; frontmatter validated with **Zod 4**
- **Tailwind v4** (CSS-first, tokens in `src/styles.css`), **Biome**, **Bun**,
  Geist via `@fontsource-variable/geist` (self-hosted, latin face preloaded)

## Commands (use Bun)

- `bun run dev` — dev server on :3000
- `bun run build` — production build + static prerender
- `bunx tsc --noEmit` — typecheck
- `bunx biome check --write src` — lint + format (also `bun run check|lint|format`)
- `bun run deploy` — build + `wrangler deploy`
- `bun run posters [slug…]` — re-capture card posters + OG images into `public/posters/`
  (headless system Chrome via playwright-core; uses/starts the dev server). Re-run
  after changing a scene's look or adding a project.

Before handing work back: run `bunx tsc --noEmit` and `bunx biome check --write src`.

## Conventions

- **Files & folders: kebab-case** (`project-card.tsx`, `use-in-view.ts`).
  **Exported React component identifier: PascalCase** derived from the file
  (`project-card.tsx` → `ProjectCard`). Lazy-loaded scene modules use a default export.
- Path aliases: `#/*` and `@/*` both map to `src/*`.
- Biome formats: tabs, double quotes, organize-imports on save.
- Comments explain *why* (a constraint, a bug that was hit) — match the existing density.

## Project map

```
src/
  routes/__root.tsx          html shell (forced `dark` class), default/OG meta, font preload,
                             devtools, renders <AppShell>
  routes/index.tsx           home (list is in the shell, route renders nothing)
  routes/work.$slug.tsx      URL + loader (notFound, prefetches MDX body) + head/OG/canonical;
                             component → null
  components/layout/
    app-shell.tsx            persistent shell: sidebar + <ProjectList>, MotionConfig
                             reducedMotion="user"
    sidebar.tsx              bio/links (copy is hand-edited by the user)
    fade.tsx                 top/bottom viewport fade strips
  components/project/
    project-list.tsx         reads slug param; filters to the active card; scroll restore
    project-card.tsx         card: in-view state, live gate, poster crossfade, lazy
                             <SceneCanvas>, Motion `layout` expand, <ProjectDetail> when active
    project-detail.tsx       meta + lazy MDX body under the expanded hero
  components/canvas/
    scene-canvas.tsx         a card's own <Canvas> (lazy default export): frameloop from
                             `paused`, bg color, MatchContainerSize, Prewarm (compileAsync →
                             first frame → onReady)
    scenes/registry.ts       slug → { lazy Scene, background, canvas opts }; posterUrl/ogImageUrl.
                             No runtime three imports (read by the entry bundle).
    scenes/*-scene.tsx       scene content only (meshes/lights/camera/effects), default export
    scenes/match-container-size.tsx  per-frame canvas resize (Motion layout transforms)
  content/
    schema.ts                Zod frontmatter (name, description, date, accent, tags, links)
    index.ts                 eager frontmatter glob + lazy body glob; sorted by date desc
    projects/*.mdx           one file per project; filename = slug
  lib/                       use-in-view, use-device (pointer/reduced-motion), use-mounted,
                             entrance (first-load stagger flag), scroll-memory, motion
                             variants, graph-data (seeded synthetic Torus graph), site
                             (SITE_URL for absolute OG/canonical URLs), cn
scripts/capture-posters.ts   `bun run posters`
public/
  posters/<slug>.webp        card cover; <slug>-og.jpg = 1200×630 og:image
  themis.glb                 Draco-compressed statue (mesh node `themis`, scale 0.06)
  draco/                     self-hosted Draco decoder (copied from three/examples)
  avatar.png                 sidebar avatar (self-hosted, 96px)
```

## Architecture invariants (do not break)

- **Scenes never live inside a route component.** Route components own only URL +
  loader + head/OG meta. The list, cards, and all canvases live in the persistent
  shell above `<Outlet/>` — that's what prevents WebGL/clock resets on navigation.
- **Expanded state is the route.** `ProjectList` reads the `slug` param; the active card
  expands in place via Motion `layout` (others exit via `AnimatePresence`). Back button
  closes; home scroll position is restored on close. Every `/work/$slug` is prerendered.
- **One `<Canvas>` per live card** (`scene-canvas.tsx`), never a shared/fixed canvas.
  The scene is a normal DOM child of the card: it scrolls, clips and fades with it,
  and any scene may use post-processing or shadows. Always `dpr={[1, 1.5]}`,
  `pointerEvents: "none"`. (A shared canvas + drei `<View>` was used until Sep 2026 and
  removed: two of the scenes needed their own canvas anyway, and it cost a
  full-viewport 60fps render, three.js in the entry bundle, scroll lag, and several
  workarounds. Revisit only if the list becomes a grid of many small live scenes.)
- **3D never enters the entry bundle.** `SceneCanvas` is `lazy()`-imported by the card,
  scenes are `lazy()` in the registry, and `registry.ts` must stay free of runtime
  three/R3F/drei imports (type-only is fine).
- **IntersectionObserver** (`use-in-view.ts`) drives `far`/`near`/`visible`:
  `visible` → `frameloop="always"`; `near` → mounted, `frameloop="never"`, shaders
  compiled + one frame drawn; `far` → unmounted (context freed). Hysteresis: mount at
  150% viewport margin, unmount only past 300%. **Never set React state on scroll events.**
- **Live gate** (`project-card.tsx`): canvas mounts when client-mounted + not
  reduced-motion + (card open, or fine pointer + not `far` + first-load entrance done).
  The poster (scene-bg color + `posters/<slug>.webp`) sits above the canvas and fades
  only after `onReady` (first frame drawn), so there's never a blank frame.
- Honor `prefers-reduced-motion` (poster only, no live scene).
- Mobile (coarse pointer): list shows posters; the live scene mounts on open.
- R3F resets `clock.elapsedTime` when `frameloop` changes (pause/resume). Animate with
  `delta` or your own accumulated time (see `statue-scene.tsx`), not `clock.elapsedTime`.

**Planned, not yet implemented:** light/dark toggle (forced dark for now).

## Adding a project

1. `src/content/projects/<slug>.mdx` with frontmatter matching `content/schema.ts`.
2. Scene: `scenes/<slug>-scene.tsx` (default export, content only — post-processing
   like `<EffectComposer>` goes inside the scene) → add to `registry.ts` with its
   `background` and any `canvas` options (`shadows`, `camera`).
3. If the scene pulls a new lazily-imported 3D dep, add it to `optimizeDeps.include`
   in `vite.config.ts` (see gotchas).
4. `bun run posters <slug>` to generate its cover + OG image.

## Hard-won gotchas (don't rediscover these)

- **Every canvas needs `MatchContainerSize`** (built into `SceneCanvas`) — R3F's
  ResizeObserver misses Motion layout-transform size changes (black bar on close).
  Don't "fix" resize lag with a constant-aspect hack; that was rejected.
- **drei `<SoftShadows>` is broken on three 0.186** (PCSS GLSL uses removed
  `unpackRGBAToDepth`/`vogelDiskSample`; `PCFSoftShadowMap` removed). Symptom: material
  shader fails to compile (`useProgram: program not valid`) and the mesh silently isn't
  drawn. The statue uses VSM (`shadows: "variance"` in the registry) + `shadow-radius` /
  `shadow-blurSamples` instead.
- `useGLTF` must get the self-hosted decoder path (`useGLTF(url, "/draco/")`), else
  drei fetches Draco from gstatic.com at runtime.
- **Vite "Invalid hook call / useState null" in dev** = dep re-optimization loaded two
  React copies. Pre-bundle lazy deps in `vite.config.ts` `optimizeDeps.include`, then
  restart dev.

## Repo hygiene

- Public repo. `resume.md` (root) is **gitignored and contains private contact details** —
  never commit it or copy its phone/contact info into source.
- `.plan/`, `dev.log`, `dist/` are gitignored.

## Skills

Installed in `.claude/skills/` (committed, auto-discovered by the agent):

- **TanStack:** `tanstack-start`, `tanstack-router`
- **R3F / three.js:** `r3f-fundamentals`, `r3f-animation`, `r3f-shaders`,
  `r3f-postprocessing`, `threejs-fundamentals` — target Fiber 9 / React 19; do
  **not** adopt Fiber 10 alpha APIs.
- **Motion:** `motion-react` (the `motion` package / `motion/react` import)
- **Validation:** `zod`

For the most current, **version-matched** TanStack API details, prefer Intent
over the static snapshot above:

- `npx -y @tanstack/intent list`
- `npx -y @tanstack/intent load <package>#<skill>` — e.g.
  `@tanstack/router-core#router-core/path-params`,
  `@tanstack/start-client-core#start-core/ssr`

Not installed as repo skills (use ambient/session skills or docs instead):
**Cloudflare/Workers/Wrangler** (ambient `cloudflare`, `workers-best-practices`,
`wrangler`), **Tailwind v4** (registry skills are v3-era; our setup is CSS-first
in `src/styles.css`), **MDX** (build plugin only; configured in `vite.config.ts`).
