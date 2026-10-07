import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfigured, getAuthOptions } from "../../../../lib/auth/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ nextauth: string[] }> };

async function handle(request: NextRequest, context: Context) {
  if (!authConfigured()) {
    const { nextauth } = await context.params;
    if (request.method === "GET" && nextauth[0] === "session")
      return Response.json(null, { headers: { "Cache-Control": "no-store" } });
    return Response.json(
      { message: "Sign-in is unavailable." },
      { status: 503 },
    );
  }
  return NextAuth(getAuthOptions())(request, context);
}

export { handle as GET, handle as POST };
