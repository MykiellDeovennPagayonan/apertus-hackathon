import { offlineEnabled } from "../../../lib/deployment";

export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { status: "ready", offline: offlineEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
