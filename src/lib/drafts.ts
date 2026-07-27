export interface Draft {
  id: string;
  slug: string;
  content: string;
  updatedAt: number;
}

const PREFIX = "draft:";

export async function listDrafts(kv: any): Promise<Draft[]> {
  const list = await kv.list({ prefix: PREFIX });
  const drafts: (Draft | null)[] = await Promise.all(
    list.keys.map((k: { name: string }) => kv.get(k.name, "json"))
  );
  return drafts
    .filter((d): d is Draft => d !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDraft(kv: any, id: string): Promise<Draft | null> {
  return kv.get(PREFIX + id, "json");
}

export async function putDraft(kv: any, draft: Draft): Promise<void> {
  await kv.put(PREFIX + draft.id, JSON.stringify(draft));
}

export async function deleteDraft(kv: any, id: string): Promise<void> {
  await kv.delete(PREFIX + id);
}

export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
