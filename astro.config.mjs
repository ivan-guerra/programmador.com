// @ts-check
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

// https://astro.build/config
export default defineConfig({
  site: "https://programmador.com",
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "github-light-high-contrast",
      // ```apexcharts fences hold JSON chart specs; highlight them as such.
      // The client renderer keys off data-language="apexcharts".
      langAlias: { apexcharts: "json" },
    },
  },
});
