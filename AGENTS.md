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
- **@react-three/postprocessing** (Torus Bloom), **d3-force-3d** (Torus layout; rendering is
  our own instanced meshes + GLSL, `scenes/torus-graph.ts`)
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
- `bun run gallery [--force|--prune]` — encode `gallery-originals/` into the gallery (see
  "Adding gallery images")
- `bun run posters [slug…]` — re-capture card posters + OG images into `public/posters/`
  (headless system Chrome via playwright-core; uses/starts the dev server, override with
  `BASE_URL=…`). Re-run after changing a scene's look or adding a project. Any new
  `position: fixed` overlay must carry `data-poster-hide`, or it gets baked into posters.
- `bun run cold-start [--runs N] [--headed] [--dir …|--url …]` — measures a first-ever
  visit (fresh Chrome profile, shaders made unique per run so the macOS Metal cache can't
  help): screen stalls, long tasks, GPU-process time, LCP, entrance end, scene-ready
  times. Serves `dist/client` (build first). Run it before/after anything that touches
  scene start-up; a normal reload or incognito window does **not** reproduce a first visit.

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
    masonry.tsx              Motion port of reactbits' GSAP masonry (same props); square images
                             are grouped 2×2 into one tile slot
    lightbox.tsx             full view; shares the tile's layoutId; Esc/backdrop/back close
  components/error-boundary.tsx  tiny boundary: scene → poster stays; writeup → message
  components/canvas/
    scene-canvas.tsx         a card's own <Canvas> (lazy default export): frameloop
                             ("never" until warm, then from `paused`), bg color,
                             MatchContainerSize, Prewarm (setups → precompile → drawInSteps →
                             first frame → onReady)
    precompile.ts            first-visit shader work off the critical path: `precompile` (dry
                             frame: every draw's program created under its exact state, links
                             awaited), `drawInSteps` (first draws a few per frame, under the
                             poster), `beforeFirstFrame` + `prefilteredEnvironment` (PMREM)
    scene-controls.tsx       open-card orbit controls + camera return on close
    scenes/registry.ts       slug → { lazy Scene, background, canvas opts, orbit limits };
                             posterUrl/ogImageUrl.
                             No runtime three imports (read by the entry bundle).
    scenes/*-scene.tsx       scene content only (meshes/lights/camera/effects), default export
    scenes/torus-graph.ts    Torus graph: d3 sim → 4 InstancedMesh (node shapes) + 1 LineSegments
                             + 1 Points; fresnel nodes, link pulses and depth fade in GLSL
    scenes/statue-light.tsx  statue's lit air (quarter-res ray march through the spot cone,
                             reads its VSM shadow map) + dust motes lit only in the beam
    scenes/film-grade.tsx    vignette + grain as one multiply-blended full-screen triangle
    scenes/midgard-*.ts(x)   night storm: `storm` (strike scheduler, flash envelopes, bolts, sky),
                             `sea` (swell + SwellBody rocking), `weather`
                             (rain, embers, flames; one draw each), `scene` (lights, glass
                             water with the transmission pass at half resolution, composer)
    scenes/ftm-scene.tsx     painted diorama: unlit glTF materials drawn as authored
                             (`toneMapped = false`, no lights), sky dome that follows the
                             camera, half-res DepthOfField (depthless translucent monster
                             blurs like the sky)
    scenes/match-container-size.tsx  per-frame canvas resize (Motion layout transforms)
  content/
    schema.ts                Zod frontmatter (name, description, date, accent, tags, links)
    index.ts                 eager `?frontmatter` glob (no MDX bodies in the entry) + lazy body
                             chunks via `loadBody()` (cached; read with React `use()`)
    projects/*.mdx           one file per project; filename = slug
    gallery.ts               glob of gallery/ → items (id, full src, thumb, size, alt, caption)
    gallery/                 generated WebP (full + thumbs/), from gallery-originals/
  lib/                       use-in-view, use-device (pointer/reduced-motion), use-mounted,
                             fly-in (the site entrance: blur-rise helpers), scroll-memory,
                             scene-queue (scene start-ups: one at a time, after the entrance),
                             graph-data (seeded synthetic Torus graph), site (SITE_URL for
                             absolute OG/canonical URLs), cn
scripts/capture-posters.ts   `bun run posters`
scripts/gallery.ts           `bun run gallery` (originals → WebP full + thumb, via system Chrome)
scripts/cold-start.ts        `bun run cold-start` (first-visit benchmark, see Commands)
vite-plugins/mdx-frontmatter.ts  `import fm from "./x.mdx?frontmatter"` → frontmatter object only
vite-plugins/image-size.ts   `import s from "./x.png?size"` → { width, height } (header parse,
                             no deps; PNG/JPEG+EXIF/WebP/GIF/AVIF)
public/
  posters/<slug>.webp        card cover; <slug>-og.jpg = 1200×630 og:image
  midgard.glb                "Thor and the Midgard Serpent" by MrEmjeR, **CC BY 4.0: keep the
                             credit** (writeup links + scene file header). Flattened to named
                             world-space parts (ship, rock, serpent, eyes, boat1, boat2, water)
  ftm.glb                    "Ftm" by luyssport, **CC BY-NC-SA 4.0: keep the credit, and the
                             model stays non-commercial and under the same license**. Named
                             world-space parts; textures WebP (12.3 MB original → 1.27 MB)
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
  and any scene may use post-processing or shadows. Always `dpr={[1, 1.5]}`;
  `pointerEvents: "none"` except on the open card, which orbits (`scene-controls.tsx`:
  drei OrbitControls around the origin, no pan, per-scene limits in the registry; plain
  wheel scrolls the page, ⌘/Ctrl or pinch zooms; the camera eases home on close). Every
  scene must frame its camera on the origin. (A shared canvas + drei `<View>` was used until Sep 2026 and
  removed: two of the scenes needed their own canvas anyway, and it cost a
  full-viewport 60fps render, three.js in the entry bundle, scroll lag, and several
  workarounds. Revisit only if the list becomes a grid of many small live scenes.)
- **3D never enters the entry bundle.** `SceneCanvas` is `lazy()`-imported by the card,
  scenes are `lazy()` in the registry, and `registry.ts` must stay free of runtime
  three/R3F/drei imports (type-only is fine).
- **IntersectionObserver** (`use-in-view.ts`) drives `far`/`near`/`visible`:
  `visible` → `frameloop="always"`; `near` → mounted, `frameloop="demand"` (not
  `"never"`: see the delta gotcha below), shaders compiled + one frame drawn; `far` →
  unmounted (context freed). Hysteresis: mount at 150% viewport margin, unmount only
  past 300%. **Never set React state on scroll events.**
- **Live gate** (`project-card.tsx`): a card *wants* its scene when client-mounted + not
  reduced-motion + (card open, or fine pointer + not `far`); the canvas mounts when the
  **start queue** (`lib/scene-queue.ts`) grants it: never while an entrance (`fly-*`
  CSS animation) is playing, one scene at a time (each holds the slot until `onReady` or
  failure), open card first, then visible cards, then near ones, in list order. Starting
  a scene (context, shader links, first draws) runs in Chrome's GPU process, which also
  draws the page: on a first visit, scenes starting under the fly-in froze the whole page
  (compositor animations too) for seconds. Cards on screen `preloadScene()` at mount (JS +
  model download in parallel with the fly-in); cards further down only when granted. The
  poster (scene-bg color + `posters/<slug>.webp`) sits above the canvas and fades only
  after `onReady` (first frame drawn), so there's never a blank frame.
- **Prewarm** (`scene-canvas.tsx` + `precompile.ts`): the canvas stays on
  `frameloop="never"` until warm (R3F would otherwise draw the scene as it commits, and
  that draw waits for every shader link on the main thread). Prewarm waits for the
  scene's `beforeFirstFrame` setups and two frames (react-postprocessing builds its
  composer an effect later), runs a dry frame (`precompile`), then real first draws a
  few per frame (`drawInSteps`), then the full frame → `onReady`. Advance with
  `advance(clock.elapsedTime)` under "never" (a zero step). Anything a frame's programs
  depend on (an environment map) must be in place before the dry frame: build it in a
  layout effect via `beforeFirstFrame(gl, prefilteredEnvironment(…).then(…))`.
- Honor `prefers-reduced-motion` (poster only, no live scene).
- Mobile (coarse pointer): list shows posters; the live scene mounts on open.
- R3F resets `clock.elapsedTime` when `frameloop` changes (pause/resume). Animate with
  `delta` or your own accumulated time (see `statue-scene.tsx`), not `clock.elapsedTime`.
  `SceneCanvas` clamps `delta` to 0.1 s: a hidden tab otherwise hands the next frame the
  whole absence, and a shader clock in the tens of thousands of seconds is float32-coarse
  (rain and link pulses stepped at a few fps). Under `frameloop="never"` R3F takes a
  pending-invalidate frame's delta from the rAF timestamp (ms), bypassing the clamp and
  jumping clocks by the page's age; paused cards use `"demand"` instead.

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
  the whole animation onto the main thread, where main-thread work would stall it. (The
  compositor isn't immune either: GPU-process work stalls it, hence the start queue.) Keyframes define only the start state, so nothing lingers (a leftover
  `blur(0px)` would keep a filter layer over live canvases). Don't reintroduce
  JS-driven (Motion `x`/`y`) entrances.

**Planned, not yet implemented:** light/dark toggle (forced dark for now).

## Adding a project

1. `src/content/projects/<slug>.mdx` with frontmatter matching `content/schema.ts`.
2. Scene: `scenes/<slug>-scene.tsx` (default export, content only — post-processing
   like `<EffectComposer>` goes inside the scene) → add to `registry.ts` with its
   `background` and any `canvas` options (`shadows`, `camera`). Environment maps and
   other one-off GPU setup go through `beforeFirstFrame` (see Prewarm).
3. If the scene pulls a new lazily-imported 3D dep, add it to `optimizeDeps.include`
   in `vite.config.ts` (see gotchas).
4. `bun run posters <slug>` to generate its cover + OG image.
5. `bun run build && bun run cold-start`: no new stalls during the entrance, and the
   scene's own start-up short (see the first-visit gotcha).

## Writing the copy

Short and interesting beats complete. Sidebar and writeups:
- Plain, first person, no marketing words (passionate, innovative, seamless, robust…).
- Scene writeups: what the viewer is looking at, one line on where it came from, the problem it
  solved (`## The idea`: why it exists, not just what the shapes are), and the real engineering
  (`## Under the hood`: bold-led bullets, one trick each, with numbers where measured). Short
  paragraphs under three light headings: `## Overview`, `## The idea`, `## Under the hood`;
  ~250–400 words when there's that much real work to tell.
  No "my part"/team-credit sections: the scene on the site is the thing being described.
- Facts only from the profile source of truth in ed-kb (`~/Developer/ed-kb/kb/profile/original.md`; the KB links this repo as `repos/portfolio`) or this repo.
- Never put the phone number or other private contact details in the repo.

## Adding gallery images

1. Drop originals (any size; png/jpg/webp/avif/gif) into `gallery-originals/` (gitignored:
   full-size files stay off the public repo and out of the deploy), named `NNN-project-what.png`,
   e.g. `045-torus-bridge.png`. The number sets the order (they go up in 10s, so a new image
   slots in between) and is **not** part of the id, so reorder freely: the id (`torus-bridge`,
   the `?image=` URL people share) stays. Ids must be unique. Every file there is published,
   thin strips included (subfolders are ignored).
2. `bun run gallery` → `src/content/gallery/NN-project-what.webp` (lightbox, ≤ 2400px) and
   `thumbs/…webp` (grid, ≤ 1000px wide). Only new/changed originals are re-encoded; renaming or
   deleting an original leaves an orphan that `bun run gallery --prune` removes.
3. Add alt text + caption for the id in `details` in `src/content/gallery.ts` (the fallback alt,
   the humanized id, is not good alt text). Commit the webp files.

## Hard-won gotchas (don't rediscover these)

- **First visits are a different site.** A program's link (and on Metal its first use
  and first draw) costs 0.1–1.9 s per scene on a cold shader cache, ~nothing on a warm
  one. Chrome keeps compiled shaders per profile *and* macOS keeps a per-app Metal cache,
  so reloads, cleared caches and incognito all look fine; only a new browser (or
  `bun run cold-start`) shows it. Measured before the start queue + prewarm (Oct 2026):
  1.7–2.7 s of frozen screen and LCP pushed to 1.3–1.8 s.
- **`compileAsync` isn't a prewarm on its own:** it compiles the scene graph under the
  screen's state, so composer passes, shadow maps, transmission, custom passes and PMREM
  were missed, and scene materials a composer draws into a render target got the wrong
  key (compiled twice). Materials also change *between draws of one frame* (three's shadow
  pass reuses one depth material, flipping `side` per object) and draws with no scene
  (shadow pass) are unfogged. `precompile` handles all of this by creating each program
  at its draw; check `gl.info.programs` before/after the first real frame if a scene
  starts stalling again (any new program there was missed).

- **Under an EffectComposer, set tone mapping yourself**: the composer forces
  `NoToneMapping`, and postprocessing's `<ToneMapping>` defaults to **AgX**; write
  `mode={ToneMappingMode.ACES_FILMIC}` for R3F's usual look.
- **Nested `<group>`s reset transparent draw order**: three sorts transparent objects by the
  nearest Group's `renderOrder`, and every nested group (even at 0) overrides it. Set a layer's
  order on the group directly around its meshes (`<group renderOrder={3}>`), not on the meshes
  or an outer wrapper.
- **drei `<Cloud>` reads `clock.elapsedTime`** (which resets on pause) only for `growth`; use
  `growth={0}`. Its default texture is on a CDN: pass `texture="/cloud.png"`.
- **Don't mount/unmount lights or toggle `visible` for effects that come and go** (lightning):
  a light-count change recompiles every lit material, and a hidden mesh's shader first
  compiles when shown (a hitch). Drive intensity to 0, clip vertices in the shader instead.
- **Posters of changing scenes**: `bun run posters` sets `window.__posterCapture`; a scene may
  read it to hold a representative frame (Midgard freezes on a lightning strike).

- **An EffectComposer changes the grade.** It renders without the renderer's tone mapping and
  applies fog in linear space (three normally tone-maps each material, then fogs in display
  space): the statue got brighter and its clouds vanished. Scenes that don't need Bloom render
  straight to the canvas and use `<FilmGrade>` for grain/vignette; the statue's light
  scattering is its own low-res pass + depth-tested composite, not a composer effect.
- **Don't dispose imperatively built three objects in a `useEffect` cleanup** of a `useMemo`
  owner: StrictMode's dev double-mount runs the cleanup on live objects and frees programs
  mid-`compileAsync` (`glGetProgramiv: Program object expected` warnings). A scene unmounts only
  with its canvas, which drops the whole WebGL context anyway.
- **Measure GPU cost with timer queries, not fps.** Uncapped-fps and even best-of-N runs swung
  ±50% here (other GPU work on the machine); `EXT_disjoint_timer_query_webgl2` around each
  frame's draws, alternating A/B runs and keeping the lowest median, was stable to ~0.05ms.

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
