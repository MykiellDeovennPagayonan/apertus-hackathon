import { type Db, MongoServerError } from "mongodb";
import { validateDocument } from "../../simulations/builder/document/validateDocument";
import type { SavedExperiment } from "../../simulations/builder/persistence/storage";
import type { CompositeRecipe } from "../../simulations/runtime/authoring/types";
import { assertData } from "../../simulations/runtime/authoring/validate";
import { parseRecipe } from "../../simulations/runtime/recipes/schema";

type SimulationRecord = {
  ownerId: string;
  experimentId: string;
  document: SavedExperiment["document"];
  recovery?: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};
type ComponentRecord = {
  ownerId: string;
  recipe: CompositeRecipe;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};

export class LibraryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function identifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,159}$/.test(value)
  )
    throw new LibraryError("Invalid library identity.", 400);
  return value;
}

function envelope(input: unknown, allowed: string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new LibraryError("Expected a library record.", 400);
  for (const key of Object.keys(input))
    if (!allowed.includes(key))
      throw new LibraryError(`Unexpected field: ${key}.`, 400);
  if (!("expectedRevision" in input))
    throw new LibraryError("The expected save revision is required.", 400);
  const expectedRevision = input.expectedRevision;
  if (
    expectedRevision !== null &&
    (typeof expectedRevision !== "number" ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1)
  )
    throw new LibraryError("Invalid save revision.", 400);
  return { input, expectedRevision };
}

function savedExperiment(
  row: SimulationRecord,
): SavedExperiment & { revision: number } {
  return {
    id: row.experimentId,
    document: row.document,
    revision: row.revision,
    ...(row.recovery === undefined ? {} : { recovery: row.recovery }),
  };
}

/** The owner must come from a verified server session, never the request body. */
export class LibraryRepository {
  private simulations;
  private components;

  constructor(
    db: Db,
    private readonly ownerId: string,
  ) {
    identifier(ownerId);
    this.simulations = db.collection<SimulationRecord>("simulations");
    this.components = db.collection<ComponentRecord>("components");
  }

  async listSimulations() {
    const rows = await this.simulations
      .find({ ownerId: this.ownerId })
      .sort({ updatedAt: -1, _id: -1 })
      .toArray();
    return rows.map(savedExperiment);
  }

  async getSimulation(id: string) {
    const row = await this.simulations.findOne({
      ownerId: this.ownerId,
      experimentId: identifier(id),
    });
    return row ? savedExperiment(row) : null;
  }

  async saveSimulation(source: unknown) {
    const { input, expectedRevision } = envelope(source, [
      "id",
      "document",
      "recovery",
      "expectedRevision",
    ]);
    if (!("id" in input) || !("document" in input))
      throw new LibraryError(
        "Experiment identity and document are required.",
        400,
      );
    const id = identifier(input.id);
    const document: unknown = structuredClone(input.document);
    try {
      assertData(document);
      validateDocument(document);
    } catch (error) {
      throw new LibraryError(
        error instanceof Error ? error.message : "Invalid experiment document.",
        400,
      );
    }
    const recovery = "recovery" in input ? input.recovery : undefined;
    if (
      recovery !== undefined &&
      (typeof recovery !== "string" || recovery.length > 1_000_000)
    )
      throw new LibraryError("Invalid recovery copy.", 400);
    const now = new Date();
    if (expectedRevision === null) {
      const row: SimulationRecord = {
        ownerId: this.ownerId,
        experimentId: id,
        document,
        ...(recovery === undefined ? {} : { recovery }),
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await this.simulations.insertOne(row);
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000)
          throw new LibraryError(
            "This experiment already exists. Reopen it before saving.",
            409,
          );
        throw error;
      }
      return savedExperiment(row);
    }
    const row = await this.simulations.findOneAndUpdate(
      { ownerId: this.ownerId, experimentId: id, revision: expectedRevision },
      {
        $set: {
          document,
          updatedAt: now,
          ...(recovery === undefined ? {} : { recovery }),
        },
        ...(recovery === undefined ? { $unset: { recovery: "" } } : {}),
        $inc: { revision: 1 },
      },
      { returnDocument: "after" },
    );
    if (!row)
      throw new LibraryError(
        "This experiment changed. Reopen it before saving.",
        409,
      );
    return savedExperiment(row);
  }

  async listComponents() {
    const rows = await this.components
      .find({ ownerId: this.ownerId })
      .sort({ updatedAt: -1, _id: -1 })
      .toArray();
    return rows.map(({ recipe, revision }) => ({ recipe, revision }));
  }

  async getComponent(id: string) {
    const row = await this.components.findOne({
      ownerId: this.ownerId,
      "recipe.id": identifier(id),
    });
    return row ? { recipe: row.recipe, revision: row.revision } : null;
  }

  async saveComponent(source: unknown) {
    const { input, expectedRevision } = envelope(source, [
      "recipe",
      "expectedRevision",
    ]);
    if (!("recipe" in input))
      throw new LibraryError("A component recipe is required.", 400);
    let recipe: CompositeRecipe;
    try {
      recipe = parseRecipe(input.recipe);
    } catch (error) {
      throw new LibraryError(
        error instanceof Error ? error.message : "Invalid component recipe.",
        400,
      );
    }
    identifier(recipe.id);
    const now = new Date();
    if (expectedRevision === null) {
      const row: ComponentRecord = {
        ownerId: this.ownerId,
        recipe,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await this.components.insertOne(row);
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000)
          throw new LibraryError(
            "This component already exists. Reopen it before saving.",
            409,
          );
        throw error;
      }
      return { recipe, revision: row.revision };
    }
    const row = await this.components.findOneAndUpdate(
      {
        ownerId: this.ownerId,
        "recipe.id": recipe.id,
        revision: expectedRevision,
      },
      { $set: { recipe, updatedAt: now }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!row)
      throw new LibraryError(
        "This component changed. Reopen it before saving.",
        409,
      );
    return { recipe: row.recipe, revision: row.revision };
  }
}
