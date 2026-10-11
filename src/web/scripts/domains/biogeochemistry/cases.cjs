exports.cases = ["oxygen", "nitrogen", "carbon"].map((kind) => ({
  id: `${kind}-cycle`,
  kind,
  prompt: `show me the ${kind} cycle`,
  definition: `prefabs/biogeochemistry/${kind[0].toUpperCase()}${kind.slice(1)}Cycle`,
}));
exports.paraphraseCases = exports.cases.map((c) => ({
  ...c,
  id: `${c.id}-paraphrase`,
  prompt: `can you explain how ${c.kind} moves around nature`,
}));
