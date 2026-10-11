import { env } from "node:process";
import { getLibrarySession } from "../auth/server";
import { getDatabase } from "../database/client";
import { LibraryError } from "../database/LibraryRepository";
import { offlineEnabled } from "../deployment";
import { readJson } from "../library/http";
import { migrateOwner } from "./migration";
import { CommunityRepository, ProjectRepository } from "./Repository";
import { ProjectError } from "./types";
import { projectType, record } from "./validation";
export async function projectRequest(
  request: Request,
  path: string[] = [],
  community = false,
) {
  const respond = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    if (offlineEnabled())
      return respond(
        {
          message:
            "Account and community services are disabled in offline mode.",
        },
        503,
      );
    const url = new URL(request.url),
      mutation = request.method !== "GET";
    let ownerId = "",
      authorName = "Lab author";
    if (!community || mutation) {
      const session = await getLibrarySession();
      if (!session?.user.id)
        throw new ProjectError(
          "Sign in to save to your account or publish.",
          401,
          "authentication_required",
        );
      ownerId = session.user.id;
      authorName = session.user.name ?? "Lab author";
      const expectedOwner = request.headers.get("x-library-owner");
      if (expectedOwner !== null && expectedOwner !== ownerId)
        throw new ProjectError(
          "Your signed-in account changed. Reload before continuing.",
          409,
          "account_changed",
        );
    }
    if (
      mutation &&
      request.headers.get("origin") !==
        new URL(env.NEXTAUTH_URL ?? request.url).origin
    )
      throw new ProjectError(
        "This request is not allowed.",
        403,
        "origin_mismatch",
      );
    const input = mutation ? await readJson(request) : undefined;
    const { db, client } = await getDatabase();
    const options = {
      type: url.searchParams.has("type")
        ? projectType(url.searchParams.get("type"))
        : undefined,
      query: url.searchParams.get("q") ?? "",
      tag: url.searchParams.get("tag") ?? undefined,
      cursor: url.searchParams.get("cursor"),
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    };
    if (community) {
      const repository = new CommunityRepository(db);
      if (request.method === "GET") {
        if (path[0] === "series" && path[1])
          return respond(
            await repository.list({ ...options, seriesId: path[1] }),
          );
        if (path[0]) return respond({ entry: await repository.get(path[0]) });
        return respond(
          await repository.list({
            ...options,
            authorId: url.searchParams.get("author") ?? undefined,
          }),
        );
      }
      if (request.method === "POST" && path[1] === "withdraw") {
        record(input, []);
        await repository.withdraw(path[0], ownerId);
        return respond({ ok: true });
      }
      if (request.method === "POST" && path[1] === "report") {
        const body = record(input, ["reason"]);
        await repository.report(path[0], ownerId, body.reason);
        return respond({ ok: true });
      }
    } else {
      await migrateOwner(db, ownerId);
      const repository = new ProjectRepository(db, ownerId),
        type = options.type ?? "experiment";
      if (request.method === "GET" && path[0] === "recovery")
        return respond({ entries: await repository.recovery() });
      if (request.method === "GET" && path[0] === "name-check")
        return respond({
          available: await repository.nameAvailable(
            url.searchParams.get("name"),
            type,
            url.searchParams.get("exclude") ?? undefined,
            url.searchParams.get("public") === "true",
          ),
        });
      if (request.method === "GET")
        return path[0]
          ? respond({ entry: await repository.get(path[0], type) })
          : respond(await repository.list(options));
      if (request.method === "POST" && path[1] === "publications")
        return respond(
          {
            entry: await repository.publish(
              client,
              path[0],
              type,
              input,
              authorName,
            ),
          },
          201,
        );
      if (
        (request.method === "POST" && !path[0]) ||
        (request.method === "PUT" && path.length === 1)
      ) {
        const body = record(input, [
          "projectId",
          "projectType",
          "name",
          "description",
          "tags",
          "payload",
          "sharingAllowed",
          "expectedRevision",
          "basedOnPublicationId",
          "sourcePublicationIds",
          "idempotencyKey",
        ]);
        if (path[0] && body.projectId !== path[0])
          throw new ProjectError("Project identity does not match the URL.");
        if (request.method === "POST" && body.expectedRevision !== null)
          throw new ProjectError("New projects must not have a save revision.");
        if (request.method === "PUT" && body.expectedRevision === null)
          throw new ProjectError("Updates require the expected save revision.");
        return respond(
          { entry: await repository.save(body) },
          request.method === "POST" ? 201 : 200,
        );
      }
      if (request.method === "DELETE" && path.length === 1) {
        const body = record(input, ["expectedRevision"]);
        await repository.delete(path[0], type, body.expectedRevision);
        return respond({ ok: true });
      }
    }
    throw new ProjectError("Operation not found.", 404, "not_found");
  } catch (error) {
    if (error instanceof ProjectError || error instanceof LibraryError)
      return respond(
        {
          message: error.message,
          code: error instanceof ProjectError ? error.code : "invalid_input",
        },
        error.status,
      );
    console.error(
      "Project request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return respond(
      {
        message:
          "Your library is unavailable. Your current work has been retained.",
        code: "unavailable",
      },
      503,
    );
  }
}
