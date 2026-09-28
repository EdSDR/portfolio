# AGENTS.md

Portfolio site for **Ed Castro (EdSDR)**: a sticky bio sidebar (left ~1/4) beside a
page-scrolling content column (right ~3/4) with two tabs: **Scenes** (project cards)
and **Gallery** (a masonry of still images with a lightbox). Each card's hero is a **live React
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
- **MDX** compiled at build via `@mdx-js/rollup` + `remark-frontmatter`; frontmatter read
  by `vite-plugins/mdx-frontmatter.ts` and validated with **Zod 4** at build time (zod
  never ships to the client)
- **Tailwind v4** (CSS-first, tokens in `src/styles.css`), **Biome**, **Bun**,
  Geist via `@fontsource-variable/geist` (self-hosted, latin face preloaded)

## Commands (use Bun)

- `bun run dev` — dev server on :3000
- `bun run build` — production build + static prerender (+ sitemap.xml)
- `bun run typecheck` — `tsc --noEmit`
- `bun run fix` — Biome lint + format, applying fixes (`check`/`lint`/`format` only report)
- `bun run deploy` — build + `wrangler deploy`
- `bun run posters [slug…]` — re-capture card posters + OG images into `public/posters/`
  (headless system Chrome via playwright-core; uses/starts the dev server, override with
  `BASE_URL=…`). Re-run after changing a scene's look or adding a project. Any new
  `position: fixed` overlay must carry `data-poster-hide`, or it gets baked into posters.

Before handing work back: `bun run typecheck` and `bunx biome ci` (what CI runs, plus
`bun run build`; `.github/workflows/ci.yml`). Formatting-only commits go in
`.git-blame-ignore-revs`.

## Conventions

- **Files & folders: kebab-case** (`project-card.tsx`, `use-in-view.ts`).
  **Exported React component identifier: PascalCase** derived from the file
  (`project-card.tsx` → `ProjectCard`). Lazy-loaded scene modules use a default export.
- Path alias: `@/*` maps to `src/*`.
- Biome formats: tabs, double quotes, organize-imports on save.
- Comments explain *why* (a constraint, a bug that was hit) — match the existing density.

## Project map

```
src/
  routes/__root.tsx          html shell (forced `dark` class), default/OG meta, font preload,
                             devtools, renders <AppShell>
  routes/index.tsx           home / Scenes tab (list is in the shell, route renders nothing)
  routes/$.tsx               catch-all: throws notFound() (404) → shell shows <NotFound/>
  routes/gallery.tsx         Gallery tab; `?image=<id>` = open lightbox (typed validateSearch)
  routes/work.$slug.tsx      URL + loader (notFound, prefetches MDX body) + head/OG/canonical;
                             no component (routes render nothing; the shell owns the UI)
  components/layout/
    app-shell.tsx            persistent shell: sidebar, <ViewTabs>, and the active view
                             (<ProjectList> or <GalleryView>, by pathname); MotionConfig
                             reducedMotion="user"
    error-view.tsx           route-error view (reload) + router defaultErrorComponent
    not-found.tsx            404 view (shell renders it when any match has status "notFound")
    view-tabs.tsx            Scenes/Gallery pill, absolute top-right of <main>, sliding
                             indicator (layoutId)
    sidebar.tsx              bio/links (copy is hand-edited by the user)
    fade.tsx                 top/bottom viewport fade strips
  components/project/
    project-list.tsx         reads slug param; filters to the active card; scroll restore
    project-card.tsx         card: in-view state, live gate, poster crossfade, lazy
                             <SceneCanvas>, Motion `layout` expand, <ProjectDetail> when active
    project-detail.tsx       meta + lazy MDX body under the expanded hero
  components/gallery/
    gallery-view.tsx         wires ?image= to the lightbox (open pushes, close pops history)
    masonry.tsx              Motion port of reactbits' GSAP masonry (same props)
    lightbox.tsx             full view; shares the tile's layoutId; Esc/backdrop/back close
  components/error-boundary.tsx  tiny boundary: scene → poster stays; writeup → message
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
    index.ts                 eager `?frontmatter` glob (no MDX bodies in the entry) + lazy body
                             chunks via `loadBody()` (cached; read with React `use()`)
    projects/*.mdx           one file per project; filename = slug
    gallery.ts               glob of gallery/ → items (id, hashed src, size, alt, caption)
    gallery/                 gallery image files (currently placeholder-* crops of posters)
  lib/                       use-in-view, use-device (pointer/reduced-motion), use-mounted,
                             fly-in (the site entrance: blur-rise helpers), scroll-memory,
                             graph-data (seeded synthetic Torus graph), site (SITE_URL for
                             absolute OG/canonical URLs), cn
scripts/capture-posters.ts   `bun run posters`
vite-plugins/mdx-frontmatter.ts  `import fm from "./x.mdx?frontmatter"` → frontmatter object only
vite-plugins/image-size.ts   `import s from "./x.png?size"` → { width, height } (header parse,
                             no deps; PNG/JPEG+EXIF/WebP/GIF/AVIF)
public/
  posters/<slug>.webp        card cover; <slug>-og.jpg = 1200×630 og:image
  themis.glb                 Draco statue, decimated to ~193k tris (mesh node `themis`, scale
                             0.06); keep new models welded + simplified (see git log 82b33e1)
  draco/                     self-hosted Draco decoder (copied from three/examples)
  favicon.svg                site icon
  avatar.webp                sidebar avatar (self-hosted, 96px)
```

