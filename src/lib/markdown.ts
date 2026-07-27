import {
  createMarkdownProcessor,
  type MarkdownProcessor,
} from "@astrojs/markdown-remark";

// The same processor Astro uses for content collections, with the same
// defaults (GFM, SmartyPants, Shiki) — so admin previews render markdown
// exactly like the published site.
let processor: Promise<MarkdownProcessor> | null = null;

function getProcessor() {
  processor ??= createMarkdownProcessor();
  return processor;
}

export async function renderMarkdown(body: string): Promise<string> {
  const p = await getProcessor();
  const result = await p.render(body);
  return result.code;
}
