import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getUser, type SessionUser } from "./auth";
import { rateLimit } from "./rate-limit";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Ctx<P> = { req: NextRequest; user: SessionUser; params: P };
type Opts = { auth?: "user" | "admin" | "none"; limit?: { key: string; max: number; windowMs: number } };

/** Same-origin check for state-changing requests (CSRF defense in depth alongside SameSite=Lax). */
function checkOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (cron) authenticate separately
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
}

export function handler<P = Record<string, string>>(
  fn: (ctx: Ctx<P>) => Promise<unknown>,
  opts: Opts = { auth: "user" },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    try {
      checkOrigin(req);
      if (opts.limit) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
        if (!rateLimit(`${opts.limit.key}:${ip}`, opts.limit.max, opts.limit.windowMs)) throw new HttpError(429, "Too many requests. Please wait a moment.");
      }
      let user = null as SessionUser | null;
      if (opts.auth !== "none") {
        user = await getUser();
        if (!user) throw new HttpError(401, "Please sign in.");
        if (opts.auth === "admin" && user.role !== "ADMIN") throw new HttpError(403, "Admins only.");
      }
      const params = ((await context?.params) ?? {}) as P;
      const out = await fn({ req, user: user as SessionUser, params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Validation failed", issues: e.flatten().fieldErrors }, { status: 400 });
      console.error("[api]", e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new HttpError(400, "Invalid JSON body"); }
  return schema.parse(raw);
}
