// Client-side module for the admin editor: keeps the markdown textarea
// and the preview iframe scrolled to the same place in the document.
//
// The panes disagree on height — rendered markdown is taller (or
// shorter) than its source, especially around diagrams and charts — so
// percentage-based sync drifts. Both sides are instead mapped through
// source lines:
//
//   textarea px  <-- hidden mirror -->  source line  <-- data-source-line
//                                                        stamps --> preview y
//
// The mirror reproduces the textarea's soft-wrapping to give a pixel
// offset per source line; the preview's block elements carry
// data-source-line stamps (see lib/markdown.ts). Scrolling either pane
// interpolates piecewise-linearly between the nearest anchors and
// drives the other.

export interface ScrollSync {
  /** Textarea value changed — remeasure lines (debounced). */
  contentChanged(): void;
  /** The preview iframe (re)loaded — hook its scroll and refresh anchors. */
  previewLoaded(): void;
  /** The preview swapped in new content — refresh anchors. */
  previewRefreshed(): void;
  /** The panes became visible / changed size — remeasure now. */
  layoutChanged(): void;
}

export function createScrollSync(
  textarea: HTMLTextAreaElement,
  iframe: HTMLIFrameElement,
  enabled: () => boolean
): ScrollSync {
  // ---- textarea side: pixel offset of each source line, via a hidden
  // mirror that wraps exactly like the textarea ----
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.left = "-99999px";
  mirror.style.top = "0";
  document.body.appendChild(mirror);

  let lineTops: number[] = [];
  let mirrorHeight = 0;
  // Lines the frontmatter block occupies; data-source-line stamps are
  // relative to the body that follows it.
  let bodyOffset = 0;

  const rebuildMirror = () => {
    if (textarea.clientWidth === 0) return;
    const cs = getComputedStyle(textarea);
    mirror.style.font = cs.font;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.tabSize = cs.tabSize;
    mirror.style.padding = cs.padding;
    mirror.style.border = "0";
    mirror.style.boxSizing = "border-box";
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";

    const value = textarea.value;
    const fm = value.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    bodyOffset = fm ? (fm[0].match(/\n/g)?.length ?? 0) : 0;

    const frag = document.createDocumentFragment();
    for (const line of value.split("\n")) {
      const div = document.createElement("div");
      div.textContent = line.length > 0 ? line : " ";
      frag.appendChild(div);
    }
    mirror.replaceChildren(frag);
    const divs = mirror.children;
    lineTops = new Array(divs.length);
    for (let i = 0; i < divs.length; i++) {
      lineTops[i] = (divs[i] as HTMLElement).offsetTop;
    }
    mirrorHeight = mirror.scrollHeight;
  };

  // 0-based fractional source line at a textarea scroll offset, and back.
  const lineAtPx = (px: number): number => {
    const n = lineTops.length;
    if (n === 0) return 0;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineTops[mid] <= px) lo = mid;
      else hi = mid - 1;
    }
    const top = lineTops[lo];
    const next = lo + 1 < n ? lineTops[lo + 1] : mirrorHeight;
    const h = Math.max(1, next - top);
    return lo + Math.min(1, Math.max(0, (px - top) / h));
  };

  const pxAtLine = (line: number): number => {
    const n = lineTops.length;
    if (n === 0) return 0;
    const i = Math.min(n - 1, Math.max(0, Math.floor(line)));
    const frac = Math.min(1, Math.max(0, line - i));
    const top = lineTops[i];
    const next = i + 1 < n ? lineTops[i + 1] : mirrorHeight;
    return top + frac * (next - top);
  };

  // ---- preview side: (0-based absolute source line, document y) anchors
  // from the data-source-line stamps ----
  type Anchor = { line: number; y: number };
  let anchors: Anchor[] = [];
  let anchorsAt = 0;

  const rebuildAnchors = () => {
    anchors = [];
    anchorsAt = performance.now();
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win || !doc.getElementById("preview-root")) return;
    const list: Anchor[] = [];
    for (const el of doc.querySelectorAll<HTMLElement>("[data-source-line]")) {
      const stamp = Number(el.getAttribute("data-source-line"));
      if (!Number.isFinite(stamp)) continue;
      list.push({
        line: stamp - 1 + bodyOffset,
        y: el.getBoundingClientRect().top + win.scrollY,
      });
    }
    list.sort((a, b) => a.line - b.line);
    // Virtual endpoints: the frontmatter region maps onto the article
    // header, the end of the source onto the end of the document.
    anchors = [
      { line: 0, y: 0 },
      ...list,
      {
        line: Math.max(lineTops.length, 1),
        y: doc.scrollingElement?.scrollHeight ?? 0,
      },
    ];
    // Guard against out-of-order y (collapsed margins, floats).
    for (let i = 1; i < anchors.length; i++) {
      anchors[i].y = Math.max(anchors[i].y, anchors[i - 1].y);
    }
  };

  // Anchors go stale as images/diagrams/charts finish laying out, so
  // refresh them lazily rather than tracking every async render.
  const freshAnchors = () => {
    if (anchors.length === 0 || performance.now() - anchorsAt > 1000) {
      rebuildAnchors();
    }
    return anchors;
  };

  const interp = (
    points: Anchor[],
    from: "line" | "y",
    to: "line" | "y",
    v: number
  ): number => {
    if (points.length === 0) return 0;
    if (v <= points[0][from]) return points[0][to];
    const last = points.length - 1;
    if (v >= points[last][from]) return points[last][to];
    let lo = 0;
    let hi = last;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid][from] <= v) lo = mid;
      else hi = mid;
    }
    const p = points[lo];
    const q = points[hi];
    const span = q[from] - p[from];
    const t = span > 0 ? (v - p[from]) / span : 0;
    return p[to] + t * (q[to] - p[to]);
  };

  // ---- bidirectional wiring with echo suppression: whichever pane the
  // user scrolls owns the sync briefly; the induced scroll event on the
  // other pane is ignored ----
  let owner: "code" | "preview" | null = null;
  let ownerUntil = 0;
  const claim = (who: "code" | "preview") => {
    const now = performance.now();
    if (owner && owner !== who && now < ownerUntil) return false;
    owner = who;
    ownerUntil = now + 250;
    return true;
  };

  let raf = 0;
  const schedule = (fn: () => void) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fn);
  };

  textarea.addEventListener("scroll", () => {
    if (!enabled() || lineTops.length === 0 || !claim("code")) return;
    schedule(() => {
      const win = iframe.contentWindow;
      if (!win) return;
      const line = lineAtPx(textarea.scrollTop);
      win.scrollTo(0, interp(freshAnchors(), "line", "y", line));
    });
  });

  const onPreviewScroll = () => {
    if (!enabled() || lineTops.length === 0 || !claim("preview")) return;
    schedule(() => {
      const win = iframe.contentWindow;
      if (!win) return;
      const line = interp(freshAnchors(), "y", "line", win.scrollY);
      textarea.scrollTop = pxAtLine(line);
    });
  };

  let mirrorTimer: number | undefined;
  const contentChanged = () => {
    clearTimeout(mirrorTimer);
    mirrorTimer = window.setTimeout(() => {
      rebuildMirror();
      anchorsAt = 0;
    }, 300);
  };

  new ResizeObserver(() => {
    rebuildMirror();
    anchorsAt = 0;
  }).observe(textarea);

  rebuildMirror();

  return {
    contentChanged,
    previewLoaded() {
      // A fresh window object on every (re)load — attach each time.
      iframe.contentWindow?.addEventListener("scroll", onPreviewScroll);
      anchorsAt = 0;
    },
    previewRefreshed() {
      anchorsAt = 0;
    },
    layoutChanged() {
      rebuildMirror();
      anchorsAt = 0;
    },
  };
}
