// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://jumploops.com',
  // Static by default; only the /admin routes opt into SSR (prerender = false).
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
