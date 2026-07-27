import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getEntry } from "astro:content";
import { putDraft, sanitizeSlug, type Draft } from "../../../../lib/drafts";
import { toMarkdownFile } from "../../../../lib/frontmatter";

export const prerender = false;

const template = () => `---
title: "Untitled"
description: ""
pubDate: ${new Date().toISOString().slice(0, 10)}
tags: []
---

Write something.
`;

// Create a draft: from scratch, or seeded from a published post
// ({ fromPost: "<post id>" }).
export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json().catch(() => ({}));

  let slug = "untitled";
  let content = template();

  if (typeof payload.fromPost === "string") {
    const entry = await getEntry("blog", payload.fromPost);
    if (!entry) {
      return Response.json({ error: "post not found" }, { status: 404 });
    }
    slug = entry.id;
    content = toMarkdownFile(entry.data, entry.body ?? "");
  } else if (typeof payload.slug === "string") {
    slug = sanitizeSlug(payload.slug) || "untitled";
  }

  const draft: Draft = {
    id: crypto.randomUUID(),
    slug,
    content,
    updatedAt: Date.now(),
  };
  await putDraft((env as any).DRAFTS, draft);
  return Response.json(draft);
};
