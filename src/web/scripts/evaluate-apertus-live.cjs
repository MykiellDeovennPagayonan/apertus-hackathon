/** Separate live-model evaluation: schema validity and final-state correctness are independent. */
const { load } = require("./test-loader.cjs");
const { planPrompt } = load("src/lib/apertus/client.ts");
const runtime = load("src/simulations/runtime/session.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const { useBridgeStore } = load("src/simulations/runtime/bridgeSession.ts");
const { useTownStore } = load("src/simulations/runtime/townSession.ts");
const { useElementaryStore } = load(
  "src/simulations/runtime/elementarySession.ts",
);
const { readConfig } = load("src/lib/apertus/config.ts");
const fs = require("node:fs");
const { useMathStore } = load("src/simulations/runtime/mathSession.ts");
const rows = [];
const originalFetch = global.fetch;
let lastModelContent, usage;
global.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const copy = await response.clone().json();
  lastModelContent = copy.choices?.[0]?.message?.content;
  usage = copy.usage;
  return response;
};
async function evaluate(prompt, check, fresh = true) {
  if (fresh) runtime.disposeSession();
  const context = runtime.getExperimentContext(),
    demo = runtime.getActiveDefinition()?.demo ?? null;
  lastModelContent = undefined;
  usage = undefined;
  let plan;
  let schemaValid = false,
    stateCorrect = false,
    error = "";
  try {
    plan = await planPrompt(prompt, demo, context);
    schemaValid = true;
    const result = runtime.executePlan(plan);
    stateCorrect = result.accepted && check(plan);
    if (!result.accepted) error = result.error;
  } catch (e) {
    error = e.message;
  }
  rows.push({
    prompt,
    schemaValid,
    stateCorrect,
    error,
    plan,
    usage,
    ...(!schemaValid ? { lastModelContent } : {}),
  });
  console.log(JSON.stringify(rows.at(-1)));
}
async function main() {
  await evaluate(
    "Compare launches at 30 degrees and 60 degrees on the Moon",
    () => {
      const s = useProjectileStore.getState();
      return (
        s.instances.length === 2 &&
        s.instances[0].launch.angle === 30 &&
        s.instances[1].launch.angle === 60 &&
        s.instances.every((i) => i.gravity === 1.62)
      );
    },
  );
  await evaluate(
    "Make the second one faster",
    () => {
      const s = useProjectileStore.getState();
      return (
        s.instances[0].launch.velocity === 20 &&
        s.instances[1].launch.velocity > 20
      );
    },
    false,
  );
  await evaluate(
    "Change one of the projectiles, but I have not decided which",
    (p) => p.operation === "clarify",
    false,
  );
  await evaluate("Show 3/4", () => {
    const b = useMathStore.getState().board;
    return (
      b.demo === "fraction-builder" &&
      b.bars[0].value.n === 3 &&
      b.bars[0].value.d === 4
    );
  });
  await evaluate("Share 14 between 3 groups", () => {
    const b = useMathStore.getState().board;
    return (
      b.demo === "equal-groups" &&
      b.total === 14 &&
      b.groups === 3 &&
      b.quotient === 4 &&
      b.remainder === 2
    );
  });
  await evaluate(
    "Simulate a chemical reaction between hydrogen and oxygen",
    (p) => p.operation === "unsupported",
  );
  await evaluate(
    "Launch a projectile at 200 degrees and 1000 m/s",
    (p) => p.operation === "clarify" || p.operation === "unsupported",
  );
  await evaluate("Count 8 circles", () => {
    const b = useMathStore.getState().board;
    return b.demo === "counting" && b.target === 8 && !b.sequence.looping;
  });
  await evaluate("Show subtraction of 4 from 9", () => {
    const b = useMathStore.getState().board;
    return (
      b.demo === "arithmetic" &&
      b.a === 9 &&
      b.b === 4 &&
      b.operation === "subtract" &&
      b.result === 5
    );
  });
  await evaluate("Place 5/4 on a fraction number line", () => {
    const b = useMathStore.getState().board;
    return (
      b.demo === "fraction-number-line" &&
      b.mode === "place" &&
      b.a.n === 5 &&
      b.a.d === 4
    );
  });
  await evaluate(
    "Launch a projectile at 40 degrees and 25 m/s on Earth",
    () => {
      const s = useProjectileStore.getState();
      return (
        s.instances[0].launch.angle === 40 &&
        s.instances[0].launch.velocity === 25 &&
        s.instances[0].gravity === 9.81
      );
    },
  );
  await evaluate("Show a bridge with a 22 ton load in the middle", () => {
    const s = useBridgeStore.getState();
    return (
      runtime.getActiveDefinition()?.demo === "bridge" &&
      s.loadTons === 22 &&
      s.loadPos === 0.5
    );
  });
  await evaluate("Show a small town at 20:00, with time paused", () => {
    const s = useTownStore.getState();
    return (
      runtime.getActiveDefinition()?.demo === "town" &&
      s.time === 20 &&
      !s.playing
    );
  });
  await evaluate(
    "Show 25 percent as a ratio",
    () =>
      runtime.getActiveDefinition()?.demo === "ratio" &&
      useElementaryStore.getState().outputs.percentage === 25,
  );
  await evaluate(
    "Show the area and perimeter of a rectangle 6 metres wide and 4 metres high",
    () => {
      const s = useElementaryStore.getState();
      return (
        s.demo === "area-perimeter" &&
        s.outputs.area === 24 &&
        s.outputs.perimeter === 20
      );
    },
  );
  await evaluate("Plot the coordinate point (-3, 4)", () => {
    const s = useElementaryStore.getState();
    return (
      s.demo === "coordinates" && s.parameters.x === -3 && s.parameters.y === 4
    );
  });
  await evaluate("Roll a six-sided die 1000 times using seed 42", () => {
    const s = useElementaryStore.getState();
    return (
      s.demo === "probability" &&
      s.parameters.preset === "die" &&
      s.parameters.seed === 42 &&
      s.parameters.trials === 1000
    );
  });
  runtime.disposeSession();
  if (process.argv[2]) {
    const c = readConfig();
    fs.writeFileSync(
      process.argv[2],
      `${JSON.stringify(
        {
          model: c.model,
          provider: c.provider,
          evaluatedAt: new Date().toISOString(),
          cases: rows,
        },
        null,
        2,
      )}\n`,
    );
  }
  if (rows.some((r) => !r.schemaValid || !r.stateCorrect)) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
