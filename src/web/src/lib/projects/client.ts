import type {
  Page,
  Project,
  ProjectSummary,
  ProjectType,
  Publication,
  PublicationSummary,
} from "./types";
export async function projectFetch<T>(
  url: string,
  ownerId?: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(ownerId ? { "X-Library-Owner": ownerId } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.message === "string"
        ? result.message
        : "Your library is unavailable.",
    );
  return result;
}
export async function getProject(
  id: string,
  owner: string,
  type: ProjectType = "experiment",
) {
  return (
    await projectFetch<{ entry: Project }>(
      `/api/projects/${encodeURIComponent(id)}?type=${type}`,
      owner,
    )
  ).entry;
}
export async function saveProject(
  project: Pick<
    Project,
    | "projectId"
    | "projectType"
    | "name"
    | "description"
    | "tags"
    | "payload"
    | "sharingAllowed"
  >,
  owner: string,
  expectedRevision: number | null,
  basedOnPublicationId?: string,
  key?: string,
  sourcePublicationIds?: string[],
) {
  return (
    await projectFetch<{ entry: Project }>(
      expectedRevision === null
        ? "/api/projects"
        : `/api/projects/${encodeURIComponent(project.projectId)}`,
      owner,
      expectedRevision === null ? "POST" : "PUT",
      {
        ...project,
        expectedRevision,
        ...(basedOnPublicationId ? { basedOnPublicationId } : {}),
        ...(key ? { idempotencyKey: key } : {}),
        ...(sourcePublicationIds ? { sourcePublicationIds } : {}),
      },
    )
  ).entry;
}
export function listProjects(
  owner: string,
  type?: ProjectType,
  query = "",
  cursor?: string | null,
) {
  const params = new URLSearchParams({
    q: query,
    ...(type ? { type } : {}),
    ...(cursor ? { cursor } : {}),
  });
  return projectFetch<Page<ProjectSummary>>(`/api/projects?${params}`, owner);
}
export function listCommunity(
  type?: ProjectType,
  query = "",
  tag = "",
  cursor?: string | null,
  author?: string,
  seriesId?: string,
) {
  const params = new URLSearchParams({
    q: query,
    ...(type ? { type } : {}),
    ...(tag ? { tag } : {}),
    ...(cursor ? { cursor } : {}),
    ...(author ? { author } : {}),
  });
  return projectFetch<Page<PublicationSummary>>(
    `/api/community${seriesId ? `/series/${seriesId}` : ""}?${params}`,
  );
}
export async function getPublication(id: string) {
  return (
    await projectFetch<{ entry: Publication }>(
      `/api/community/${encodeURIComponent(id)}`,
    )
  ).entry;
}
export async function publishProject(
  project: Project,
  owner: string,
  candidate: {
    name: string;
    description: string;
    tags: string[];
    licenseAccepted: boolean;
    idempotencyKey: string;
  },
) {
  return (
    await projectFetch<{ entry: Publication }>(
      `/api/projects/${encodeURIComponent(project.projectId)}/publications?type=${project.projectType}`,
      owner,
      "POST",
      { ...candidate, expectedRevision: project.saveRevision },
    )
  ).entry;
}
export function downloadPayload(payload: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "project"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPublication(publication: Publication) {
  downloadPayload(
    {
      apertusExportVersion: 1,
      publicationId: publication.publicationId,
      name: publication.name,
      authorName: publication.authorName,
      license: publication.license,
      contentHash: publication.contentHash,
      attributions: publication.attributions ?? [],
      payload: publication.payload,
    },
    publication.name,
  );
}
