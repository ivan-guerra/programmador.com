import {
  createMarkdownProcessor,
  type MarkdownProcessor,
} from "@astrojs/markdown-remark";

// Stamp top-level blocks with their 1-based source line so the editor
// can scroll-sync the markdown and its (taller) rendered preview. Only
// this admin processor gets the stamps; the published site is built by
// Astro's own content-collection pipeline and stays untouched.
function rehypeSourceLines() {
  return (tree: any, file: any) => {
    for (const node of tree.children ?? []) {
      if (node.type === "element" && node.position?.start?.line != null) {
        (node.properties ??= {})["data-source-line"] = String(
          node.position.start.line
        );
      }
    }

    // Shiki (which runs before this plugin) replaces fenced-code pres
    // with new position-less nodes, so the loop above misses them. Pair
    // the unstamped pres with fence openings found in the source, in
    // document order. Heuristic: assumes pres and fences line up, which
    // holds unless a post mixes fences with indented code blocks.
    const openings: number[] = [];
    const lines = String(file.value).split("\n");
    let open: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*(`{3,}|~{3,})/);
      if (!m) continue;
      if (!open) {
        open = m[1][0];
        openings.push(i + 1);
      } else if (m[1][0] === open) {
        open = null;
      }
    }
    let fenceIdx = 0;
    const visit = (node: any) => {
      if (
        node.type === "element" &&
        node.tagName === "pre" &&
        node.properties?.["data-source-line"] == null
      ) {
        if (fenceIdx < openings.length) {
          (node.properties ??= {})["data-source-line"] = String(
            openings[fenceIdx]
          );
        }
        fenceIdx++;
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}

// The same processor Astro uses for content collections, with the same
// defaults (GFM, SmartyPants, Shiki) — so admin previews render markdown
// exactly like the published site.
let processor: Promise<MarkdownProcessor> | null = null;

function getProcessor() {
  processor ??= createMarkdownProcessor({
    // Keep in sync with markdown.shikiConfig in astro.config.mjs.
    shikiConfig: { langAlias: { apexcharts: "json" } },
    rehypePlugins: [rehypeSourceLines],
  });
  return processor;
}

export async function renderMarkdown(body: string): Promise<string> {
  const p = await getProcessor();
  const result = await p.render(body);
  return result.code;
}
