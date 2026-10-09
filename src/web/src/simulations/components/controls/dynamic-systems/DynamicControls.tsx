"use client";
import type { ActionResult } from "../../../runtime/commands";
import type { ModelInstance } from "../../../runtime/contribution";
import type { UIAction } from "../../../runtime/types";
import { publicDefinition } from "../../catalog";
import { SchemaForm } from "../SchemaForm";
export type DynamicDispatch = (command: UIAction) => ActionResult;
export function DynamicNumberControl({
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
  step?: number | "any";
  initial: number;
  action: string;
  instance: ModelInstance;
  dispatch: DynamicDispatch;
  report: (message: string) => void;
}) {
  const schema = publicDefinition(instance.provider).commands[action]
    ?.arguments;
  if (!schema) return null;
  return (
    <SchemaForm
      schema={schema}
      initial={{ value: initial }}
      label={label}
      onSubmit={(args) => {
        const result = dispatch({
          type: action,
          target: instance.id,
          value: args.value,
        });
        report(result.accepted ? "Change applied." : result.error);
        return result;
      }}
    />
  );
}
