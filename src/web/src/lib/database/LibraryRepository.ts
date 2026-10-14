import type { Db } from "mongodb";
import type { SavedExperiment } from "../../simulations/builder/persistence/storage";
import type { CompositeRecipe } from "../../simulations/creation-and-editing/authoring-engine/document";
import { parseRecipe } from "../../simulations/creation-and-editing/validator/parseRecipe";
import { migrateOwner } from "../projects/migration";
import { ProjectRepository } from "../projects/Repository";
import { type Project, ProjectError } from "../projects/types";
import { identity, record, revision } from "../projects/validation";
export class LibraryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const experiment = (row: Project): SavedExperiment & { revision: number } => ({
  id: row.projectId,
  document: row.payload as SavedExperiment["document"],
  revision: row.saveRevision,
});
/** Compatibility adapter. All new writes target projects; legacy collections are read-only. */
export class LibraryRepository {
  private repository: ProjectRepository;
  constructor(
    private db: Db,
    private ownerId: string,
  ) {
    this.repository = new ProjectRepository(db, ownerId);
  }
  private async run<T>(fn: () => Promise<T>) {
    try {
      await migrateOwner(this.db, this.ownerId);
      return await fn();
    } catch (error) {
      if (error instanceof ProjectError)
        throw new LibraryError(error.message, error.status);
      throw error;
    }
  }
  async listSimulations() {
    return this.run(async () =>
      (await this.repository.all("experiment")).map((row) => ({
        ...experiment(row),
        ...(row.recovery === undefined ? {} : { recovery: row.recovery }),
      })),
    );
  }
  async getSimulation(id: string) {
    return this.run(async () => {
      try {
        const row = await this.repository.get(identity(id));
        const recovery = await this.repository.recoveryCopy(id, "experiment");
        return {
          ...experiment(row),
          ...(recovery === undefined ? {} : { recovery }),
        };
      } catch (e) {
        if (e instanceof ProjectError && e.status === 404) return null;
        throw e;
      }
    });
  }
  async saveSimulation(source: unknown) {
    return this.run(async () => {
      const input = record(source, [
        "id",
        "document",
        "recovery",
        "expectedRevision",
      ]);
      const id = identity(input.id),
        expected = revision(input.expectedRevision, true);
      const document = input.document as SavedExperiment["document"];
      let previous: Project | undefined;
      if (expected !== null) {
        try {
          previous = await this.repository.get(id);
        } catch {
          /* revision failure handled below */
        }
      }
      return experiment(
        await this.repository.save({
          projectId: id,
          projectType: "experiment",
          name: document?.lesson?.title,
          description: previous?.description ?? "",
          tags: previous?.tags ?? [],
          payload: document,
          sharingAllowed: previous?.sharingAllowed ?? false,
          expectedRevision: expected,
          ...(input.recovery === undefined ? {} : { recovery: input.recovery }),
        }),
      );
    });
  }
  async listComponents() {
    return this.run(async () =>
      (await this.repository.all("composition")).map((row) => ({
        recipe: row.payload as CompositeRecipe,
        revision: row.saveRevision,
      })),
    );
  }
  async getComponent(id: string) {
    return this.run(async () => {
      try {
        const row = await this.repository.get(identity(id), "composition");
        return {
          recipe: row.payload as CompositeRecipe,
          revision: row.saveRevision,
        };
      } catch (e) {
        if (e instanceof ProjectError && e.status === 404) return null;
        throw e;
      }
    });
  }
  async saveComponent(source: unknown) {
    return this.run(async () => {
      const input = record(source, ["recipe", "expectedRevision"]),
        expected = revision(input.expectedRevision, true);
      let recipe: CompositeRecipe;
      try {
        recipe = parseRecipe(input.recipe);
      } catch (error) {
        throw new ProjectError(
          error instanceof Error ? error.message : "Invalid recipe.",
        );
      }
      let previous: Project | undefined;
      if (expected !== null) {
        try {
          previous = await this.repository.get(recipe.id, "composition");
        } catch {
          /* handled on save */
        }
      }
      const row = await this.repository.save({
        projectId: recipe.id,
        projectType: "composition",
        name: recipe.title,
        description: previous?.description ?? recipe.description,
        tags: previous?.tags ?? recipe.tags,
        payload: recipe,
        sharingAllowed: previous?.sharingAllowed ?? false,
        expectedRevision: expected,
      });
      return {
        recipe: row.payload as CompositeRecipe,
        revision: row.saveRevision,
      };
    });
  }
}
