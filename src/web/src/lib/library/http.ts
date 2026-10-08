import { env } from "node:process";
import { getLibrarySession } from "../auth/server";
import { getDatabase } from "../database/client";
import { LibraryError, LibraryRepository } from "../database/LibraryRepository";

const BYTE_LIMIT = 2_000_000;

async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new LibraryError("JSON content is required.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new LibraryError("A save request is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BYTE_LIMIT) {
        await reader.cancel();
        throw new LibraryError("Save request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new LibraryError("Invalid JSON.", 400);
  }
}

export async function handleLibraryRequest(
  request: Request,
  kind: "simulations" | "components",
) {
  const respond = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  try {
    const session = await getLibrarySession();
    if (!session?.user.id)
      throw new LibraryError("Sign in to access your library.", 401);
    const expectedOwner = request.headers.get("x-library-owner");
    if (expectedOwner !== null && expectedOwner !== session.user.id)
      throw new LibraryError(
        "Your signed-in account changed. Reload before continuing.",
        409,
      );
    if (request.method === "PUT") {
      const origin = new URL(env.NEXTAUTH_URL ?? request.url).origin;
      if (request.headers.get("origin") !== origin)
        throw new LibraryError("This save request is not allowed.", 403);
    }
    const input =
      request.method === "PUT" ? await readJson(request) : undefined;
    const { db } = await getDatabase();
    const repository = new LibraryRepository(db, session.user.id);
    if (request.method === "PUT") {
      const entry =
        kind === "simulations"
          ? await repository.saveSimulation(input)
          : await repository.saveComponent(input);
      return respond({ entry });
    }
    const id = new URL(request.url).searchParams.get("id");
    if (id !== null) {
      const entry =
        kind === "simulations"
          ? await repository.getSimulation(id)
          : await repository.getComponent(id);
      return entry
        ? respond({ entry })
        : respond({ message: "Library record not found." }, 404);
    }
    const entries =
      kind === "simulations"
        ? await repository.listSimulations()
        : await repository.listComponents();
    return respond({ entries });
  } catch (error) {
    if (error instanceof LibraryError)
      return respond({ message: error.message }, error.status);
    console.error(
      "Library request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return respond(
      { message: "Your library is unavailable. Please try again." },
      503,
    );
  }
}
