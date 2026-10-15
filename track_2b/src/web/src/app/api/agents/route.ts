import { handleAgentRequest } from "../../../lib/agents/http";

export const runtime = "nodejs";
export const maxDuration = 120;
export function POST(request: Request) {
  return handleAgentRequest(request);
}
