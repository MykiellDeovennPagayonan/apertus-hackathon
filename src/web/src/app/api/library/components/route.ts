import { handleLibraryRequest } from "../../../../lib/library/http";

export const runtime = "nodejs";
export function GET(request: Request) {
  return handleLibraryRequest(request, "components");
}
export function PUT(request: Request) {
  return handleLibraryRequest(request, "components");
}
