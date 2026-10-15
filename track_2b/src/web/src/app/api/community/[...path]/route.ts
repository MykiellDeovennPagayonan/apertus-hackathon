import { projectRequest } from "../../../../lib/projects/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return projectRequest(request, (await context.params).path, true);
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return projectRequest(request, (await context.params).path, true);
}