## Architecture invariants (do not break)

- **Scenes never live inside a route component.** Route components own only URL +
  loader + head/OG meta. The list, cards, and all canvases live in the persistent
  shell above `<Outlet/>` — that's what prevents WebGL/clock resets on navigation.
- **Expanded state is the route.** `ProjectList` reads the `slug` param; the active card
  expands in place via Motion `layout`; the others unmount in the same commit (no
  `AnimatePresence`, so Motion measures the final layout). Back button closes; home
  scroll position is restored on close. Every `/work/$slug` is prerendered.
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
  reduced-motion + (card open, or fine pointer + not `far`). It does **not** wait for the
  card's fly-in (that runs on the compositor), and the card calls `preloadScene()` at
  mount so three/R3F + the scene chunk download in parallel (no canvas→scene waterfall).
  The poster (scene-bg color + `posters/<slug>.webp`) sits above the canvas and fades
  only after `onReady` (first frame drawn), so there's never a blank frame.
- Honor `prefers-reduced-motion` (poster only, no live scene).
- Mobile (coarse pointer): list shows posters; the live scene mounts on open.
- R3F resets `clock.elapsedTime` when `frameloop` changes (pause/resume). Animate with
  `delta` or your own accumulated time (see `statue-scene.tsx`), not `clock.elapsedTime`.

- **Views are routes.** The shell picks the view from the pathname (`/gallery*` →
  Gallery, else Scenes). Switching tabs unmounts the other view (frees the scenes'
  WebGL contexts) and fades the new one in. The lightbox is the `?image=` search param.

- **One entrance style** (`lib/fly-in.ts` + `.fly-up` in `styles.css`): rise + blur into
  focus, power3.out, staggered. Server-rendered content — sidebar, tabs, scene cards,
  404/error views — uses the CSS `.fly-up` class + `flyUpStyle({ i, … })`: it plays from
  first paint (the first card's poster is the LCP; don't gate it on hydration) and on
  insertion for elements mounted later (tab switch). Gallery tiles use `flyIn()` (Web
  Animations, from just off-screen as each image loads; start hidden via
  `data-fly="pending"`). Cards get the entrance only on the list's first render (page
  load / tab switch), not when re-mounted after a close; entrance values that depend on
  props (index) are pinned at mount — opening a card re-indexes the list.
- **Keep entrances on the compositor.** Motion (opacity + `translate`) and blur are
  separate animations: a blur can't be composited, and one non-composited property drags
  the whole animation onto the main thread, where scene start-up (~150–300ms tasks)
  would stall it. Keyframes define only the start state, so nothing lingers (a leftover
  `blur(0px)` would keep a filter layer over live canvases). Don't reintroduce
  JS-driven (Motion `x`/`y`) entrances.

**Planned, not yet implemented:** light/dark toggle (forced dark for now).

## Adding a project

1. `src/content/projects/<slug>.mdx` with frontmatter matching `content/schema.ts`.
2. Scene: `scenes/<slug>-scene.tsx` (default export, content only — post-processing
   like `<EffectComposer>` goes inside the scene) → add to `registry.ts` with its
   `background` and any `canvas` options (`shadows`, `camera`).
