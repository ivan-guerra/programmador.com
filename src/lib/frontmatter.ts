import { parse as parseYaml } from "yaml";

export interface PostData {
  title?: string;
  description?: string;
  pubDate?: Date;
  tags?: string[];
  draft?: boolean;
}

export function splitFrontmatter(content: string): {
  data: PostData;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: content };

  let data: PostData = {};
  try {
    const parsed = parseYaml(match[1]) ?? {};
    data = {
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      pubDate: parsed.pubDate ? new Date(parsed.pubDate) : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      draft: parsed.draft === true,
    };
    if (data.pubDate && Number.isNaN(data.pubDate.valueOf())) {
      data.pubDate = undefined;
    }
  } catch {
    // invalid yaml — treat as no frontmatter data
  }
  return { data, body: content.slice(match[0].length) };
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

// Rebuild a markdown file from a content-collection entry, matching the
// hand-written frontmatter style used in src/content/blog/.
export function toMarkdownFile(
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    draft: boolean;
  },
  body: string
): string {
  const lines = ["---"];
  lines.push(`title: ${JSON.stringify(data.title)}`);
  lines.push(`description: ${JSON.stringify(data.description)}`);
  lines.push(`pubDate: ${fmtDate(data.pubDate)}`);
  if (data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map((t) => JSON.stringify(t)).join(", ")}]`);
  }
  if (data.draft) lines.push("draft: true");
  lines.push("---");
  return `${lines.join("\n")}\n\n${body.replace(/^\n+/, "")}`;
}
