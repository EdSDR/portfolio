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
  Geist via `@fontsource-variable/geist` (self-hosted)

## Commands (use Bun)

- `bun run dev` — dev server on :3000
- `bun run build` — production build + static prerender
- `bunx tsc --noEmit` — typecheck
- `bunx biome check --write src` — lint + format (also `bun run check|lint|format`)
- `bun run deploy` — build + `wrangler deploy`

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
  routes/__root.tsx          html shell (forced `dark` class), devtools, renders <AppShell>
  routes/index.tsx           home (list is in the shell, route renders nothing)
  routes/work.$slug.tsx      URL + loader (notFound) + head/OG meta only; component → null
  components/layout/
    app-shell.tsx            persistent shell: shared <SceneCanvas>, sidebar, <ProjectList>,
                             eventSource root ref, MotionConfig reducedMotion="user"
    sidebar.tsx              bio/links (copy is hand-edited by the user)
    fade.tsx                 top/bottom viewport fade strips
  components/project/
    project-list.tsx         reads slug param; filters to the active card; scroll restore
    project-card.tsx         card: in-view state, live gate, cover crossfade, corner mask,
                             Motion `layout` expand, renders <ProjectDetail> when active
    project-detail.tsx       meta + lazy MDX body under the expanded hero
  components/canvas/
    scene-canvas.tsx         the ONE shared fixed <Canvas> + <View.Port/>
    card-view.tsx            dispatch: dedicated canvas vs shared drei <View>
    scenes/registry.ts       slug → lazy shared-View scene (polaris, smoothui)
    scenes/dedicated.tsx     slug → lazy dedicated canvas (torus, governance) + sceneBackground
    scenes/*-scene.tsx       scene content only (meshes/lights/camera)
    scenes/*-canvas.tsx      dedicated <Canvas> wrappers (torus → Bloom, statue → shadows/fog)
    scenes/match-container-size.tsx  per-frame canvas resize for dedicated canvases
  content/
    schema.ts                Zod frontmatter (name, description, date, accent, tags, links)
    index.ts                 eager frontmatter glob + lazy body glob; sorted by date desc
    projects/*.mdx           one file per project; filename = slug
  lib/                       use-in-view, use-device (pointer/reduced-motion), use-mounted,
                             entrance (first-load stagger flag), scroll-memory, motion
                             variants, graph-data (seeded synthetic Torus graph), cn
public/themis.glb            Draco-compressed statue (mesh node `themis`, scale 0.06)
```

## Architecture invariants (do not break)

- **Scenes never live inside a route component.** Route components own only URL +
  loader + head/OG meta. The list, cards, and all canvases live in the persistent
  shell above `<Outlet/>` — that's what prevents WebGL/clock resets on navigation.
- **Expanded state is the route.** `ProjectList` reads the `slug` param; the active card
  expands in place via Motion `layout` (others exit via `AnimatePresence`). Back button
  closes; home scroll position is restored on close. Every `/work/$slug` is prerendered.
- **Two render paths for a card scene** (`card-view.tsx`):
  1. **Shared (default):** one fixed `<Canvas>` in the shell (`pointer-events:none`,
     `eventSource` = app-root ref, `dpr={[1, 1.5]}`), one drei `<View>` per live card.
     Register in `scenes/registry.ts`. Never add another shared canvas.
  2. **Dedicated:** only when a scene needs what the scissored View pass can't do —
     **post-processing** or **shadows/fog**. Register in `scenes/dedicated.tsx` with a
     matching `sceneBackground` color, include `<MatchContainerSize />`, keep
     `dpr={[1, 1.5]}` and `pointerEvents: "none"`. Mounted only while the card is live.
- **IntersectionObserver** (`use-in-view.ts`) drives discrete `far`/`near`/`visible`
  states; `far` unmounts the scene. **Never set React state on scroll events.**
- **Live gate** (`project-card.tsx`): scene mounts only when sized + client-mounted +
  not reduced-motion + (fine pointer or card open). Shared-View scenes also wait for the
  first-load entrance to finish. Until live, a solid cover in the scene's bg color is
  shown, then crossfades out.
- Honor `prefers-reduced-motion` (no live scene; cover only).
- Mobile/low-power (coarse pointer): list shows the static cover; the live scene mounts
  on open.

**Planned, not yet implemented** (original spec — don't assume these exist):
`frameloop="demand"` on the shared canvas; pausing `near` scenes via `<Activity>` and
prewarming with `gl.compileAsync` (today `near` and `visible` both just mount); real
poster images instead of the solid cover; light/dark toggle (forced dark for now).

## Adding a project

1. `src/content/projects/<slug>.mdx` with frontmatter matching `content/schema.ts`.
2. Scene: `scenes/<slug>-scene.tsx` (default export, content only) → `registry.ts`;
   or, if it needs post/shadows, `scenes/<name>-canvas.tsx` → `dedicated.tsx` +
   `sceneBackground`.
3. If the scene pulls a new lazily-imported 3D dep, add it to `optimizeDeps.include`
   in `vite.config.ts` (see gotchas).

## Hard-won gotchas (don't rediscover these)

- **drei `<View>` in DOM mode ignores `track`** and renders/tracks its own element.
  Style the View itself: `<View className="absolute inset-0 block h-full w-full">`.
  (track mode gave a 0-height portal → blank scenes.) The card also waits for a
  non-zero height (`sized`) before mounting the View.
- **Dedicated canvases need `MatchContainerSize`** — R3F's ResizeObserver misses Motion
  layout-transform size changes (black bar on close). Don't "fix" resize lag with a
  constant-aspect hack; that was rejected.
- **drei `<SoftShadows>` is broken on three 0.186** (PCSS GLSL uses removed
  `unpackRGBAToDepth`/`vogelDiskSample`; `PCFSoftShadowMap` removed). Symptom: material
  shader fails to compile (`useProgram: program not valid`) and the mesh silently isn't
  drawn. The statue uses `shadows={{ type: THREE.VSMShadowMap }}` + `shadow-radius` /
  `shadow-blurSamples` instead.
- **Vite "Invalid hook call / useState null" in dev** = dep re-optimization loaded two
  React copies. Pre-bundle lazy deps in `vite.config.ts` `optimizeDeps.include`, then
  restart dev.
- Shared-View scenes render on the fixed canvas and can't fade with DOM, hence the
  entrance hold + cover crossfade in `project-card.tsx`. Dedicated canvases are DOM
  children and fade with the card.

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
