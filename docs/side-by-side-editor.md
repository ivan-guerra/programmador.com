# Design: side-by-side editor for /admin

Status: implemented — side-by-side layout (preview left, editor right,
viewport-locked), live refresh, and bidirectional scroll sync
Scope: `/admin/edit/[id]` only. The published site and preview rendering pipeline stay as-is.

## Goal

When the viewport is wide enough, show the markdown source and the rendered
preview side-by-side, with the preview updating live as you type. On narrow
viewports, keep the current code/preview tabs. Most editing happens on a wide
screen, so side-by-side is the primary experience; tabs are the fallback, not
a mode you pick.

## Current architecture (what we're building on)

- `src/pages/admin/edit/[id].astro` — a `<textarea>` and an `<iframe>` behind
  two tabs; only one is visible at a time. The textarea auto-grows
  (`field-sizing: content`) and the *page* scrolls. Edits debounce-save
  (800ms) to KV via `PUT /admin/api/drafts/[id]`.
- `src/pages/admin/preview/[id].astro` — server-renders the saved draft with
  the same markdown processor as the published site (`src/lib/markdown.ts`),
  then client scripts upgrade fences: mermaid diagrams, apexcharts, image
  lightbox. The iframe reloads only when you click the preview tab
  (save → `iframe.src = … + cache-buster`), and the parent resizes the
  iframe to its document height.
- The edit page renders inside `Base.astro`'s `.wrap` (max-width 44rem).

Two properties of this setup drive the design:

1. **Rendering is server-side and shared with the published site.** That's a
   feature — previews are pixel-accurate — and we should not duplicate the
   pipeline client-side (Shiki, GFM config, `langAlias` would all drift).
   Live preview therefore means "re-fetch rendered HTML", not "render
   markdown in the browser".
2. **Fences change height dramatically when upgraded.** A 12-line
   ```mermaid fence becomes an arbitrarily tall SVG; an ```apexcharts fence
   becomes a ~380px chart. Source position and rendered position have no
   stable relationship, which rules out naive scroll-syncing and means a
   full-reload-per-keystroke preview would visibly re-render heavy graphics.

## Design

### 1. Layout: two sticky, independently scrolling panes

The core shift is from "everything grows, the page scrolls" to "the editor
area is viewport-height, each pane scrolls itself". That sidesteps the
height-mismatch problem at the layout level: the panes never need to agree on
height.

