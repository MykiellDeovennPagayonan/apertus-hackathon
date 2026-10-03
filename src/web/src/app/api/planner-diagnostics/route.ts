import { readTrace } from "../../../lib/planner/diagnostics";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (
    process.env.PLANNER_DIAGNOSTICS !== "true" ||
    process.env.NODE_ENV === "production"
  )
    return new Response(null, { status: 404 });
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    return new Response(null, { status: 404 });
  const trace = readTrace(url.searchParams.get("id") ?? "");
  return Response.json(trace, {
    status: trace ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
