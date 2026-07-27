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

## Admin editor (`/admin`)

A hosted markdown editor with exact-render previews. All public pages stay
prerendered static; only `/admin` runs on the Worker (Astro + the
`@astrojs/cloudflare` adapter).

- **Drafts** live in Workers KV (`DRAFTS` binding) — nothing touches the git
  repo until you publish.
- **code / preview toggle**: preview renders the draft through the same
  markdown pipeline (`@astrojs/markdown-remark`) and the same layout as the
  live site, so it is pixel-identical to the published post.
- **Publish** commits `src/content/blog/<slug>.md` to `main` via the GitHub
  Contents API, which triggers the Workers Builds deploy. Publishing an edit
  to an existing post updates the same file.
- **Auth**: HTTP Basic Auth (user `admin`) enforced by `src/middleware.ts`.
  Fails closed if the secret is missing.

Required Worker secrets (one-time):

```sh
npx wrangler secret put ADMIN_PASSWORD   # login password for /admin
npx wrangler secret put GITHUB_TOKEN     # fine-grained PAT, Contents: RW on this repo
```

For local dev, put `ADMIN_PASSWORD=...` in `.dev.vars` (gitignored) and run
`npm run dev`.

## Deploying (Cloudflare Workers)

Auto-deploy: pushes to `main` build and deploy via Workers Builds
(build command `npm run build`, deploy command
`npx wrangler deploy -c dist/server/wrangler.json` — the adapter generates the
deploy config into `dist/server/`).

Manual deploy: `npm run deploy` (requires `npx wrangler login` once).

The Worker is `jumploops-com`, served at `jumploops.com` via a custom domain
(Workers & Pages → jumploops-com → Settings → Domains & Routes).
