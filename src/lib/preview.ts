import type { Draft } from "./drafts";
import { splitFrontmatter } from "./frontmatter";
import { renderMarkdown } from "./markdown";

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  );

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Markdown rendering (Shiki especially) is the most CPU-expensive thing
// this worker does, and the editor re-requests renders often. Cache the
// result per draft version in isolate memory so only actual content
// changes pay for a render.
const cache = new Map<string, { updatedAt: number; result: Rendered }>();

interface Rendered {
  title: string;
  article: string;
}

// Article markup identical to src/pages/blog/[id].astro, rendered to a
// string so the preview page and the live-refresh endpoint
// (/admin/api/render/[id]) can't drift apart.
export async function renderDraftArticle(draft: Draft): Promise<Rendered> {
  const hit = cache.get(draft.id);
  if (hit && hit.updatedAt === draft.updatedAt) return hit.result;

  const result = await renderDraftArticleUncached(draft);
  if (cache.size > 50) cache.clear();
  cache.set(draft.id, { updatedAt: draft.updatedAt, result });
  return result;
}

async function renderDraftArticleUncached(draft: Draft): Promise<Rendered> {
  const { data, body } = splitFrontmatter(draft.content);
  const html = await renderMarkdown(body);

  const title = data.title ?? draft.slug;
  const pubDate = data.pubDate ?? new Date();
  const tags = data.tags ?? [];

  const article = `<article>
  <header class="article-header">
    <div class="post-meta">
      <time datetime="${pubDate.toISOString()}">${formatDate(pubDate)}</time>
      ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("\n      ")}
    </div>
    <h1>${escapeHtml(title)}</h1>
  </header>
  <div class="prose">${html}</div>
  <footer class="article-footer">
    <a href="/" class="back-link">← back</a>
  </footer>
</article>`;

  return { title, article };
}
