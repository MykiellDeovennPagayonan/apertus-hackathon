"use client";
import { publicDefinition } from "../../catalog";
import { SchemaForm } from "../SchemaForm";


import type { ActionResult } from "../../../runtime/commands";
import type { ModelInstance } from "../../../runtime/contribution";
import type { UIAction } from "../../../runtime/types";

export type ChemistryDispatch = (command: UIAction) => ActionResult;
export function ChemistryNumberControl({
  label,
  initial,
  action,
  instance,
  dispatch,
  report,
}: {
  label: string;
  min: number;
  max: number;
  initial: number;
  action: string;
  instance: ModelInstance;
  dispatch: ChemistryDispatch;
  report: (message: string) => void;
}) {
  const schema = publicDefinition(instance.provider).commands[action]?.arguments;
  if (!schema) return null;
  return <SchemaForm schema={schema} initial={{ value: initial }} label={label} onSubmit={args => {
    const result = dispatch({ type: action, target: instance.id, value: args.value });
    report(result.accepted ? "Change applied." : result.error); return result;
  }} />;
}

export function ChemistryCoefficientControls({
  instance,
  dispatch,
  report,
}: {
  instance: ModelInstance;
  dispatch: ChemistryDispatch;
  report: (message: string) => void;
}) {
  const schema = publicDefinition(instance.provider).commands.CHEM_SET_COEFFICIENTS.arguments;
  const molecules = instance.outputs.molecules as { formula: string; count: number }[];
  return <SchemaForm schema={schema} initial={{ value: molecules.map(m => m.count) }} label="Coefficients (formulas stay fixed)" onSubmit={args => { const result = dispatch({ type: "CHEM_SET_COEFFICIENTS", target: instance.id, value: args.value }); report(result.accepted ? "Coefficients updated. Formulas stay the same." : result.error); return result; }} />;
}
