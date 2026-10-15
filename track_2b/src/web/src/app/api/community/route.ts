import { projectRequest } from "../../../lib/projects/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return projectRequest(request, [], true);
}
export async function POST(request: Request) {
  return projectRequest(request, [], true);
}
