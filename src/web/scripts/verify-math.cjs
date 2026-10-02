const assert = require("node:assert/strict");
module.exports = function verifyMath({ load, React, renderToStaticMarkup }) {
  const { createMathBoard } = load(
    "src/simulations/components/prefabs/MathBoards.ts",
  );
  const { mathDemos, updateMathBoard, stepMathBoard, mathComplete } = load(
    "src/simulations/runtime/mathModel.ts",
  );
  const { useMathStore } = load("src/simulations/runtime/mathSession.ts");
  const { activateSession, disposeSession, dispatchCommand } = load(
    "src/simulations/runtime/session.ts",
  );
  const { resolveComposition, stageComposition } = load(
    "src/simulations/runtime/validation.ts",
  );
  const { resolveExperimentPrompt } = load(
    "src/app/_lib/resolveExperimentPrompt.ts",
  );
  const { parseFollowUp } = load(
    "src/simulations/components/controls/PromptControl.ts",
  );
  const { mathReadout } = load(
    "src/simulations/components/views/MathReadoutView.tsx",
  );
  function apply(board, type, value) {
    const outcome = updateMathBoard(board, { type, value });
    assert.equal(outcome.result.accepted, true, outcome.result.error);
    return outcome.board;
  }
  function finish(board) {
    let guard = 0;
    while (!mathComplete(board)) {
      board = apply(board, "NEXT_STEP");
      assert.ok(++guard <= 60);
    }
    return board;
  }
  function invalid(board, type, value) {
    const outcome = updateMathBoard(board, { type, value });
    assert.equal(outcome.result.accepted, false);
    assert.equal(
      outcome.board,
      board,
      "Rejected commands preserve the previous state",
    );
  }
  let board = createMathBoard("counting");
  const original = structuredClone(board);
  board = apply(board, "COUNT_TOKEN", board.tokens[2].id);
  board = apply(board, "COUNT_TOKEN", board.tokens[2].id);
  assert.equal(board.tokens.filter((t) => t.ordinal !== null).length, 1);
  board = finish(board);
  assert.deepEqual(board.tokens.map((t) => t.ordinal).sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(createMathBoard("counting"), original);
  for (const target of [0, 1, 8, 20]) {
    board = apply(board, "SET_COUNTING_TASK", { mode: "place", target });
    board = finish(board);
    assert.equal(board.tokens.filter((t) => t.zone === 1).length, target);
    board = apply(board, "CHECK_COUNT");
    assert.match(board.feedback, /^Yes/);
    if (target) {
      board = apply(
        board,
        "REMOVE_TOKEN",
        board.tokens.find((t) => t.zone === 1).id,
      );
      board = apply(board, "CHECK_COUNT");
      assert.match(board.feedback, /Try to make/);
    }
  }
  for (const target of [-1, 21, 0.5, NaN, Infinity, "5"])
    invalid(board, "SET_COUNTING_TASK", { mode: "count", target });
  invalid(board, "COUNT_TOKEN", "missing");
  for (const operation of ["add", "subtract"]) {
    for (let a = 0; a <= 20; a++)
      for (let b = 0; b <= 20; b++) {
        if (operation === "add" ? a + b > 20 : b > a) continue;
        let arithmetic = apply(
          createMathBoard("arithmetic"),
          "SET_ARITHMETIC_TASK",
          { a, b, operation },
        );
        arithmetic = finish(arithmetic);
        assert.equal(
          arithmetic.tokens.filter((t) => t.zone === 0).length,
          operation === "add" ? a + b : a - b,
        );
        assert.equal(arithmetic.result, operation === "add" ? a + b : a - b);
        const replay = apply(arithmetic, "REPLAY");
        assert.equal(replay.sequence.cursor, 0);
        assert.equal(replay.a, a);
      }
  }
  board = createMathBoard("arithmetic");
  invalid(board, "SET_ARITHMETIC_TASK", { a: 2, b: 3, operation: "subtract" });
  invalid(board, "SET_ARITHMETIC_TASK", { a: 20, b: 1, operation: "add" });
  invalid(board, "MOVE_TOKEN", board.tokens[0].id);
  for (let groups = 1; groups <= 6; groups++)
    for (let total = 0; total <= 60; total++) {
      const shared = finish(
        apply(createMathBoard("equal-groups"), "SET_GROUPING_TASK", {
          mode: "share",
          groups,
          total,
          perGroup: 0,
        }),
      );
      for (let i = 0; i < groups; i++)
        assert.equal(
          shared.tokens.filter((t) => t.zone === i).length,
          Math.floor(total / groups),
        );
      assert.equal(
        shared.tokens.filter((t) => t.zone === -1).length,
        total % groups,
      );
      assert.equal(shared.tokens.length, total);
    }
  board = createMathBoard("equal-groups");
  invalid(board, "SET_GROUPING_TASK", {
    mode: "share",
    groups: 0,
    total: 12,
    perGroup: 0,
  });
  assert.match(
    mathReadout(
      finish(
        apply(board, "SET_GROUPING_TASK", {
          mode: "share",
          groups: 3,
          total: 14,
          perGroup: 0,
        }),
      ),
    ).equation,
    /4 remainder 2/,
  );
  board = createMathBoard("fraction-builder");
  invalid(board, "SET_FRACTION_COMPARISON", {
    a: { n: 1, d: 2 },
    b: { n: 1, d: 0 },
  });
  board = apply(board, "SET_FRACTION_COMPARISON", {
    a: { n: 1, d: 2 },
    b: { n: 2, d: 4 },
  });
  assert.equal(board.relation, "=");
  board = apply(board, "TOGGLE_FRACTION_PIECE", { bar: 0, piece: 0 });
  board = apply(board, "TOGGLE_FRACTION_PIECE", { bar: 0, piece: 1 });
  board = apply(board, "SUBDIVIDE_FRACTION", { bar: 0, factor: 2 });
  assert.deepEqual(board.bars[0].shaded, [false, false, true, true]);
  assert.deepEqual(board.bars[0].value, { n: 2, d: 4 });
  assert.equal(board.relation, "=");
  board = apply(board, "SET_BAR_FRACTION", {
    bar: 0,
    fraction: { n: 1, d: 3 },
  });
  assert.equal(board.relation, "<");
  invalid(board, "SET_BAR_FRACTION", { bar: 0, fraction: { n: 1, d: 0 } });
  invalid(board, "SUBDIVIDE_FRACTION", { bar: 0, factor: 5 });
  invalid(board, "TOGGLE_FRACTION_PIECE", { bar: 2, piece: 0 });
  board = finish(createMathBoard("fraction-number-line"));
  assert.deepEqual(board.result, { n: 3, d: 4 });
  board = apply(board, "SET_NUMBER_LINE_TASK", {
    mode: "subtract",
    a: { n: 3, d: 2 },
    b: { n: 1, d: 4 },
  });
  board = finish(board);
  assert.deepEqual(board.result, { n: 5, d: 4 });
  assert.match(mathReadout(board).detail, /1 1\/4/);
  invalid(board, "SET_TICK_DIVISIONS", 3);
  invalid(board, "SET_NUMBER_LINE_TASK", {
    mode: "subtract",
    a: { n: 0, d: 1 },
    b: { n: 1, d: 2 },
  });
  invalid(board, "SET_NUMBER_LINE_TASK", {
    mode: "add",
    a: { n: 3, d: 1 },
    b: { n: 1, d: 2 },
  });
  invalid(board, "SET_NUMBER_LINE_TASK", {
    mode: "add",
    a: { n: 1, d: 0 },
    b: { n: 1, d: 2 },
  });
  board = apply(board, "SET_NUMBER_LINE_TASK", {
    mode: "place",
    a: { n: 5, d: 4 },
    b: { n: 0, d: 1 },
  });
  board = apply(board, "PLACE_FRACTION", 5);
  board = apply(board, "CHECK_PLACEMENT");
  assert.match(board.feedback, /^Yes/);
  board = apply(board, "SET_TICK_DIVISIONS", 12);
  assert.deepEqual(board.placed, { n: 5, d: 4 });
  invalid(board, "PLACE_FRACTION", 37);
  for (const demo of mathDemos) {
    const composition = resolveComposition(demo);
    const [a] = stageComposition(composition),
      [b] = stageComposition(composition);
    assert.notEqual(a, b);
    const names = new Set([
      a.id,
      ...("tokens" in a ? a.tokens : "bars" in a ? a.bars : []).map(
        (t) => t.id,
      ),
    ]);
    assert.equal(
      names.size,
      1 + ("tokens" in a ? a.tokens.length : "bars" in a ? a.bars.length : 0),
    );
    const invalidComposition = structuredClone(composition);
    invalidComposition.instances[0].parameters = {};
    assert.throws(
      () => stageComposition(invalidComposition),
      /invalid initial task|needs a task/,
    );
    const bad = structuredClone(composition);
    bad.actions.push("SET_LOAD");
    assert.throws(() => stageComposition(bad), /unsupported action/);
    activateSession(demo);
    assert.equal(useMathStore.getState().board.demo, demo);
    const scenes = {
      counting: ["CountingScene", "CountingControls"],
      arithmetic: ["ArithmeticScene", "ArithmeticControls"],
      "equal-groups": ["EqualGroupsScene", "EqualGroupsControls"],
      "fraction-builder": ["FractionBuilderScene", "FractionBuilderControls"],
      "fraction-number-line": [
        "FractionNumberLineScene",
        "FractionNumberLineControls",
      ],
    };
    const [sceneName, controlsName] = scenes[demo];
    const scene = load(`src/simulations/components/views/${sceneName}.tsx`)[
      sceneName
    ];
    const controls = load(
      `src/simulations/components/controls/${controlsName}.tsx`,
    )[controlsName];
    const before = useMathStore.getState().board;
    const html = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(scene, { board: before }),
        React.createElement(controls, { board: before }),
      ),
    );
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("Reset"));
    assert.ok(!/NaN|Infinity/.test(html));
    assert.equal(
      useMathStore.getState().board,
      before,
      "Rendering cannot alter model state",
    );
    assert.equal(
      dispatchCommand(demo, { type: "SET_LOAD", value: 20 }).accepted,
      false,
    );
  }
  const prompts = [
    ["counting", "Show me counting circles", "Count 8 circles"],
    ["arithmetic", "Show me addition and subtraction", "Subtract 2 from 5"],
    ["equal-groups", "Show me equal groups", "Share 14 between 3 groups"],
    ["fraction-builder", "Show me fractions", "Show 3/4"],
    [
      "fraction-number-line",
      "Show me a fraction number line",
      "Subtract 1/4 from 3/2",
    ],
  ];
  for (const [demo, start, follow] of prompts) {
    assert.equal(resolveExperimentPrompt(start), demo);
    activateSession(demo);
    assert.equal(parseFollowUp(demo, follow).handled, true);
    assert.equal(parseFollowUp(demo, "write a novel").handled, false);
  }
  board = createMathBoard("arithmetic");
  assert.equal(stepMathBoard(board, 1), board);
  const manual = finish(board);
  let automatic = apply(board, "SET_PLAYING", true);
  for (let i = 0; i < 100; i++) automatic = stepMathBoard(automatic, 0.1);
  assert.deepEqual(automatic.tokens, manual.tokens);
  assert.equal(automatic.sequence.playing, false);
  const paused = apply(automatic, "SET_PLAYING", false);
  assert.equal(stepMathBoard(paused, 10), paused);
  automatic = apply(board, "SET_PLAYING", true);
  automatic = stepMathBoard(automatic, 100);
  assert.equal(
    automatic.sequence.cursor,
    0,
    "Tab suspension cannot race through a task",
  );
  automatic = apply(automatic, "SET_ARITHMETIC_TASK", {
    operation: "subtract",
    a: 5,
    b: 2,
  });
  assert.equal(automatic.sequence.playing, false);
  assert.deepEqual(
    apply(automatic, "RESET").tokens,
    createMathBoard("arithmetic").tokens,
  );
  // Repeating lessons use domain transitions, preserve the task, and hold answers.
  function tickFor(board, seconds) {
    for (let i = 0; i < Math.round(seconds * 10); i++)
      board = stepMathBoard(board, 0.1);
    return board;
  }
  for (const demo of ["counting", "arithmetic", "equal-groups"]) {
    let loop = apply(createMathBoard(demo), "SET_LOOPING", true);
    loop = tickFor(loop, 1.1);
    assert.equal(
      loop.sequence.cursor,
      0,
      "Introduction holds the initial picture",
    );
    loop = tickFor(loop, 0.1);
    assert.equal(loop.sequence.phase, "steps");
    let guard = 0;
    while (loop.sequence.phase !== "answer") {
      loop = stepMathBoard(loop, 0.1);
      assert.ok(++guard < 1000, "A loop must reach its answer");
    }
    assert.equal(mathComplete(loop), true);
    assert.equal(
      loop.sequence.playing,
      true,
      "Completion does not stop repetition",
    );
    const answerTokens = structuredClone(loop.tokens);
    const run = loop.sequence.run;
    loop = tickFor(loop, 2.3);
    assert.equal(loop.sequence.phase, "answer");
    assert.deepEqual(
      loop.tokens,
      answerTokens,
      "Answer stays visible during the hold",
    );
    const paused = apply(loop, "SET_PLAYING", false);
    assert.equal(
      tickFor(paused, 10),
      paused,
      "Pausing freezes the answer hold",
    );
    loop = apply(paused, "SET_PLAYING", true);
    loop = tickFor(loop, 0.1);
    assert.equal(loop.sequence.phase, "intro");
    assert.equal(loop.sequence.run, run + 1);
    assert.equal(loop.sequence.cursor, 0);
    assert.deepEqual(loop.tokens, createMathBoard(demo).tokens);
    loop = apply(loop, "SET_LOOPING", false);
    assert.equal(stepMathBoard(loop, 1), loop);
    invalid(loop, "SET_LOOPING", "yes");
  }
  let countingLoop = apply(createMathBoard("counting"), "SET_LOOPING", true);
  countingLoop = apply(countingLoop, "SET_COUNTING_TASK", {
    mode: "place",
    target: 3,
  });
  assert.equal(
    countingLoop.sequence.playing,
    true,
    "Task changes retain automatic repetition",
  );
  countingLoop = tickFor(countingLoop, 4);
  assert.equal(countingLoop.sequence.phase, "answer");
  assert.equal(countingLoop.tokens.filter((t) => t.zone === 1).length, 3);
  assert.match(countingLoop.feedback, /^Yes/);
  countingLoop = tickFor(countingLoop, 3);
  assert.equal(countingLoop.target, 3, "Repeating preserves configured inputs");
  countingLoop = apply(countingLoop, "SET_COUNTING_TASK", {
    mode: "count",
    target: 0,
  });
  countingLoop = tickFor(countingLoop, 4);
  assert.equal(countingLoop.tokens.length, 0);
  assert.equal(countingLoop.sequence.looping, true);
  assert.ok(countingLoop.sequence.run > 0, "Zero also completes and repeats");
  invalid(createMathBoard("fraction-builder"), "SET_LOOPING", true);
  activateSession("counting");
  assert.equal(useMathStore.getState().board.sequence.looping, true);
  assert.equal(useMathStore.getState().board.sequence.playing, true);
  disposeSession();
  assert.equal(useMathStore.getState().board.sequence.playing, false);
  const frames = new Map();
  let nextFrame = 0;
  global.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  global.cancelAnimationFrame = (id) => frames.delete(id);
  activateSession("counting");
  assert.equal(frames.size, 1);
  dispatchCommand("counting", { type: "SET_PLAYING", value: true });
  activateSession("fraction-builder");
  assert.equal(frames.size, 0);
  assert.equal(useMathStore.getState().board.sequence.playing, false);
  activateSession("arithmetic");
  assert.equal(frames.size, 1);
  disposeSession();
  assert.equal(frames.size, 0);
  assert.equal(
    dispatchCommand("arithmetic", { type: "NEXT_STEP" }).accepted,
    false,
    "Disposed math sessions reject stale commands",
  );
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  console.log(
    "Five math simulations: models, commands, SVG rendering, and lifecycle verification passed.",
  );
};