- The edit page breaks out of the 44rem `.wrap` (full-bleed section, or the
  editor page stops using `Base`'s main wrap and manages its own container).
- Wide viewports (roughly `min-width: 1100px`): CSS grid,
  `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`, editor left,
  preview right. Each pane is `height: calc(100dvh - <bar height>)` with
  `overflow-y: auto` (textarea keeps `field-sizing: content` inside its
  scrolling pane). The iframe becomes `height: 100%` and scrolls natively —
  we drop the resize-to-document-height hack in this mode.
- The preview pane naturally lands near the article's real 44rem column
  width on a typical wide monitor; cap the rendered column inside the iframe
  at 44rem as it is today so the preview stays truthful.
- Narrow viewports: the grid collapses and the existing tabs take over,
  unchanged. The switch is pure CSS (media query) plus a small JS check so
  the tab bar is hidden when both panes are visible.
- A draggable divider is explicitly out of scope for v1; the 50/50 split with
  `minmax(0, …)` is fine for the real use case (wide screen).

### 2. Live preview: debounced save → in-place swap, not iframe reload

Reloading the iframe on every debounce would flash, replay chart animations,
re-run mermaid layout, and reset scroll — unusable as a "live" view. Instead:

- Keep the existing debounced save as the single trigger: when a save
  succeeds, notify the preview to refresh. No new save paths, KV remains the
  source of truth, and the preview always shows saved content (nice
  property: what you see is what's persisted).
- Add a lightweight render endpoint, `GET /admin/api/render/[id]`, that
  returns just the article fragment (the `<article>…</article>` HTML that
  `preview/[id].astro` already builds — factor that markup into a shared
  helper so the two can't drift). Alternatively `POST` with content to skip
  the save round-trip; starting with GET-of-saved-draft is simpler and fast
  enough at 800ms debounce.
- The preview page gains a small refresh script: on a `postMessage` from the
  parent (same-origin, but postMessage keeps the coupling narrow), it
  fetches the fragment and swaps `article.innerHTML`, preserving its own
  scroll position.

**Protecting heavy fences from re-render.** After a swap, the upgrade
scripts (mermaid/apex) must run again — but only for fences that changed:

- Before swapping, record each upgraded figure keyed by a hash of its fence
  source text (the upgrade scripts can stash the source on the figure node,
  e.g. `data-fence-src-hash`).
- After swapping, for each `pre[data-language="mermaid"|"apexcharts"]` in
  the new DOM whose source hash matches a previously rendered figure, adopt
  the existing figure node instead of re-rendering. Only new/edited fences
  pay the render cost.
- This requires refactoring `MermaidDiagrams.astro` / `ApexCharts.astro`
  from run-once top-level scripts into idempotent `upgrade(root)` functions
  the preview can call repeatedly (the components keep calling it once on
  load, so the published site is untouched behaviorally).
- Chart animations should be disabled in the preview context regardless, so
  an edited chart doesn't replay a 400ms animation on every keystroke burst.

**Failure behavior.** While the draft has a frontmatter/parse problem, keep
the last good preview and show a small "preview stale: <error>" notice in the
preview pane header rather than blanking the pane.

### 3. Scroll sync: bidirectional, mapped through source lines

Proportional scroll-sync (map 40% of source to 40% of preview) is exactly
what the height-mismatch breaks — one fence throws the mapping off by a full
screen. So both panes are mapped through **source lines** instead
(`src/lib/scroll-sync.ts`):

- The preview's block elements carry `data-source-line` stamps, added by a
  rehype plugin in the admin markdown processor (`src/lib/markdown.ts`) —
  preview-only; the published site's pipeline is untouched. Shiki strips
  positions when it rebuilds code fences, so unstamped `pre`s are paired
  with fence openings found in the source, in document order (heuristic:
  breaks only if a post mixes fences with indented code blocks). The
  mermaid/apex upgrade scripts carry the stamp onto their figures, and
  re-stamp adopted figures since edits above a fence shift its line.
- The textarea side is measured with a hidden mirror that reproduces its
  soft-wrapping, giving a pixel offset per source line (rebuilt debounced
  on input and on resize).
- Scrolling either pane converts its offset to a fractional source line,
  interpolates piecewise-linearly between the nearest anchors on the other
  side, and scrolls it. Echo suppression: whichever pane the user scrolls
  owns the sync for ~250ms; the induced scroll event on the other pane is
  ignored. Anchors refresh lazily (1s TTL, plus invalidation on preview
  refresh) since diagrams/charts/images keep changing layout after load.

## What we're explicitly not doing

- No client-side markdown rendering (pipeline duplication/drift).
- No CodeMirror/Monaco. The plain textarea has been fine; syntax
  highlighting is orthogonal and can be revisited separately.
- No draggable splitter, no per-pane zoom, no synced bidirectional scrolling.

## Implementation sketch

Phase 1 — layout (no behavior change to refresh):
- `edit/[id].astro`: wrap textarea + iframe in a grid container; full-bleed
  the editor section; hide tabs when wide; load the iframe immediately (not
  just on tab click) when side-by-side is active.
- `admin.css`: grid, sticky viewport-height panes, pane scrolling; keep tab
  styles for narrow mode. Drop the iframe height-resize listener in wide
  mode (keep for tab mode, or let tab mode also use pane scrolling and
  delete the hack entirely — preferred).

Phase 2 — live refresh:
- `src/lib/` helper that renders a draft to the article fragment; use it
  from both `preview/[id].astro` and the new `admin/api/render/[id].ts`.
- Preview page: refresh script (postMessage listener → fetch → swap →
  re-upgrade), scroll preservation, stale-state notice.
- `MermaidDiagrams.astro` / `ApexCharts.astro`: export idempotent
  `upgrade(root)` with fence-source hashing; adopt unchanged figures.
- Edit page: after each successful save, `postMessage` the preview.

Phase 3 (optional) — caret-follow sync:
- Preview-only rehype plugin adding `data-source-line`.
- Edit page maps textarea caret → line number → postMessage; preview scrolls
  nearest stamped element into view.

## Open questions

- Breakpoint: 1100px vs. keying off "can the preview pane get ≥ ~38rem".
  Could use a container query on the editor section instead of a viewport
  media query.
- Should tab mode survive at all on wide screens (e.g. a "focus" toggle to
  collapse to one pane), or is side-by-side always-on when it fits?
- Does the render endpoint need the full preview `<head>` styles on first
  load only, with fragments after — or should the iframe load once and only
  ever receive fragments? (Current lean: iframe loads `preview/[id]` once,
  fragments after.)
