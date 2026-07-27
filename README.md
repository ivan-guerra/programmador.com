# jumploops.com

Personal blog for [@jumploops](https://github.com/jumploops), built with [Astro](https://astro.build). Lightly neobrutalist, light/dark mode, and a cursor-following circle generator for fun.

## Writing a post

Drop a markdown file in `src/content/blog/`:

```markdown
---
title: "Post title"
description: "One-line summary shown in the feed."
pubDate: 2026-07-14
tags: ["tools"]
draft: false
---

Post body here.
```

The home page shows every non-draft post newest-first. Posts longer than
`CLAMP_THRESHOLD` characters (see `src/pages/index.astro`) are clamped in the
feed with an "expand more" link to the full post.

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build the static site to `./dist/`           |
| `npm run preview` | Preview the build locally                    |
| `npm run deploy`  | Build and deploy to Cloudflare Workers       |

## Deploying (Cloudflare Workers, static assets)

The site deploys as a static-assets-only Worker — no server code. Config lives
in `wrangler.jsonc` (`dist/` is the assets directory; `404.html` is served for
unknown routes).

One-time setup:

```sh
npx wrangler login
```

Then:

```sh
npm run deploy
```

The first deploy creates the `jumploops-com` Worker on a `workers.dev`
subdomain. To serve it at `jumploops.com`, add a custom domain to the Worker in
the Cloudflare dashboard (Workers & Pages → jumploops-com → Settings →
Domains & Routes).
