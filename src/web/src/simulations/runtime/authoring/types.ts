import type { ParameterSchema } from "../parameterSchema";

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
export type ComponentInstance = {
  id: string;
  definition: string;
  version: number;
  label: string;
  scope: string;
  configuration: Record<string, unknown>;
};
export type Endpoint = { node: string; port: string };
export type Connection = {
  id: string;
  from: Endpoint;
  to: Endpoint;
  kind: "value" | "command" | "attachment";
  arguments?: Record<string, unknown>;
  argumentBindings?: Record<
    string,
    {
      from: Endpoint;
      path?: string[];
      transform?: "identity" | "not" | "multiply" | "atLeast";
      operand?: number;
    }
  >;
};
export type Layout = {
  id: string;
  node?: string;
  kind:
    | "stack"
    | "row"
    | "grid"
    | "panel"
    | "disclosure"
    | "tabs"
    | "split"
    | "repeater";
  label: string;
  gap: number;
  columns: number;
  mobileColumns?: number;
  alignment?: "stretch" | "start" | "center" | "end";
  font?: "inherit" | "system" | "serif" | "mono";
  fontSize?: number;
  visibleWhen?: Endpoint;
  disabledWhen?: Endpoint;
  theme?: Endpoint;
  children: Layout[];
};
/** Missing exposedPorts in older documents means boundary-only projection.
 * Missing required on legacy recipe ports retains mandatory insertion binding. */
export type ExposedPort = {
  name: string;
  endpoint: Endpoint;
  direction: "input" | "output";
  port: Port;
  required?: boolean;
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
export type Group = {
  id: string;
  label: string;
  members: string[];
  parent?: string;
  source?: { id: string; version: number };
  collapsed: boolean;
  parameters: ExposedParameter[];
  exposedPorts?: ExposedPort[];
};
export type ExposedParameter = {
  name: string;
  node: string;
  field: string;
  schema: ParameterSchema;
  default: unknown;
};
export type AuthoredDocument = {
  formatVersion: 3;
  presentation?: { mode: "flow" } | import("./board").BoardPresentation;
  compatibility?: { source: Record<string, unknown>; notices: string[] };
  nodes: ComponentInstance[];
  connections: Connection[];
  layout: Layout;
  resources: ComponentInstance[];
  scopes: { id: string; label: string }[];
  groups: Group[];
  lesson: { title: string; instruction: string; explanation: string };
  editor: {
    positions: Record<string, { x: number; y: number }>;
    zoom: number;
    pan?: { x: number; y: number };
  };
};
export type CompositeRecipe = {
  recipeVersion: 1 | 2;
  catalog?: {
    icon: string;
    category: "physics" | "mathematics" | "science" | "social-systems";
    order: number;
  };
  id: string;
  version: number;
  title: string;
  description: string;
  tags: string[];
  document: AuthoredDocument;
  nested: { id: string; recipe: string; version: number }[];
  parameters: ExposedParameter[];
  discovery?: DiscoveryMetadata;
  externalPorts: ExposedPort[];
  dependencies: { id: string; version: number }[];
  assumptions: string[];
};
export const emptyLayout = (id = "layout/root"): Layout => ({
  id,
  kind: "stack",
  label: "",
  gap: 16,
  columns: 2,
  children: [],
});
export const emptyAuthoredDocument = (): AuthoredDocument => ({
  formatVersion: 3,
  nodes: [],
  connections: [],
  resources: [],
  scopes: [],
  groups: [],
  layout: emptyLayout(),
  lesson: {
    title: "Untitled experiment",
    instruction: "Explore the experiment.",
    explanation: "",
  },
  editor: { positions: {}, zoom: 1 },
});
