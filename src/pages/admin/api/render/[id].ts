import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDraft } from "../../../../lib/drafts";
import { renderDraftArticle } from "../../../../lib/preview";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const draft = await getDraft((env as any).DRAFTS, params.id!);
  if (!draft) return new Response("not found", { status: 404 });

  try {
    const { article } = await renderDraftArticle(draft);
    return new Response(article, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "render failed",
      { status: 500 }
    );
  }
};
