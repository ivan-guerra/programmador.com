import type { APIRoute } from "astro";
import { env as workerEnv } from "cloudflare:workers";
import { deleteDraft, getDraft } from "../../../../lib/drafts";

export const prerender = false;

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

// Publish a draft: commit it to src/content/blog/<slug>.md on main via the
// GitHub Contents API. The push triggers the Workers Builds deploy.
export const POST: APIRoute = async ({ params }) => {
  const env = workerEnv as any;
  const token: string | undefined = env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      {
        error:
          "Publishing is not configured. Set the GITHUB_TOKEN secret (npx wrangler secret put GITHUB_TOKEN).",
      },
      { status: 503 }
    );
  }

  const draft = await getDraft(env.DRAFTS, params.id!);
  if (!draft) return Response.json({ error: "not found" }, { status: 404 });
  if (!/^[a-z0-9-]+$/.test(draft.slug)) {
    return Response.json({ error: "invalid slug" }, { status: 400 });
  }

  const path = `src/content/blog/${draft.slug}.md`;
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "jumploops-admin",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Existing file? Updating requires its blob sha.
  let sha: string | undefined;
  const existing = await fetch(api, { headers });
  if (existing.ok) {
    sha = (await existing.json()).sha;
  } else if (existing.status !== 404) {
    const detail = await existing.text();
    return Response.json(
      { error: `GitHub lookup failed (${existing.status}): ${detail}` },
      { status: 502 }
    );
  }

  const commit = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `${sha ? "update" : "post"}: ${draft.slug}`,
      content: toBase64(draft.content),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!commit.ok) {
    const detail = await commit.text();
    return Response.json(
      { error: `GitHub commit failed (${commit.status}): ${detail}` },
      { status: 502 }
    );
  }

  const result = await commit.json();
  await deleteDraft(env.DRAFTS, draft.id);
  return Response.json({
    ok: true,
    slug: draft.slug,
    commitUrl: result.commit?.html_url ?? null,
    postUrl: `/blog/${draft.slug}/`,
  });
};
