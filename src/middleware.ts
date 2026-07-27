import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

// Basic Auth for everything under /admin. Fails closed: if the
// ADMIN_PASSWORD secret isn't configured, admin is disabled entirely.
export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = new URL(context.request.url);
  if (!pathname.startsWith("/admin")) return next();

  const password: string | undefined = (env as any).ADMIN_PASSWORD;
  if (!password) {
    return new Response(
      "Admin is disabled. Set the ADMIN_PASSWORD secret (npx wrangler secret put ADMIN_PASSWORD).",
      { status: 503 }
    );
  }

  const auth = context.request.headers.get("authorization") ?? "";
  const expected = "Basic " + btoa(`admin:${password}`);
  if (auth !== expected) {
    return new Response("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="jumploops admin"' },
    });
  }

  return next();
});
