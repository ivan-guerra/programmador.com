# programmador.com

Personal blog built with [Astro](https://astro.build). Lightly neobrutalist, light/dark mode, and a cursor-following circle generator for fun.

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
