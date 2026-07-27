import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  deleteDraft,
  getDraft,
  putDraft,
  sanitizeSlug,
} from "../../../../lib/drafts";

export const prerender = false;

const kv = () => (env as any).DRAFTS;

export const GET: APIRoute = async ({ params }) => {
  const draft = await getDraft(kv(), params.id!);
  if (!draft) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(draft);
};

export const PUT: APIRoute = async ({ request, params }) => {
  const draft = await getDraft(kv(), params.id!);
  if (!draft) return Response.json({ error: "not found" }, { status: 404 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.content !== "string") {
    return Response.json({ error: "content required" }, { status: 400 });
  }

  draft.content = payload.content;
  if (typeof payload.slug === "string") {
    draft.slug = sanitizeSlug(payload.slug) || draft.slug;
  }
  draft.updatedAt = Date.now();
  await putDraft(kv(), draft);
  return Response.json(draft);
};

export const DELETE: APIRoute = async ({ params }) => {
  await deleteDraft(kv(), params.id!);
  return Response.json({ ok: true });
};
