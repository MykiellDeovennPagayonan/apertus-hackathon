import { createHash } from "node:crypto";
import {
  type Db,
  type Filter,
  type MongoClient,
  MongoServerError,
} from "mongodb";
import {
  type Attribution,
  type Page,
  type Project,
  ProjectError,
  type ProjectSummary,
  type ProjectType,
  type Publication,
  type PublicationSummary,
} from "./types";
import {
  identity,
  nameFields,
  payload,
  projectType,
  publicPayload,
  record,
  renamePayload,
  revision,
  tags,
  text,
} from "./validation";
export type ProjectRow = Omit<Project, "createdAt" | "updatedAt"> & {
  ownerId: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
  recovery?: string;
  createKey?: string;
  createHash?: string;
};
type PublicationRow = Omit<Publication, "publishedAt"> & {
  normalizedName: string;
  publishedAt: Date;
  sourceProjectId: string;
  sourceRevision: number;
  requestHash: string;
};
type SeriesRow = {
  seriesId: string;
  authorId: string;
  sourceProjectId: string;
  projectType: ProjectType;
  versionNumber: number;
};
export function hash(value: unknown) {
  const canonical = (v: unknown): unknown =>
    v instanceof Date
      ? v.toISOString()
      : Array.isArray(v)
        ? v.map(canonical)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, val]) => [k, canonical(val)]),
            )
          : v;
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function duplicate(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    const name = String(error.message).includes("name");
    throw new ProjectError(
      name
        ? "That name already exists in your library. Choose a different name."
        : "This identity already exists. Reopen it before saving.",
      409,
      name ? "name_conflict" : "identity_conflict",
    );
  }
  throw error;
}
export function projectDTO(row: ProjectRow): Project {
  return {
    projectId: row.projectId,
    projectType: row.projectType,
    name: row.name,
    description: row.description,
    tags: row.tags,
    payload: row.payload,
    sharingAllowed: row.sharingAllowed,
    saveRevision: row.saveRevision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.basedOn ? { basedOn: row.basedOn } : {}),
    ...(row.attributions?.length ? { attributions: row.attributions } : {}),
    ...(row.seriesId
      ? {
          seriesId: row.seriesId,
          lastPublicationId: row.lastPublicationId,
          lastPublishedRevision: row.lastPublishedRevision,
          lastPublishedVersionNumber: row.lastPublishedVersionNumber,
        }
      : {}),
  };
}
function publicationDTO(row: PublicationRow): Publication {
  return {
    publicationId: row.publicationId,
    seriesId: row.seriesId,
    versionNumber: row.versionNumber,
    authorId: row.authorId,
    authorName: row.authorName,
    projectType: row.projectType,
    name: row.name,
    description: row.description,
    tags: row.tags,
    payload: row.payload,
    contentHash: row.contentHash,
    payloadFormatVersion: row.payloadFormatVersion,
    publishedAt: row.publishedAt.toISOString(),
    visibility: row.visibility,
    license: row.license,
    ...(row.basedOn ? { basedOn: row.basedOn } : {}),
    ...(row.attributions?.length ? { attributions: row.attributions } : {}),
  };
}
export type ListOptions = {
  type?: ProjectType;
  query?: string;
  tag?: string;
  cursor?: string | null;
  limit?: number;
};
function pagination(options: ListOptions) {
  const limit = options.limit ?? 24;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw new ProjectError("Page size must be between 1 and 50.");
  const query = text(options.query ?? "", 100, "Search");
  let after: { at: Date; id: string; type?: ProjectType } | undefined;
  if (options.cursor) {
    try {
      const [at, id, type] = JSON.parse(
        Buffer.from(options.cursor, "base64url").toString("utf8"),
      );
      after = {
        at: new Date(at),
        id: identity(id),
        ...(type ? { type: projectType(type) } : {}),
      };
      if (!Number.isFinite(after.at.getTime())) throw new Error();
    } catch {
      throw new ProjectError("Invalid page cursor.");
    }
  }
  return { limit, query, after };
}
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export class ProjectRepository {
  constructor(
    readonly db: Db,
    readonly ownerId: string,
  ) {
    identity(ownerId);
  }
  private collection() {
    return this.db.collection<ProjectRow>("projects");
  }
  async recovery() {
    const receipts = await this.db
      .collection("projectMigrationReceipts")
      .find({ ownerId: this.ownerId, status: "quarantined" })
      .sort({ at: -1 })
      .limit(20)
      .toArray();
    const entries = [];
    for (const receipt of receipts) {
      if (!["simulations", "components"].includes(receipt.collection)) continue;
      const source = await this.db
        .collection(receipt.collection)
        .findOne({ _id: receipt.sourceId, ownerId: this.ownerId });
      if (source)
        entries.push({
          id: String(receipt._id),
          projectType:
            receipt.collection === "simulations" ? "experiment" : "composition",
          payload:
            receipt.collection === "simulations"
              ? source.document
              : source.recipe,
          reason: receipt.reason,
          recovery: source.recovery,
        });
    }
    return entries;
  }
  async nameAvailable(
    name: unknown,
    type: ProjectType,
    exclude?: string,
    publicName = false,
  ) {
    const { normalizedName } = nameFields(name);
    if (publicName)
      return !(await this.db
        .collection("communityPublications")
        .findOne(
          { authorId: this.ownerId, projectType: type, normalizedName },
          { projection: { _id: 1 } },
        ));
    return !(await this.collection().findOne(
      {
        ownerId: this.ownerId,
        projectType: type,
        normalizedName,
        ...(exclude ? { projectId: { $ne: identity(exclude) } } : {}),
      },
      { projection: { _id: 1 } },
    ));
  }
  async get(id: string, type: ProjectType = "experiment") {
    const row = await this.collection().findOne({
      ownerId: this.ownerId,
      projectId: identity(id),
      projectType: type,
    });
    if (!row) throw new ProjectError("Project not found.", 404, "not_found");
    return projectDTO(row);
  }
  async list(options: ListOptions = {}): Promise<Page<ProjectSummary>> {
    const { limit, query, after } = pagination(options);
    const filter: Filter<ProjectRow> = { ownerId: this.ownerId };
    if (options.type) filter.projectType = projectType(options.type);
    if (query) filter.name = { $regex: escapeRegex(query), $options: "i" };
    if (options.tag) filter.tags = text(options.tag, 40, "Tag");
    if (after)
      filter.$or = [
        { updatedAt: { $lt: after.at } },
        { updatedAt: after.at, projectId: { $gt: after.id } },
        ...(after.type
          ? [
              {
                updatedAt: after.at,
                projectId: after.id,
                projectType: { $gt: after.type },
              },
            ]
          : []),
      ];
    const rows = await this.collection()
      .find(filter)
      .sort({ updatedAt: -1, projectId: 1, projectType: 1 })
      .limit(limit + 1)
      .toArray();
    const entries = rows.slice(0, limit).map((row) => {
      const { payload: _payload, ...summary } = projectDTO(row);
      return summary;
    });
    const last = rows[limit - 1];
    return {
      entries,
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify([
                last.updatedAt.toISOString(),
                last.projectId,
                last.projectType,
              ]),
            ).toString("base64url")
          : null,
    };
  }
  async recoveryCopy(id: string, type: ProjectType) {
    const row = await this.collection().findOne(
      { ownerId: this.ownerId, projectId: identity(id), projectType: type },
      { projection: { recovery: 1 } },
    );
    return row?.recovery;
  }
  async all(type: ProjectType) {
    return (
      await this.collection()
        .find({ ownerId: this.ownerId, projectType: type })
        .sort({ updatedAt: -1 })
        .toArray()
    ).map((row) => ({
      ...projectDTO(row),
      ...(row.recovery === undefined ? {} : { recovery: row.recovery }),
    }));
  }
  async save(input: unknown) {
    const source = record(input, [
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
      "recovery",
    ]);
    const id = identity(source.projectId),
      type = projectType(source.projectType),
      expected = revision(source.expectedRevision, true);
    const names = nameFields(source.name),
      content = renamePayload(type, payload(type, source.payload), names.name);
    if (type === "composition")
      (
        content as import("../../simulations/creation-and-editing/authoring-engine/document").CompositeRecipe
      ).id = id;
    let credits: Attribution[] | undefined;
    if (source.sourcePublicationIds !== undefined) {
      if (
        !Array.isArray(source.sourcePublicationIds) ||
        source.sourcePublicationIds.length > 20
      )
        throw new ProjectError(
          "Use at most twenty community source references.",
        );
      const current = await this.collection().findOne({
        ownerId: this.ownerId,
        projectId: id,
        projectType: type,
      });
      credits = [
        ...(current?.attributions ?? []),
        ...(current?.basedOn ? [current.basedOn] : []),
      ];
      for (const sourceId of source.sourcePublicationIds) {
        const validId = identity(sourceId);
        if (credits.some((credit) => credit.publicationId === validId))
          continue;
        const original = await new CommunityRepository(this.db).get(validId);
        credits.push({
          publicationId: original.publicationId,
          name: original.name,
          authorName: original.authorName,
        });
      }
      credits = [
        ...new Map(
          credits.map((credit) => [credit.publicationId, credit]),
        ).values(),
      ];
      if (credits.length > 20)
        throw new ProjectError(
          "This project already has twenty community sources.",
        );
    }
    if (typeof source.sharingAllowed !== "boolean")
      throw new ProjectError("Sharing permission must be explicitly set.");
    const description = text(source.description ?? "", 2000, "Description"),
      labels = tags(source.tags ?? []);
    const recovery =
      source.recovery === undefined
        ? undefined
        : text(source.recovery, 1_000_000, "Recovery copy");
    const fields = {
      ...names,
      payload: content,
      description,
      tags: labels,
      sharingAllowed: source.sharingAllowed,
      updatedAt: new Date(),
      ...(recovery === undefined ? {} : { recovery }),
      ...(credits ? { attributions: credits } : {}),
    };
    if (expected === null) {
      const retryKey =
        source.idempotencyKey === undefined
          ? undefined
          : identity(source.idempotencyKey);
      const retryHash = hash({ ...source, idempotencyKey: undefined });
      if (retryKey) {
        const existing = await this.collection().findOne({
          ownerId: this.ownerId,
          createKey: retryKey,
        });
        if (existing) {
          if (
            existing.projectId !== id ||
            existing.projectType !== type ||
            existing.createHash !== retryHash
          )
            throw new ProjectError(
              "This retry key was used for a different project. Reopen the existing project.",
              409,
              "idempotency_conflict",
            );
          return projectDTO(existing);
        }
      }
      let basedOn: Attribution | undefined;
      if (source.basedOnPublicationId !== undefined) {
        const original = await new CommunityRepository(this.db).get(
          identity(source.basedOnPublicationId),
        );
        basedOn = {
          publicationId: original.publicationId,
          name: original.name,
          authorName: original.authorName,
        };
      }
      const createKey =
        source.idempotencyKey === undefined
          ? undefined
          : identity(source.idempotencyKey);
      const createHash = hash({ ...source, idempotencyKey: undefined });
      const row: ProjectRow = {
        ownerId: this.ownerId,
        projectId: id,
        projectType: type,
        ...fields,
        saveRevision: 1,
        createdAt: fields.updatedAt,
        ...(basedOn ? { basedOn } : {}),
        ...(createKey ? { createKey, createHash } : {}),
      };
      try {
        await this.collection().insertOne(row);
      } catch (error) {
        if (
          createKey &&
          error instanceof MongoServerError &&
          error.code === 11000
        ) {
          const previous = await this.collection().findOne({
            ownerId: this.ownerId,
            projectId: id,
            projectType: type,
            createKey,
            createHash,
          });
          if (previous) return projectDTO(previous);
        }
        duplicate(error);
      }
      return projectDTO(row);
    }
    try {
      const row = await this.collection().findOneAndUpdate(
        {
          ownerId: this.ownerId,
          projectId: id,
          projectType: type,
          saveRevision: expected,
        },
        {
          $set: fields,
          ...(recovery === undefined ? { $unset: { recovery: "" } } : {}),
          $inc: { saveRevision: 1 },
        },
        { returnDocument: "after" },
      );
      if (!row)
        throw new ProjectError(
          "This project changed. Reopen it before saving.",
          409,
          "revision_conflict",
        );
      return projectDTO(row);
    } catch (error) {
      duplicate(error);
    }
  }
  async delete(id: string, type: ProjectType, expected: unknown) {
    const result = await this.collection().deleteOne({
      ownerId: this.ownerId,
      projectId: identity(id),
      projectType: type,
      saveRevision: revision(expected) as number,
    });
    if (!result.deletedCount)
      throw new ProjectError(
        "This project changed. Reopen it before deleting.",
        409,
        "revision_conflict",
      );
  }
  async publish(
    client: MongoClient,
    id: string,
    type: ProjectType,
    input: unknown,
    authorName: string,
  ) {
    const source = record(input, [
      "expectedRevision",
      "name",
      "description",
      "tags",
      "idempotencyKey",
      "licenseAccepted",
    ]);
    const expected = revision(source.expectedRevision) as number,
      names = nameFields(source.name),
      key = identity(source.idempotencyKey);
    if (source.licenseAccepted !== true)
      throw new ProjectError(
        "Confirm you have permission to share this content under CC BY 4.0.",
      );
    const projectId = identity(id),
      publicationId = hash([this.ownerId, key]),
      requestHash = hash({ projectId, type, ...source });
    const publications = this.db.collection<PublicationRow>(
      "communityPublications",
    );
    const session = client.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const previous = await publications.findOne(
          { publicationId },
          { session },
        );
        if (previous) {
          if (previous.requestHash !== requestHash)
            throw new ProjectError(
              "This retry key was used for a different publication.",
              409,
              "idempotency_conflict",
            );
          return publicationDTO(previous);
        }
        const project = await this.collection().findOne(
          { ownerId: this.ownerId, projectId, projectType: type },
          { session },
        );
        if (!project)
          throw new ProjectError("Project not found.", 404, "not_found");
        if (project.saveRevision !== expected)
          throw new ProjectError(
            "Your project changed. Save it and review the new candidate.",
            409,
            "revision_conflict",
          );
        if (!project.sharingAllowed)
          throw new ProjectError(
            "Enable community sharing in your project first.",
            403,
            "sharing_disabled",
          );
        const seriesId = hash([this.ownerId, projectId, type]);
        const latest = await publications.findOne(
          { seriesId },
          { session, sort: { versionNumber: -1 } },
        );
        if (latest?.normalizedName === names.normalizedName)
          throw new ProjectError(
            "Choose a different name for the new version.",
            409,
            "name_conflict",
          );
        const candidate = publicPayload(type, project.payload);
        const series = await this.db
          .collection<SeriesRow>("publicationSeries")
          .findOneAndUpdate(
            { seriesId },
            {
              $setOnInsert: {
                authorId: this.ownerId,
                sourceProjectId: projectId,
                projectType: type,
              },
              $inc: { versionNumber: 1 },
            },
            { session, upsert: true, returnDocument: "after" },
          );
        if (!series) throw new Error("Version allocation failed.");
        const row: PublicationRow = {
          publicationId,
          seriesId,
          versionNumber: series.versionNumber,
          authorId: this.ownerId,
          authorName: text(authorName || "Lab author", 100, "Author name"),
          projectType: type,
          ...names,
          description: text(
            source.description ?? project.description,
            2000,
            "Description",
          ),
          tags: tags(source.tags ?? project.tags),
          payload: candidate,
          contentHash: hash(candidate),
          payloadFormatVersion:
            type === "experiment"
              ? (candidate as { documentVersion: number }).documentVersion
              : (candidate as { recipeVersion: number }).recipeVersion,
          publishedAt: new Date(),
          visibility: "published",
          license: "CC-BY-4.0",
          sourceProjectId: projectId,
          sourceRevision: expected,
          requestHash,
          ...(project.basedOn ? { basedOn: project.basedOn } : {}),
          ...(project.attributions?.length
            ? { attributions: project.attributions }
            : {}),
        };
        await publications.insertOne(row, { session });
        await this.collection().updateOne(
          {
            ownerId: this.ownerId,
            projectId,
            projectType: type,
            saveRevision: expected,
          },
          {
            $set: {
              seriesId,
              lastPublicationId: publicationId,
              lastPublishedRevision: expected,
              lastPublishedVersionNumber: series.versionNumber,
            },
          },
          { session },
        );
        return publicationDTO(row);
      });
      if (!result) throw new Error("Publication failed.");
      return result;
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        (error.code === 20 || error.code === 303)
      )
        throw new ProjectError(
          "Publishing requires MongoDB configured as a replica set. Private saving remains available.",
          503,
          "transactions_unavailable",
        );
      if (error instanceof MongoServerError && error.code === 11000)
        throw new ProjectError(
          "That publication name already exists. Choose a different name.",
          409,
          "name_conflict",
        );
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
export class CommunityRepository {
  constructor(readonly db: Db) {}
  async get(id: string) {
    const row = await this.db
      .collection<PublicationRow>("communityPublications")
      .findOne({ publicationId: identity(id), visibility: "published" });
    if (!row)
      throw new ProjectError(
        "Publication is unavailable or withdrawn.",
        404,
        "not_found",
      );
    return publicationDTO(row);
  }
  async list(
    options: ListOptions & { authorId?: string; seriesId?: string } = {},
  ): Promise<Page<PublicationSummary>> {
    const { limit, query, after } = pagination(options);
    const filter: Filter<PublicationRow> = { visibility: "published" };
    if (options.type) filter.projectType = projectType(options.type);
    if (options.authorId) filter.authorId = identity(options.authorId);
    if (options.seriesId) filter.seriesId = identity(options.seriesId);
    if (options.tag) filter.tags = text(options.tag, 40, "Tag");
    if (query)
      filter.$or = [
        { name: { $regex: escapeRegex(query), $options: "i" } },
        { description: { $regex: escapeRegex(query), $options: "i" } },
      ];
    if (after)
      filter.$and = [
        {
          $or: [
            { publishedAt: { $lt: after.at } },
            { publishedAt: after.at, publicationId: { $gt: after.id } },
          ],
        },
      ];
    const rows = await this.db
      .collection<PublicationRow>("communityPublications")
      .find(filter)
      .sort({ publishedAt: -1, publicationId: 1 })
      .limit(limit + 1)
      .toArray();
    const entries = rows.slice(0, limit).map((row) => {
      const {
        payload: _payload,
        contentHash: _hash,
        payloadFormatVersion: _format,
        ...summary
      } = publicationDTO(row);
      return summary;
    });
    const last = rows[limit - 1];
    return {
      entries,
      nextCursor:
        rows.length > limit
          ? Buffer.from(
              JSON.stringify([
                last.publishedAt.toISOString(),
                last.publicationId,
              ]),
            ).toString("base64url")
          : null,
    };
  }
  async withdraw(id: string, ownerId: string) {
    const result = await this.db
      .collection<PublicationRow>("communityPublications")
      .updateOne(
        { publicationId: identity(id), authorId: ownerId },
        { $set: { visibility: "withdrawn" } },
      );
    if (!result.matchedCount)
      throw new ProjectError("Publication not found.", 404, "not_found");
  }
  async report(id: string, ownerId: string, reason: unknown) {
    await this.get(id);
    const message = text(reason, 1000, "Report reason");
    if (!message)
      throw new ProjectError("Explain why this project should be reviewed.");
    await this.db.collection("communityReports").updateOne(
      { publicationId: id, reporterId: ownerId },
      {
        $set: { reason: message, status: "open", updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }
}
