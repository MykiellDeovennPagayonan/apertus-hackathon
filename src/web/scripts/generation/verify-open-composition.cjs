const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../test-loader.cjs");

const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const {
  cleanJsonText,
  normalizeEnvelope,
  normalizeReferences,
  fixAndValidateToolResponse,
  fixConfiguration,
} = load("src/lib/planner/formatFixer.ts");
const { verifyExplicitQuantities } = load("src/lib/planner/constraints.ts");
const {
  suggestConnections,
  autoConnectUnambiguous,
  checkRunnable,
} = load("src/simulations/runtime/authoring/runnable.ts");
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { emptyAuthoredDocument } = load("src/simulations/runtime/authoring/types.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { RecipeLesson } = load("src/simulations/components/views/RecipeLesson.tsx");
const { formatUserFacingDetails, formatUserFacingStatus } = load("src/lib/planner/errorFormatting.ts");
const { parseCoverage } = load("src/lib/planner/schema.ts");

async function testBucket() {
  const bucket = retrieveComponentBucket(
    "I wanna know the difference if I have higher friction or weight in momentum",
    {
      goal: "compare friction and weight in momentum",
      concepts: ["friction", "weight", "momentum"],
      interactions: ["change friction", "change weight"],
      observations: ["momentum", "stopping distance"],
      explicitConstraints: [],
      suggestedStructure: "comparison",
    },
    12,
  );

  assert.ok(bucket.length > 0, "Bucket returns cards");
  assert.ok(bucket.length <= 12, "Bucket respects maxCards limit");

  const serialized = JSON.stringify(bucket);
  assert.ok(serialized.length <= 6000, `Bucket size <= 6000 chars (was ${serialized.length})`);

  const initialCards = bucket.filter((c) => c.kind === "initial");
  const compositeCards = bucket.filter((c) => c.kind === "composite");
  assert.ok(initialCards.length > 0, "Initial cards present in bucket");

  // Verify essential scaffolding is present
  const hasDisplay = bucket.some((c) => c.id.startsWith("displays/"));
  const hasControl = bucket.some((c) => c.id.startsWith("controls/"));
  assert.ok(hasDisplay, "Bucket contains at least one display card");
  assert.ok(hasControl, "Bucket contains at least one control card");

  console.log(`Bucket test passed: ${bucket.length} cards (${initialCards.length} initial, ${compositeCards.length} composite, ${serialized.length} chars).`);
}

function testFormatFixer() {
  // 1. Clean markdown fences
  const fenced = "```json\n{\"tool\":\"add_control\",\"arguments\":{\"target\":\"a\",\"command\":\"set\",\"field\":\"v\",\"widget\":\"slider\",\"label\":\"L\"}}\n```";
  const c1 = cleanJsonText(fenced);
  assert.equal(c1.error, undefined);
  assert.ok(c1.fixes.includes("stripped_markdown_fence"));

  // 2. Trailing commas
  const trailing = "{\"tool\":\"remove\",\"arguments\":{\"targets\":[\"a\", \"b\", ], }, }";
  const c2 = cleanJsonText(trailing);
  assert.equal(c2.error, undefined);
  assert.ok(c2.fixes.includes("removed_trailing_commas"));
  const parsedTrailing = JSON.parse(c2.cleaned);
  assert.deepEqual(parsedTrailing.arguments.targets, ["a", "b"]);

  // 3. Trim outer prose
  const prose = "Here is the tool you requested:\n{\"action\":\"done\"}\nHope this helps!";
  const c3 = cleanJsonText(prose);
  assert.equal(c3.error, undefined);
  assert.ok(c3.fixes.includes("trimmed_outer_prose"));
  assert.equal(c3.cleaned, "{\"action\":\"done\"}");

  // 4. Multiple JSON objects rejected
  const multiple = "{\"a\":1}\n{\"b\":2}";
  const c4 = cleanJsonText(multiple);
  assert.ok(c4.error && c4.error.includes("Multiple JSON objects"));

  // 5. Truncated output rejected
  const truncated = "{\"tool\":\"insert_component\",\"arguments\":{\"definition\":\"models/a\"";
  const c5 = cleanJsonText(truncated);
  assert.ok(c5.error, "Truncated JSON rejected");

  // 6. Envelope unwrapping and alias
  const turnEnvelope = {
    action: "tool",
    tool: {
      tool: "configure",
      args: { target: "model1", changes: { height: 2 } },
    },
    note: "adjusting height",
  };
  const envNorm = normalizeEnvelope(turnEnvelope);
  assert.equal(envNorm.action, "tool");
  assert.ok(envNorm.fixes.includes("unwrapped_turn_envelope"));
  assert.ok(envNorm.fixes.includes("normalized_args_to_arguments"));
  assert.equal(envNorm.normalized.arguments.target, "model1");

  // 7. Reference normalization
  const req = {
    tool: "configure",
    arguments: { target: "  Track_1  ", changes: { height: 1 } },
  };
  const refNorm = normalizeReferences(req, ["track_1", "track_2"]);
  assert.equal(refNorm.request.arguments.target, "track_1");
  assert.ok(refNorm.fixes.some((f) => f.includes("normalized_target")));

  // 8. Full pipeline test
  const fullRaw = "```json\n{\"action\":\"tool\",\"tool\":{\"tool\":\"configure\",\"args\":{\"target\":\"TRACK_1\",\"changes\":{\"height\":1.5},},}}\n```";
  const fullResult = fixAndValidateToolResponse(fullRaw, ["track_1"]);
  assert.equal(fullResult.issues.length, 0);
  assert.equal(fullResult.action, "tool");
  assert.equal(fullResult.request.tool, "configure");
  assert.equal(fullResult.request.arguments.target, "track_1");

  // 9. Deleting (remove) format normalization
  const removeString = { tool: "remove", arguments: { targets: "track_1" } };
  const removeNorm = normalizeReferences(removeString, ["track_1"]);
  assert.deepEqual(removeNorm.request.arguments.targets, ["track_1"]);
  assert.ok(removeNorm.fixes.includes("normalized_remove_targets_string_to_array"));

  const removeSingular = { tool: "remove", arguments: { target: "track_1" } };
  const removeSingularNorm = normalizeReferences(removeSingular, ["track_1"]);
  assert.deepEqual(removeSingularNorm.request.arguments.targets, ["track_1"]);
  assert.ok(removeSingularNorm.fixes.includes("normalized_remove_target_to_targets"));

  // 10. Setting configurations format normalization (string numbers, aliases)
  const docMock = {
    nodes: [
      {
        id: "track_1",
        definition: "prefabs/physical-systems/RollingTrack",
        version: 1,
        label: "Track",
        scope: "scope1",
        configuration: { resistance: 0.1, height: 1, gravity: 9.81 },
      },
    ],
  };
  const configWithFriction = {
    tool: "configure",
    arguments: { target: "track_1", changes: { friction: "0.25" } },
  };
  const configNorm = normalizeReferences(configWithFriction, ["track_1"], docMock);
  assert.equal(configNorm.request.arguments.changes.resistance, 0.25);
  assert.equal(configNorm.request.arguments.changes.friction, undefined);
  assert.ok(configNorm.fixes.includes("normalized_config_friction_to_resistance"));
  assert.ok(configNorm.fixes.includes("coerced_config_friction_string_to_number"));

  // 11. Connecting format normalization (snake_case ports and swapped from/to)
  const connectSnake = {
    tool: "connect",
    arguments: {
      from: { node: "track_1", port: "stopping_distance" },
      to: { node: "display_1", port: "value" },
    },
  };
  const connectNorm = normalizeReferences(connectSnake, ["track_1", "display_1"], docMock);
  assert.equal(connectNorm.request.arguments.from.port, "stoppingDistance");

  // 12. Bridge 50-tonne configuration fix (resolving the prompt issue from Image 1)
  const bridgePrompt50 = "Help me learn how a truss bridge carries a load. Start with a 50-tonne load halfway across, let me move it, and let me select a beam to inspect its response.";
  const bridgeConfigModelOutput = {
    instances: [
      {
        alias: "A",
        overrides: { position: 0.5, magnitude: 50 }, // Model returned 50 which exceeds schema max 30
      },
    ],
    coverage: { level: "partial", covered: ["truss bridge"], omitted: [], explanation: "" },
  };
  const bridgeFixResult = fixConfiguration(bridgePrompt50, "bridge", bridgeConfigModelOutput);
  assert.equal(bridgeConfigModelOutput.instances[0].overrides.magnitude, 30, "Format fixer must clamp magnitude to schema max 30");
  assert.ok(bridgeFixResult.fixes.some((f) => f.includes("clamped_bridge_magnitude")));
  // Verify that verifyExplicitQuantities now passes cleanly with 0 errors!
  assert.doesNotThrow(() => {
    verifyExplicitQuantities(bridgePrompt50, "bridge", bridgeConfigModelOutput);
  });

  // 13. Arithmetic string coercion & looping configuration fix
  const arithPrompt = "Start with 15 circles and add 8. Let me change the numbers.";
  const arithConfigModelOutput = {
    instances: [
      {
        alias: "A",
        overrides: { task: { a: "15", b: "8", operation: "add" }, looping: true },
      },
    ],
    coverage: { level: "full", covered: ["addition"], omitted: [], explanation: "" },
  };
  const arithFixResult = fixConfiguration(arithPrompt, "arithmetic", arithConfigModelOutput);
  assert.equal(arithConfigModelOutput.instances[0].overrides.task.a, 15);
  assert.equal(arithConfigModelOutput.instances[0].overrides.task.b, 8);
  assert.doesNotThrow(() => {
    verifyExplicitQuantities(arithPrompt, "arithmetic", arithConfigModelOutput);
  });

  // 14. Stripped think tags from reasoning models
  const thinkOutput = "<think>I need to configure track_1 height</think>\n```json\n{\"action\":\"tool\",\"tool\":{\"tool\":\"configure\",\"arguments\":{\"target\":\"track_1\",\"changes\":{\"height\":2}}}}\n```";
  const thinkCleaned = cleanJsonText(thinkOutput);
  assert.ok(thinkCleaned.fixes.includes("stripped_think_tags"));
  assert.equal(thinkCleaned.error, undefined);

  // 15. Unwrapped array of tool calls
  const arrayEnvelope = [{ action: "tool", tool: { tool: "arrange", arguments: { template: "vertical" } } }];
  const arrayNorm = normalizeEnvelope(arrayEnvelope);
  assert.equal(arrayNorm.action, "tool");
  assert.ok(arrayNorm.fixes.includes("unwrapped_array_envelope"));

  // 16. OpenAI function envelope with camelCase tool name and stringified JSON
  const fnEnvelope = {
    function: {
      name: "insertComponent",
      arguments: JSON.stringify({ definition: "BridgeLoad" }),
    },
  };
  const fnNorm = normalizeEnvelope(fnEnvelope);
  assert.equal(fnNorm.normalized.tool, "insert_component");
  assert.ok(fnNorm.fixes.includes("unwrapped_function_envelope"));
  assert.ok(fnNorm.fixes.includes("normalized_tool_insertComponent_to_insert_component"));
  assert.ok(fnNorm.fixes.includes("parsed_stringified_arguments"));

  // 17. Broad full pipeline: short definition, missing version/alias/config
  const broadRaw = "```json\n{\"tool\":\"add_component\",\"parameters\":{\"definition\":\"BridgeLoad\"}}\n```";
  const broadResult = fixAndValidateToolResponse(broadRaw, []);
  assert.equal(broadResult.issues.length, 0);
  assert.equal(broadResult.request.tool, "insert_component");
  assert.equal(broadResult.request.arguments.definition, "models/BridgeLoad");
  assert.equal(broadResult.request.arguments.version, 1);
  assert.deepEqual(broadResult.request.arguments.configuration, {});

  // 18. Shorthand connection strings
  const connString = { tool: "connect", arguments: { from: "track_1:distance", to: "display_1:value" } };
  const connNorm = normalizeReferences(connString, ["track_1", "display_1"]);
  assert.deepEqual(connNorm.request.arguments.from, { node: "track_1", port: "distance" });
  assert.deepEqual(connNorm.request.arguments.to, { node: "display_1", port: "value" });

  // 19. Flattened configure root arguments into changes
  const flatConfig = { tool: "configure", arguments: { target: "track_1", resistance: 0.15 } };
  const flatNorm = normalizeReferences(flatConfig, ["track_1"]);
  assert.equal(flatNorm.request.arguments.changes.resistance, 0.15);
  assert.ok(flatNorm.fixes.includes("collected_root_arguments_into_changes"));

  // 20. Done synonym normalization
  const finishEnv = normalizeEnvelope({ action: "finish", note: "All done" });
  assert.equal(finishEnv.action, "done");

  console.log("Format fixer test passed: all 20 syntax, envelope, configuration, connection, and deletion checks verified.");
}

async function testOpenCompositionGate() {
  const transaction = new AuthoringTransaction(emptyAuthoredDocument());

  // Step 1: Insert track1 (lower resistance floor)
  transaction.execute({
    draftId: transaction.draftId,
    expectedRevision: transaction.revision,
    operationId: "op_insert_track1",
    request: [
      {
        tool: "insert_component",
        arguments: {
          definition: "prefabs/physical-systems/RollingTrack",
          version: 1,
          alias: "track1",
          configuration: { height: 1.0, resistance: 0.05, gravity: 9.81 },
        },
      },
    ],
  });

  // Step 2: Insert track2 (higher resistance floor)
  transaction.execute({
    draftId: transaction.draftId,
    expectedRevision: transaction.revision,
    operationId: "op_insert_track2",
    request: [
      {
        tool: "insert_component",
        arguments: {
          definition: "prefabs/physical-systems/RollingTrack",
          version: 1,
          alias: "track2",
          configuration: { height: 1.0, resistance: 0.20, gravity: 9.81 },
        },
      },
    ],
  });

  // Step 3: Add controls to change resistance on both tracks
  transaction.execute({
    draftId: transaction.draftId,
    expectedRevision: transaction.revision,
    operationId: "op_add_controls",
    request: [
      {
        tool: "add_control",
        arguments: {
          target: "track1",
          command: "ROLL_SET_RESISTANCE",
          field: "value",
          widget: "slider",
          label: "Track 1 Friction (μ)",
        },
      },
      {
        tool: "add_control",
        arguments: {
          target: "track2",
          command: "ROLL_SET_RESISTANCE",
          field: "value",
          widget: "slider",
          label: "Track 2 Friction (μ)",
        },
      },
    ],
  });

  // Step 4: Add readouts for stopping distance
  transaction.execute({
    draftId: transaction.draftId,
    expectedRevision: transaction.revision,
    operationId: "op_add_readouts",
    request: [
      {
        tool: "add_observation",
        arguments: {
          source: "track1",
          output: "stoppingDistance",
          widget: "readout",
          label: "Track 1 Stopping Distance",
        },
      },
      {
        tool: "add_observation",
        arguments: {
          source: "track2",
          output: "stoppingDistance",
          widget: "readout",
          label: "Track 2 Stopping Distance",
        },
      },
    ],
  });

  // Step 5: Set lesson information
  const r5 = transaction.execute({
    draftId: transaction.draftId,
    expectedRevision: transaction.revision,
    operationId: "op_set_lesson",
    request: [
      {
        tool: "set_lesson",
        arguments: {
          title: "Higher vs Lower Friction on Rolling Tracks",
          instruction: "Compare the stopping distances of two tracks with different friction coefficients.",
          explanation: "Friction (rolling resistance μ) causes deceleration a = μg. Higher friction causes shorter stopping distance s = h/μ. Mass and momentum are independent of stopping distance in this model.",
        },
      },
      {
        tool: "arrange",
        arguments: {
          template: "comparison",
          main: [],
          controls: [],
          results: [],
          narrowOrder: [],
          preserveLocked: true,
        },
      },
    ],
  });
  if (r5.status !== "applied") {
    console.error("Step 5 rejected:", r5.issues);
  }
  assert.equal(r5.status, "applied");

  // Step 6: Test runnable check
  const runCheck = checkRunnable(transaction.document);
  assert.equal(runCheck.runnable, true, `Document is runnable: ${runCheck.issues.join("; ")}`);

  // Step 7: Finalize recipe
  const recipe = finalizeRecipe(transaction.document);
  assert.ok(recipe.id, "Finalized recipe has id");
  assert.equal(recipe.document.nodes.length >= 6, true, "Nodes present");

  // Step 8: Load recipe in runtime
  const loaded = loadRecipe(recipe);
  assert.ok(loaded.runtime, "Runtime initialized");
  const snap = loaded.runtime.getSnapshot();
  const track1Id = transaction.handles.track1;
  const track2Id = transaction.handles.track2;
  assert.ok(track1Id && snap.state[track1Id], "track1 state initialized");
  assert.ok(track2Id && snap.state[track2Id], "track2 state initialized");

  // Stopping distance = h / μ
  // track1: 1.0 / 0.05 = 20 m
  // track2: 1.0 / 0.20 = 5 m
  assert.equal(snap.outputs[track1Id].stoppingDistance, 20);
  assert.equal(snap.outputs[track2Id].stoppingDistance, 5);

  // Step 9: Render in RecipeLesson
  const html = renderToStaticMarkup(React.createElement(RecipeLesson, { document: recipe.document }));
  assert.ok(html.includes("recipe-lesson"), "Rendered HTML contains recipe-lesson class");
  assert.ok(html.includes("Track 1 Friction"), "Rendered HTML contains control label");

  console.log("Phase 2 gate passed: Hand-scripted open composition built, validated, runtime-tested (20m vs 5m), and rendered via RecipeLesson!");
}

function testErrorFormattingAndCoverageCapping() {
  // Test 1: User-facing formatting for array range
  const msg1 = formatUserFacingDetails("coverage.covered: expected 0–12 items");
  assert.equal(
    msg1,
    "Covered topics: can't be too high or can't be too low (can't have more than 12 items).",
  );

  const msg1Hyphen = formatUserFacingDetails("coverage.covered: expected 0-12 items");
  assert.equal(
    msg1Hyphen,
    "Covered topics: can't be too high or can't be too low (can't have more than 12 items).",
  );

  // Test 2: User-facing formatting for number range
  const msg2 = formatUserFacingDetails("parameters.mass: expected number 1–1000 kg");
  assert.equal(
    msg2,
    "Mass: can't be too high or can't be too low (must be between 1 and 1000 kg).",
  );

  // Test 3: User-facing formatting for integer range
  const msg3 = formatUserFacingDetails("parameters.count: expected integer 1–20");
  assert.equal(
    msg3,
    "Count: can't be too high or can't be too low (must be a whole number between 1 and 20).",
  );

  // Test 4: User-facing formatting for boolean and enum
  const msg4 = formatUserFacingDetails("doc.presentation.particles: expected boolean");
  assert.equal(msg4, "Particles: must be either on or off (yes or no).");

  const msg5 = formatUserFacingDetails("mode: expected one of single, comparison");
  assert.equal(msg5, "Mode: must be one of: single, comparison.");

  // Test 5: User-facing formatting for unknown field
  const msg6 = formatUserFacingDetails("unknown field extraProp");
  assert.equal(msg6, "Unrecognized setting 'extraProp'.");

  // Test 6: Preserves natural multi-line text
  const multi = "Load deflection is simulated.\nFriction and momentum are not simulated.";
  assert.equal(formatUserFacingDetails(multi), multi);

  // Test 7: parseCoverage capping (no exception thrown for 20 items)
  const overflown = {
    level: "partial",
    covered: Array.from({ length: 20 }, (_, i) => `Concept ${i + 1}`),
    omitted: ["Friction"],
    explanation: "Partial explanation",
  };
  const parsed = parseCoverage(overflown);
  assert.equal(parsed.covered.length, 12, "Covered capped to 12 items");
  assert.equal(parsed.omitted.length, 1, "Omitted retained");

  // Test 8: Minimized user-facing status for non-technical users
  const statusReadout = formatUserFacingStatus(
    "Apertus returned invalid stage arguments: A numeric readout cannot display a structured or unavailable output",
  );
  assert.equal(statusReadout, "Couldn't add that measurement display.");

  const statusWidget = formatUserFacingStatus(
    "Apertus returned invalid stage arguments: Widget does not accept this command field",
  );
  assert.equal(statusWidget, "Couldn't add that simulation control.");

  const statusTimeout = formatUserFacingStatus("Apertus timed out. Please try again.");
  assert.equal(statusTimeout, "Request timed out. Please try again.");

  const statusFixture = formatUserFacingStatus("Fixture timeout");
  assert.equal(statusFixture, "Fixture timeout");

  // Test 9: Minimized user-facing details stripping technical debug wrappers
  const detailReadout = formatUserFacingDetails(
    "Apertus returned invalid stage arguments: A numeric readout cannot display a structured or unavailable output",
  );
  assert.equal(
    detailReadout,
    "This measurement contains multiple data points and cannot be shown on a single number readout.",
  );

  const detailWidget = formatUserFacingDetails(
    "Apertus returned invalid stage arguments: Widget does not accept this command field",
  );
  assert.equal(
    detailWidget,
    "This control type cannot be used for that simulation setting.",
  );

  // Test 10: Uncaught / unexpected runtime errors translated to user-facing details
  assert.equal(
    formatUserFacingDetails("Multiple JSON objects found in response; expected exactly one"),
    "The AI generator produced multiple responses. Please try asking again.",
  );
  assert.equal(
    formatUserFacingDetails("Malformed JSON: Unexpected token < in JSON at position 0"),
    "The response had a formatting issue. Please try again.",
  );
  assert.equal(
    formatUserFacingDetails("Failed to fetch"),
    "Could not connect to the network. Please check your connection.",
  );
  assert.equal(
    formatUserFacingDetails("DOMException: Request cancelled"),
    "The request was cancelled.",
  );
  assert.equal(
    formatUserFacingDetails("QuotaExceededError: storage full"),
    "Browser storage is full. Download your recipe to save your progress.",
  );

  // Test 11: Preserved long application status messages
  const appStatus = formatUserFacingStatus(
    "Your lesson is ready, but it couldn't be saved in this browser. Use Save recipe to download it.",
  );
  assert.equal(
    appStatus,
    "Your lesson is ready, but it couldn't be saved in this browser. Use Save recipe to download it.",
  );

  console.log("Error formatting and coverage capping tests passed!");
}

(async () => {
  await testBucket();
  testFormatFixer();
  await testOpenCompositionGate();
  testErrorFormattingAndCoverageCapping();
  console.log("All Phase 2 deterministic tests passed!");
})().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
