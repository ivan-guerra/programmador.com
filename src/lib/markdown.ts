import {
  createMarkdownProcessor,
  type MarkdownProcessor,
} from "@astrojs/markdown-remark";

// The same processor Astro uses for content collections, with the same
// defaults (GFM, SmartyPants, Shiki) — so admin previews render markdown
// exactly like the published site.
let processor: Promise<MarkdownProcessor> | null = null;

function getProcessor() {
  processor ??= createMarkdownProcessor({
    // Keep in sync with markdown.shikiConfig in astro.config.mjs.
    shikiConfig: { langAlias: { apexcharts: "json" } },
  });
  return processor;
}

export async function renderMarkdown(body: string): Promise<string> {
  const p = await getProcessor();
  const result = await p.render(body);
  return result.code;
}
