// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://jumploops.com',
  markdown: {
    shikiConfig: {
      // ```apexcharts fences hold JSON chart specs; highlight them as such.
      // The client renderer keys off data-language="apexcharts".
      langAlias: { apexcharts: 'json' },
    },
  },
});
