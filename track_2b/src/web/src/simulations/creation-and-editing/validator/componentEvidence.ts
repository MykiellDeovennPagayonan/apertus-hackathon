import { validateValue } from "../../registry/contracts/parameterSchema";
import type {
  AuthoredDocument,
  ComponentInstance,
  CompositeRecipe,
} from "../authoring-engine/document";
import {
  declarationsSchema,
  defaults,
  IMPORTED_HTML,
  inputValues,
  inspectSource,
  stableSchema,
  type VerificationReport,
} from "../runtime-engine/imported/contract";

export function htmlComponent(recipe: unknown): ComponentInstance | undefined {
  const r = recipe as CompositeRecipe | undefined;
  if (
    r?.document?.nodes?.length === 1 &&
    r.document.nodes[0].definition === IMPORTED_HTML &&
    r.document.resources?.length === 0 &&
    r.nested?.length === 0
  )
    return r.document.nodes[0];
}

export function importedNodes(document?: AuthoredDocument) {
  return (
    document?.nodes.filter((node) => node.definition === IMPORTED_HTML) ?? []
  );
}

export function componentEvidence(node: ComponentInstance): VerificationReport {
  let report: VerificationReport;
  try {
    report = JSON.parse(String(node.configuration.verification));
  } catch {
    throw new Error(`${node.label}: run component checks before publishing.`);
  }
  const manifest = inspectSource(String(node.configuration.source));
  const required = [
    "package",
    "initialize",
    "input-update",
    "resize",
    "input-boundaries",
    "reset",
    "resize-restored",
    "dispose",
    "remount",
    ...(manifest.clock ? ["host-clock"] : []),
  ];
  if (
    !report ||
    report.status !== "passed" ||
    report.apiVersion !== 1 ||
    report.verifierVersion !== "1" ||
    typeof report.sourceHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(report.sourceHash) ||
    typeof report.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(report.checkedAt)) ||
    !Array.isArray(report.checks) ||
    !Array.isArray(report.diagnostics) ||
    report.diagnostics.some(
      (d) => !d || d.severity !== "warning" || typeof d.message !== "string",
    ) ||
    report.checks.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        !["passed", "not-run"].includes(c.status),
    ) ||
    new Set(report.checks.map((c) => c.id)).size !== report.checks.length ||
    required.some(
      (id) =>
        report.checks.filter((c) => c.id === id && c.status === "passed")
          .length !== 1,
    )
  )
    throw new Error(
      `${node.label}: complete technical checks before publishing.`,
    );
  const inputs = inputValues(
    manifest,
    node.configuration.inputs as Record<string, unknown>,
  );
  const settings = {
    ...defaults(manifest.settings),
    ...(node.configuration.settings as object),
  };
  validateValue(declarationsSchema(manifest.settings), report.settings);
  inputValues(manifest, report.inputs);
  if (
    stableSchema(inputs) !== stableSchema(report.inputs) ||
    stableSchema(settings) !== stableSchema(report.settings)
  )
    throw new Error(
      `${node.label}: inputs or settings changed; run checks again.`,
    );
  return report;
}
