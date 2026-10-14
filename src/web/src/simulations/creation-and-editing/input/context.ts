import type { GenerationRequest } from "./contracts";
export function currentConfiguration(request: GenerationRequest, id: string) {
  const active = request.active!;
  const instances = [
    ...active.recipe.document.nodes,
    ...active.recipe.document.resources,
  ];
  const node = instances.find((node) => node.id === id)!;
  const state = active.runtimeContext[id];
  if (!state || typeof state !== "object" || Array.isArray(state))
    return node.configuration;
  const live =
    "config" in state && state.config && typeof state.config === "object"
      ? state.config
      : state;
  return Object.fromEntries(
    Object.entries(node.configuration).map(([field, value]) => [
      field,
      Object.hasOwn(live, field)
        ? (live as Record<string, unknown>)[field]
        : value,
    ]),
  );
}
