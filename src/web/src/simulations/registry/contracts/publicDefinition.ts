import type { ParameterSchema } from "./parameterSchema";
export type Port = {
  kind:
    | "value"
    | "dataset"
    | "grid"
    | "event"
    | "command"
    | "attachment"
    | "layout";
  unit: string;
  description?: string;
  schema?: ParameterSchema;
  optional?: boolean;
  cardinality?: "one" | "many";
  crossScope?: boolean;
};
export type PublicDefinition = {
  id: string;
  version: number;
  title: string;
  description: string;
  discovery?: DiscoveryMetadata;
  teaching?: {
    concepts: readonly string[];
    keywords: readonly string[];
    interactions: readonly string[];
    observations: readonly string[];
    limitations: readonly string[];
  };
  category:
    | "models"
    | "controls"
    | "displays"
    | "canvases"
    | "appearance"
    | "behaviors"
    | "resources"
    | "layout";
  /** Scene-led lessons place small controls and captions below the visual. */
  learnerLayout?: "scene-first";
  /** Model output names already communicated by this scene. */
  presentedOutputs?: readonly string[];
  tags: readonly string[];
  configuration: ParameterSchema;
  defaults: Record<string, unknown>;
  inputs: Record<string, Port>;
  outputs: Record<string, Port>;
  commands: Record<
    string,
    {
      arguments: ParameterSchema;
      description: string;
      timing: "live" | "relaunch" | "rebuild";
      submission?: "explicit" | "continuous";
    }
  >;
  placement: readonly string[];
  lifecycle: {
    authored: readonly string[];
    presentation: readonly string[];
    clock: boolean;
    reset: "authored";
    capture: boolean;
  };
  assumptions: readonly string[];
  application?: { target: string };
  configurationReferences?: Record<string, string>;
  runtimeProvider?: string;
  presentationProvider?: string;
};
export type DiscoveryMetadata = {
  kind:
    | "component"
    | "object"
    | "model"
    | "preset"
    | "composite"
    | "experiment";
  group:
    | "objects"
    | "controls"
    | "displays"
    | "canvases"
    | "models"
    | "layout"
    | "composites"
    | "experiments";
  summary: string;
  placement: string;
};
