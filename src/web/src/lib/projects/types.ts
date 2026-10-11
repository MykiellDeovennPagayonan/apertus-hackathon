import type { ExperimentDocument } from "../../simulations/builder/document/types";
import type { CompositeRecipe } from "../../simulations/runtime/authoring/types";
export type ProjectType = "experiment" | "composition";
export type ProjectPayload = ExperimentDocument | CompositeRecipe;
export type Attribution = {
  publicationId: string;
  name: string;
  authorName: string;
};
export type Project = {
  projectId: string;
  projectType: ProjectType;
  name: string;
  description: string;
  tags: string[];
  payload: ProjectPayload;
  sharingAllowed: boolean;
  saveRevision: number;
  createdAt: string;
  updatedAt: string;
  basedOn?: Attribution;
  attributions?: Attribution[];
  seriesId?: string;
  lastPublicationId?: string;
  lastPublishedRevision?: number;
  lastPublishedVersionNumber?: number;
};
export type ProjectSummary = Omit<Project, "payload">;
export type Publication = {
  publicationId: string;
  seriesId: string;
  versionNumber: number;
  authorId: string;
  authorName: string;
  projectType: ProjectType;
  name: string;
  description: string;
  tags: string[];
  payload: ProjectPayload;
  contentHash: string;
  payloadFormatVersion: number;
  publishedAt: string;
  visibility: "published" | "withdrawn";
  license: "CC-BY-4.0";
  basedOn?: Attribution;
  attributions?: Attribution[];
};
export type PublicationSummary = Omit<
  Publication,
  "payload" | "contentHash" | "payloadFormatVersion"
>;
export type Page<T> = { entries: T[]; nextCursor: string | null };
export class ProjectError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "invalid_input",
  ) {
    super(message);
  }
}