3. If the scene pulls a new lazily-imported 3D dep, add it to `optimizeDeps.include`
   in `vite.config.ts` (see gotchas).
4. `bun run posters <slug>` to generate its cover + OG image.

## Writing the copy

Sidebar and writeups follow `.plan/copy/RESEARCH.md` (gitignored; research + sources). Short version:
- Plain and concise, first person. "I" for my part; name teammates for theirs.
- Facts only from the resume source of truth (`.plan/ed-resume/original.md`) or measured in this
  repo. No invented numbers, no quality adjectives about my own work, no marketing words
  (passionate, innovative, seamless, robust, leverage…), no "not just X but Y".
- Scene writeups: intro → `## The original` → `## My part` → `## How it works` →
  `## The tricky bit` → `## About this recreation`; 450–800 words; say what's recreated or faked.
  Frontmatter `company` + `year` render the meta line under the title.
- Never put the phone number or other private contact details in the repo.

## Adding gallery images

Drop files into `src/content/gallery/` (png/jpg/webp/avif/gif). Order = filename sort
(prefix numbers). Alt text defaults to the humanized filename; override alt / add a
caption in the `details` map in `src/content/gallery.ts`. Delete the `placeholder-*`
files once real images are in.

## Hard-won gotchas (don't rediscover these)

- **Every canvas needs `MatchContainerSize`** (built into `SceneCanvas`) — R3F's
  ResizeObserver misses Motion layout-transform size changes (black bar on close).
  Don't "fix" resize lag with a constant-aspect hack; that was rejected.
- **Motion layout animations use page coordinates.** Opening a card scrolls to the
  top; if that scroll lands after Motion's "before" snapshot, the card starts its
  expand `scrollY` px lower (it "came from below"). The click handler scrolls first
  and holds the columns in place with CSS `translate` (`holdScrollForOpen` in
  `lib/scroll-memory.ts`); the card releases it at commit. The card Link uses
  `resetScroll={false}`. A separate `y` counter-animation doesn't work: Motion holds
  `y` animations while a layout animation runs.
- **Checking what's composited:** record a Chrome trace (categories `blink.animations`,
  `devtools.timeline`); `Animation` events carry `compositeFailed` (4096 = filter may
  move pixels, i.e. blur — expected for the blur half only).
- **Motion skips `layout` animations caused by window resizes** (by design). The
  masonry re-flows on resize, so tiles animate `x`/`y`/`width`/`height` directly.
- **Shared `layoutId` + raised z-index:** a gallery tile is lifted above the lightbox
  backdrop while flying back; it's lowered by a timer, because Motion's
  layout-complete callback doesn't fire when the lightbox opened on page load.
- **drei `<SoftShadows>` is broken on three 0.186** (PCSS GLSL uses removed
  `unpackRGBAToDepth`/`vogelDiskSample`; `PCFSoftShadowMap` removed). Symptom: material
  shader fails to compile (`useProgram: program not valid`) and the mesh silently isn't
  drawn. The statue uses VSM (`shadows: "variance"` in the registry) + `shadow-radius` /
  `shadow-blurSamples` instead.
- `useGLTF` must get the self-hosted decoder path (`useGLTF(url, "/draco/")`), else
  drei fetches Draco from gstatic.com at runtime.
- **Vite "Invalid hook call / useState null" in dev** = dep re-optimization loaded two
  React copies. Pre-bundle lazy deps in `vite.config.ts` `optimizeDeps.include` (nested
  `parent > child` syntax for transitive ones), then restart dev. Check with a cold cache:
  a dev server whose `cacheDir` points at an empty temp dir must start without
  "dependency optimized … reloading".
- **Don't pass `resize={{ scroll: false }}` to the card `<Canvas>`.** R3F's
  scroll-debounced measurement is what defers WebGL creation for re-mounted cards until
  the smooth scroll-back after a close finishes; without it the ~150 ms canvas/scene
  start-up lands mid-collapse and visibly stalls it (measured: long task at ~125 ms vs
  ~490 ms after Back).
- **Changes to `vite-plugins/*` need a dev-server restart** (the running server keeps the
  plugin code it started with).

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
