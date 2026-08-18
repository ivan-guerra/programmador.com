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

// Article markup identical to src/pages/blog/[id].astro, rendered to a
// string so the preview page and the live-refresh endpoint
// (/admin/api/render/[id]) can't drift apart.
export async function renderDraftArticle(
  draft: Draft
): Promise<{ title: string; article: string }> {
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
