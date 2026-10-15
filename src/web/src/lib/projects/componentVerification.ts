import { createHash } from "node:crypto";
import type { AuthoredDocument } from "../../simulations/creation-and-editing/authoring-engine/document";
import {
  componentEvidence,
  importedNodes,
} from "../../simulations/creation-and-editing/validator/componentEvidence";
import { ProjectError } from "./types";

export function verifyPublicationComponents(document?: AuthoredDocument) {
  for (const node of importedNodes(document)) {
    try {
      const report = componentEvidence(node);
      const hash = createHash("sha256")
        .update(String(node.configuration.source), "utf8")
        .digest("hex");
      if (report.sourceHash !== hash)
        throw new Error(`${node.label}: HTML changed; run checks again.`);
    } catch (e) {
      throw new ProjectError(
        e instanceof Error ? e.message : "Component checks are required.",
      );
    }
  }
}
