// Plan 028 A1 checks for MATH-01 and MATH-03–10 (MATH-02 has verify-pythagorean.cjs).
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../../test-loader.cjs");
const { mathGeometryModels, mathGeometry } = load(
  "src/simulations/domains/math-geometry/index.ts",
);
const { mathGeometryAppearances } = load(
  "src/simulations/components/views/math-geometry/index.ts",
);
const model = (name) => {
  const found = mathGeometryModels.find((m) => m.ref.endsWith(`/${name}`));
  assert.ok(found, name);
  return found;
};
const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected} (±${tolerance})`,
  );
const start = (m, parameters = {}) =>
  m.initialize({ ...structuredClone(m.defaults), ...parameters });
const rejects = (fn, state, m) => {
  const before = JSON.stringify(state);
  assert.throws(fn);
  if (state) assert.equal(JSON.stringify(state), before, `${m?.ref} mutated`);
};
const roundTrip = (m, state) =>
  assert.deepEqual(
    m.initialize(JSON.parse(JSON.stringify(m.configuration(state)))),
    state,
  );
function render(m, state) {
  const View = mathGeometryAppearances[m.presentation];
  assert.ok(View, m.presentation);
  const markup = renderToStaticMarkup(
    React.createElement(View, {
      instance: {
        id: "model",
        label: m.name,
        provider: m.ref,
        parameters: m.configuration(state),
        state,
        outputs: m.measure(state),
      },
    }),
  );
  assert.doesNotMatch(markup, /NaN|Infinity|undefined/, m.ref);
  return markup;
}

// Every model: unique refs/presentations, unique actions, full output contract.
assert.equal(mathGeometryModels.length, 10);
assert.equal(mathGeometry.models.length, 10);
assert.equal(new Set(mathGeometryModels.map((m) => m.presentation)).size, 10);
const actionOwners = new Map();
for (const m of mathGeometryModels) {
  for (const action of Object.keys(m.actions)) {
    assert.ok(!actionOwners.has(action), `${action} duplicated`);
    actionOwners.set(action, m.ref);
  }
  const state = start(m);
  assert.deepEqual(
    Object.keys(m.measure(state)).sort(),
    Object.keys(m.outputs).sort(),
  );
  roundTrip(m, state);
  rejects(() => m.apply(state, "UNKNOWN_ACTION"), state, m);
  assert.ok(m.maximumInstances === 2);
}

// MATH-01 place value: exact integer thousandths.
{
  const m = model("PlaceValue");
  let s = start(m);
  assert.deepEqual(s.counts, [0, 1, 2, 3, 4, 0]);
  assert.equal(m.measure(s).text, "12.34");
  for (let i = 0; i < 3; i++) s = m.apply(s, "PLACE_BREAK_TENTH");
  assert.deepEqual(s.counts, [0, 1, 2, 0, 34, 0]);
  assert.equal(m.measure(s).text, "12.34");
  assert.equal(m.measure(s).change, "same value");
  roundTrip(m, s);
  rejects(() => m.apply(s, "PLACE_BREAK_TENTH"), s, m);
  assert.deepEqual(m.apply(s, "PLACE_TIDY").counts, [0, 1, 2, 3, 4, 0]);
  const times = m.apply(start(m), "PLACE_TIMES_TEN");
  assert.equal(m.measure(times).text, "123.4");
  assert.equal(m.measure(times).before, "12.34");
  assert.equal(m.measure(times).change, "ten times larger");
  rejects(() => m.apply(times, "PLACE_TIMES_TEN"), times, m);
  const divided = m.apply(start(m), "PLACE_DIVIDE_TEN");
  assert.equal(m.measure(divided).text, "1.234");
  rejects(() => m.apply(divided, "PLACE_DIVIDE_TEN"), divided, m);
  assert.equal(
    m.measure(m.apply(start(m, { start: 0.29 }), "PLACE_TIMES_TEN")).text,
    "2.9",
  );
  assert.equal(m.measure(start(m, { start: 0.1 })).text, "0.1");
  assert.equal(
    m.measure(m.apply(start(m), "set:placeStart", 4.56)).text,
    "4.56",
  );
  for (const bad of [-3.2, 12.345, 1000, Number.NaN, "12.34"])
    rejects(() => start(m, { start: bad }));
  rejects(() => m.apply(start(m), "set:placeStart", -3.2), start(m), m);
  const full = start(m, { start: 12.94 });
  let filled = full;
  for (let i = 0; i < 9; i++) filled = m.apply(filled, "PLACE_BREAK_TENTH");
  assert.equal(filled.counts[4], 94);
  const withTenths = m.apply(filled, "PLACE_BREAK_ONE");
  assert.deepEqual(withTenths.counts, [0, 1, 1, 10, 94, 0]);
  assert.equal(m.measure(withTenths).text, "12.94");
  rejects(() => m.apply(withTenths, "PLACE_BREAK_TENTH"), withTenths, m);
  const markup = render(m, s);
  assert.match(markup, /decimal point stays here/);
  render(m, times);
  render(m, start(m, { start: 999.99 }));
}

// MATH-03 tree height: H = eye + d tan θ.
{
  const m = model("TreeHeight");
  const opening = start(m);
  assert.equal(m.measure(opening).aimedAtTop, false);
  assert.ok(m.measure(opening).miss < 0);
  close(m.measure(opening).topAngle, 45);
  const s = m.apply(opening, "set:sightAngle", 45);
  close(m.measure(s).lineHeight, 11.5);
  assert.equal(m.measure(s).aimedAtTop, true);
  close(
    m.measure(start(m, { observerDistance: 20, sightAngle: 30 })).lineHeight,
    1.5 + 20 / Math.sqrt(3),
  );
  // Stepping back at a fixed angle leaves the tree unchanged; the line overshoots.
  const back = m.apply(s, "set:observerDistance", 20);
  assert.deepEqual([back.sightAngle, back.treeHeight], [45, 11.5]);
  close(m.measure(back).lineHeight, 21.5);
  close(m.measure(back).miss, 10);
  assert.equal(m.measure(back).aimedAtTop, false);
  close(m.measure(back).topAngle, (Math.atan(10 / 20) * 180) / Math.PI);
  rejects(() => start(m, { treeHeight: 1.5 }));
  for (const angle of [90, 0, 80.5, Number.NaN])
    rejects(() => m.apply(s, "set:sightAngle", angle), s, m);
  for (const d of [0, -2, 101])
    rejects(() => m.apply(s, "set:observerDistance", d), s, m);
  assert.match(render(m, s), /touches the top: the tree is about 11\.5 m tall/);
  assert.match(render(m, back), /passes 10 m above the top/);
  assert.match(render(m, opening), /below the top\. Aim higher/);
  // The drawn tree does not change when the observer steps back (within 30 m).
  const crown = (markup) =>
    markup.match(
      /<ellipse cx="[^"]+" (cy="[^"]+" rx="[^"]+" ry="[^"]+")[^>]*data-tree/,
    )[1];
  assert.equal(crown(render(m, s)), crown(render(m, back)));
  for (const observerDistance of [10, 100]) {
    const high = render(m, start(m, { observerDistance, sightAngle: 80 }));
    assert.match(high, /data-offscreen="true"/);
    assert.match(high, /sight line continues above this view/);
    const ray = high.match(
      /<line[^>]*x1="90"[^>]*x2="([^"]+)" y2="([^"]+)"[^>]*data-angle="80"/,
    );
    assert.ok(ray, "Visible ray must retain its physical angle");
    close(Number(ray[2]), 20);
    const eyeY =
      340 - 1.5 * Math.min(560 / Math.max(observerDistance, 30), 280 / 11.5);
    close(
      (eyeY - Number(ray[2])) / (Number(ray[1]) - 90),
      Math.tan((80 * Math.PI) / 180),
    );
  }
  assert.doesNotMatch(render(m, s), /data-offscreen/);
  render(m, start(m, { observerDistance: 1, sightAngle: 1, eyeHeight: 0 }));
}

// MATH-04 scale drawing: lengths ×k, area ×k².
{
  const m = model("ScaleDrawing");
  const s = m.apply(start(m), "set:scaleFactor", 2);
  const o = m.measure(s);
  assert.deepEqual(
    [o.scaledWidth, o.scaledLength, o.originalArea, o.scaledArea],
    [6, 8, 12, 48],
  );
  assert.deepEqual([o.originalPerimeter, o.scaledPerimeter], [14, 28]);
  const l = m.measure(m.apply(s, "set:roomShape", "L"));
  assert.deepEqual([l.originalArea, l.scaledArea, l.scaleFactor], [9, 36, 2]);
  close(m.measure(m.apply(s, "set:scaleFactor", 3)).areaFactor, 9);
  for (const k of [0, -2, 4.5])
    rejects(() => m.apply(s, "set:scaleFactor", k), s, m);
  const markup = render(m, s);
  assert.equal((markup.match(/data-copy/g) ?? []).length, 4);
  render(m, start(m, { scaleFactor: 4, roomWidth: 20, roomLength: 20 }));
  render(
    m,
    start(m, {
      scaleFactor: 0.25,
      roomWidth: 1,
      roomLength: 1,
      roomShape: "L",
    }),
  );
}

// MATH-05 rigid motions: order matters, flips reverse orientation, lengths kept.
{
  const m = model("RigidMotion");
  const s = start(m);
  const turnFlip = m.apply(m.apply(s, "MOTION_TURN"), "MOTION_FLIP");
  const flipTurn = m.apply(m.apply(s, "MOTION_FLIP"), "MOTION_TURN");
  assert.notDeepEqual(
    m.measure(turnFlip).vertices,
    m.measure(flipTurn).vertices,
  );
  assert.deepEqual(m.measure(turnFlip).vertices[0], { label: "A", x: 1, y: 1 });
  assert.deepEqual(m.measure(flipTurn).vertices[0], {
    label: "A",
    x: -1,
    y: -1,
  });
  assert.equal(m.measure(m.apply(s, "MOTION_FLIP")).orientation, "mirrored");
  assert.equal(
    m.measure(m.apply(m.apply(s, "MOTION_FLIP"), "MOTION_FLIP")).orientation,
    "same",
  );
  assert.equal(m.measure(m.apply(s, "MOTION_TURN")).orientation, "same");
  let turned = s;
  for (let i = 0; i < 4; i++) turned = m.apply(turned, "MOTION_TURN");
  assert.deepEqual(m.measure(turned).vertices, m.measure(s).vertices);
  assert.ok(m.measure(turnFlip).sidesPreserved);
  const slid = m.apply(s, "MOTION_SLIDE");
  rejects(() => m.apply(slid, "MOTION_SLIDE"), slid, m);
  rejects(() => m.apply(s, "MOTION_UNDO"), s, m);
  assert.deepEqual(m.apply(turnFlip, "MOTION_UNDO").operations, ["turn"]);
  assert.deepEqual(m.apply(turnFlip, "MOTION_RESTART").operations, []);
  roundTrip(m, turnFlip);
  rejects(() => start(m, { operations: ["stretch"] }));
  assert.match(
    render(m, m.apply(s, "MOTION_FLIP")),
    /data-orientation="mirrored"/,
  );
  render(m, s);
}

// MATH-06 tiling: only 3, 4 and 6 fit exactly.
{
  const m = model("RegularTiling");
  const hex = m.measure(start(m));
  assert.deepEqual(
    [hex.interiorAngle, hex.fitAtCorner, hex.gap, hex.fitsExactly],
    [120, 3, 0, true],
  );
  const pent = m.measure(start(m, { tileSides: 5 }));
  assert.deepEqual(
    [
      pent.interiorAngle,
      pent.fitAtCorner,
      pent.angleSum,
      pent.gap,
      pent.overlap,
      pent.fitsExactly,
    ],
    [108, 3, 324, 36, 72, false],
  );
  const exact = [];
  for (let n = 3; n <= 12; n++) {
    const s = start(m, { tileSides: n });
    const o = m.measure(s);
    if (o.fitsExactly) exact.push(n);
    // Independent check: whole tiles never exceed 360° and one more always does.
    assert.ok(
      o.angleSum <= 360 + 1e-9 &&
        (o.fitsExactly || o.angleSum + o.interiorAngle > 360),
    );
    const markup = render(m, s);
    assert.equal((markup.match(/data-tile/g) ?? []).length, o.fitAtCorner);
  }
  assert.deepEqual(exact, [3, 4, 6]);
  for (const n of [2, 13, 5.5])
    rejects(() => m.apply(start(m), "set:tileSides", n), start(m), m);
}

// MATH-07 cube nets: curated presets and the independent 11-of-35 hexomino oracle.
{
  const m = model("CubeNet");
  const { foldNet, netPresets } = load(
    "src/simulations/domains/math-geometry/cubeNet.ts",
  );
  const expected = [true, false, true, false, false, true, true, false];
  let s = start(m);
  for (let i = 0; i < netPresets.length; i++) {
    assert.equal(m.measure(s).valid, expected[i], netPresets[i].name);
    assert.equal(m.measure(s).shapeName, netPresets[i].name);
    const folded = m.apply(s, "NET_FOLD");
    assert.equal(m.measure(folded).folded, true);
    const markup = render(m, folded);
    assert.match(
      markup,
      expected[i] ? /data-cube="closed"/ : /data-cube="open"/,
    );
    render(m, s);
    s = m.apply(folded, "NET_NEXT");
    assert.equal(m.measure(s).folded, false);
  }
  const cross = m.measure(start(m));
  assert.equal(cross.squares.filter((q) => q.face).length, 6);
  assert.notEqual(cross.oppositeOfA, "");
  const strip = m.measure(start(m, { preset: 1 }));
  assert.ok(strip.duplicateFaces.length > 0 && strip.openFaces.length > 0);
  // Enumerate every free hexomino (rotations/reflections identified).
  const canonical = (cells) => {
    const variants = [];
    for (const [a, b, c, d] of [
      [1, 0, 0, 1],
      [0, -1, 1, 0],
      [-1, 0, 0, -1],
      [0, 1, -1, 0],
      [-1, 0, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 0, -1],
      [0, -1, -1, 0],
    ]) {
      const t = cells.map(([x, y]) => [a * x + b * y, c * x + d * y]);
      const mx = Math.min(...t.map((p) => p[0])),
        my = Math.min(...t.map((p) => p[1]));
      variants.push(
        t
          .map(([x, y]) => `${x - mx},${y - my}`)
          .sort()
          .join(";"),
      );
    }
    return variants.sort()[0];
  };
  let shapes = new Map([[canonical([[0, 0]]), [[0, 0]]]]);
  for (let size = 2; size <= 6; size++) {
    const next = new Map();
    for (const cells of shapes.values())
      for (const [x, y] of cells)
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const cell = [x + dx, y + dy];
          if (cells.some(([cx, cy]) => cx === cell[0] && cy === cell[1]))
            continue;
          const grown = [...cells, cell];
          next.set(canonical(grown), grown);
        }
    shapes = next;
  }
  assert.equal(shapes.size, 35);
  const folds = [...shapes.values()].map((cells) =>
    foldNet(cells.map(([x, y]) => ({ x, y }))),
  );
  const nets = folds.filter((f) => f.duplicates.length === 0 && f.consistent);
  assert.equal(nets.length, 11);
  // Hexominoes containing a 2 × 2 block close a hinge loop; none are nets.
  const looped = [...shapes.values()].filter((cells) =>
    cells.some(([x, y]) =>
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ].every(([dx, dy]) =>
        cells.some(([cx, cy]) => cx === x + dx && cy === y + dy),
      ),
    ),
  );
  assert.ok(looped.length > 0);
  for (const cells of looped) {
    const mx = Math.min(...cells.map(([x]) => x)),
      my = Math.min(...cells.map(([, y]) => y));
    const placed = cells.map(([x, y]) => ({ x: x - mx, y: y - my }));
    assert.equal(m.measure(start(m, { cells: placed })).valid, false);
  }
  const custom = m.apply(start(m), "NET_SET_CELLS", [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 1, y: 0 },
    { x: 2, y: 2 },
  ]);
  assert.equal(m.measure(custom).shapeName, "Your shape");
  assert.equal(m.measure(custom).valid, true);
  roundTrip(m, custom);
  const base = start(m);
  const vertical = start(m, {
    cells: Array.from({ length: 6 }, (_, y) => ({ x: 0, y })),
  });
  const verticalMarkup = render(m, vertical);
  for (const rect of verticalMarkup.matchAll(
    /<rect[^>]*y="([^"]+)"[^>]*height="([^"]+)"/g,
  ))
    assert.ok(
      Number(rect[1]) + Number(rect[2]) <= 360,
      "every square fits in the net scene",
    );
  rejects(
    () =>
      m.apply(base, "NET_SET_CELLS", [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
      ]),
    base,
    m,
  );
  rejects(
    () =>
      m.apply(base, "NET_SET_CELLS", [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 2 },
      ]),
    base,
    m,
  );
  rejects(
    () =>
      m.apply(base, "NET_SET_CELLS", [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 1, y: 0 },
      ]),
    base,
    m,
  );
}

// MATH-08 can: closed optimum h = 2r, open optimum h = r.
{
  const m = model("CanPackaging");
  const o = m.measure(start(m));
  close(o.bestRadius, Math.cbrt(500 / (2 * Math.PI)));
  close(o.bestRadius, 4.3013, 1e-4);
  close(o.bestHeight, 2 * o.bestRadius);
  close(o.leastArea, 348.73, 0.01);
  close(o.canHeight, 500 / (Math.PI * 6.25));
  close(o.surfaceArea, 2 * Math.PI * 6.25 + 1000 / 2.5);
  for (const dr of [-0.01, 0.01]) {
    const near = m.measure(start(m, { canRadius: o.bestRadius + dr }));
    assert.ok(near.surfaceArea > o.leastArea);
  }
  const open = m.measure(start(m, { canClosed: false }));
  close(open.bestHeight, open.bestRadius);
  close(open.endsArea, Math.PI * 6.25);
  const best = m.measure(start(m, { canRadius: o.bestRadius }));
  assert.ok(best.extraPercent < 1e-9);
  for (const r of [0, -1, 16])
    rejects(() => m.apply(start(m), "set:canRadius", r), start(m), m);
  assert.equal(m.apply(start(m), "set:canVolume", 1000).canRadius, 2.5);
  render(m, start(m));
  render(m, start(m, { canRadius: 1, canVolume: 2000 }));
  render(m, start(m, { canRadius: 15, canVolume: 100, canClosed: false }));
}

// MATH-09 box packing: volume bound is not a count; layouts are geometric.
{
  const m = model("BoxPacking");
  const cube = start(m, {
    binLength: 10,
    binWidth: 10,
    binHeight: 10,
    boxLength: 6,
    boxWidth: 6,
    boxHeight: 6,
  });
  const c = m.measure(cube);
  assert.deepEqual(
    [c.count, c.volumeLimit, c.bestUniform, c.mixedCount, c.provenBest],
    [1, 4, 1, 1, false],
  );
  const s = start(m);
  const o = m.measure(s);
  assert.deepEqual([o.count, o.bestUniform, o.volumeLimit], [4, 4, 6]);
  const mixed = m.apply(s, "PACK_MIX");
  const mo = m.measure(mixed);
  assert.deepEqual([mo.count, mo.mixedCount, mo.provenBest], [6, 6, true]);
  // Independent geometry check: every placed box is inside and none overlap.
  const boxes = mo.zones.flatMap((z) => {
    const list = [];
    for (let i = 0; i < z.nx; i++)
      for (let j = 0; j < z.ny; j++)
        for (let k = 0; k < z.nz; k++)
          list.push([
            z.x + i * z.box[0],
            z.y + j * z.box[1],
            z.z + k * z.box[2],
            ...z.box,
          ]);
    return list;
  });
  assert.equal(boxes.length, 6);
  for (const [x, y, z, l, w, h] of boxes) {
    assert.ok(
      x >= 0 && y >= 0 && z >= 0 && x + l <= 40 && y + w <= 30 && z + h <= 20,
    );
    assert.deepEqual(
      [l, w, h].sort((a, b) => a - b),
      [10, 15, 25],
    );
  }
  for (let a = 0; a < boxes.length; a++)
    for (let b = a + 1; b < boxes.length; b++) {
      const [p, q] = [boxes[a], boxes[b]];
      const overlap = [0, 1, 2].every(
        (i) => p[i] < q[i] + q[i + 3] && q[i] < p[i] + p[i + 3],
      );
      assert.ok(!overlap, "boxes overlap");
    }
  let turned = s;
  const counts = [];
  for (let i = 0; i < 6; i++) {
    counts.push(m.measure(turned).uniformCount);
    turned = m.apply(turned, "PACK_TURN");
  }
  assert.equal(turned.orientation, 0);
  assert.equal(Math.max(...counts), 4);
  assert.ok(counts.includes(0));
  roundTrip(m, mixed);
  rejects(() => start(m, { boxLength: 0 }));
  assert.match(render(m, mixed), /no layout can beat it/);
  render(m, cube);
  render(
    m,
    start(m, {
      binLength: 300,
      binWidth: 300,
      binHeight: 300,
      boxLength: 1,
      boxWidth: 1,
      boxHeight: 1,
    }),
  );
  render(m, start(m, { boxLength: 300 }));
}

// MATH-10 fencing: A = x(P/2 − x), wall A = x(P − 2x).
{
  const m = model("FencedGarden");
  const s = start(m);
  assert.deepEqual(
    [m.measure(s).gardenDepth, m.measure(s).gardenArea],
    [8, 16],
  );
  const best = m.apply(s, "set:gardenWidth", 5);
  assert.deepEqual(
    [m.measure(best).gardenArea, m.measure(best).largestArea],
    [25, 25],
  );
  const wall = m.measure(start(m, { againstWall: true }));
  assert.deepEqual(
    [wall.bestWidth, wall.bestDepth, wall.largestArea],
    [5, 10, 50],
  );
  const wallMarkup = render(m, start(m, { gardenWidth: 5, againstWall: true }));
  // At the wall optimum, fence covers two 5 m widths and one 10 m depth.
  assert.match(wallMarkup, /d="M 30 40 H 102\.5 V 185 H 30"[^>]*data-fence/);
  assert.match(wallMarkup, /x1="30" y1="30" x2="30" y2="195"[^>]*data-wall/);
  const longer = m.apply(s, "set:fenceLength", 40);
  assert.equal(longer.gardenWidth, 2);
  assert.equal(m.measure(longer).largestArea, 100);
  for (const x of [10, 12, 0, -1])
    rejects(() => m.apply(s, "set:gardenWidth", x), s, m);
  rejects(
    () =>
      m.apply(
        start(m, { fenceLength: 20, gardenWidth: 9 }),
        "set:fenceLength",
        18,
      ),
    undefined,
  );
  for (const point of m.measure(s).curvePoints)
    close(point.y, point.x * (10 - point.x));
  render(m, s);
  render(m, start(m, { gardenWidth: 9.9 }));
  render(
    m,
    start(m, { fenceLength: 200, gardenWidth: 0.1, againstWall: true }),
  );
}
console.log(
  "A1 MATH-01, 03–10 model oracles, boundaries and scene rendering passed",
);

// Integrated recipes: catalog, composition requirements, runtime, save/reopen.
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { assemblyModels, assemblyPresentationContracts } = load(
  "src/simulations/runtime/assembly.ts",
);
const registry = load("src/simulations/runtime/recipes/registry.ts");
const slugs = {
  "decimal-place-value": [
    ["control/1", {}],
    ["control/3", {}],
  ],
  "tree-height": [
    ["control/1", { value: 45 }],
    ["control/2", { value: 20 }],
  ],
  "scale-floor-plan": [["control/1", { value: 2 }]],
  "flip-turn-slide": [
    ["control/1", {}],
    ["control/2", {}],
  ],
  "tile-patterns": [["control/1", { value: 5 }]],
  "cube-nets": [
    ["control/2", {}],
    ["control/1", {}],
  ],
  "can-material": [["control/1", { value: 4.3 }]],
  "box-packing": [["control/2", {}]],
  "fencing-garden": [["control/1", { value: 5 }]],
};
const invalid = {
  "decimal-place-value": ["control/2", {}, 2],
  "tree-height": ["control/1", { value: 90 }],
  "scale-floor-plan": ["control/1", { value: -2 }],
  "flip-turn-slide": null,
  "tile-patterns": ["control/1", { value: 2 }],
  "cube-nets": null,
  "can-material": ["control/1", { value: 0 }],
  "box-packing": null,
  "fencing-garden": ["control/1", { value: 12 }],
};
const listed = new Set(registry.listPremadeRecipes().map((r) => r.slug));
for (const [slug, actions] of Object.entries(slugs)) {
  const recipe = registry.getPremadeRecipe
    ? registry.getPremadeRecipe(slug)
    : require(`../../../src/simulations/pre-made/${slug}/recipe.json`);
  assert.ok(listed.has(slug), `${slug} missing from premade registry`);
  const node = recipe.document.nodes[0];
  const m = assemblyModels.find((x) => x.ref === node.definition);
  assert.ok(m, `${slug}: model not registered in assembly`);
  assert.equal(assemblyPresentationContracts[m.presentation], true);
  assert.equal(
    publicDefinition(`appearance/${m.presentation}`).learnerLayout,
    "scene-first",
  );
  assert.deepEqual(compositionIssues(recipe.document), [], slug);
  const controls = recipe.document.nodes.filter((n) =>
    n.definition.startsWith("controls/"),
  );
  assert.ok(
    controls.length >= 1 && controls.length <= 3,
    `${slug}: ${controls.length} controls`,
  );
  const runtime = loadRecipe(recipe).runtime;
  for (const [control, args] of actions) {
    const result = runtime.submit(control, args);
    assert.equal(
      result.accepted,
      true,
      `${slug} ${control}: ${result.error ?? ""}`,
    );
  }
  const changed = structuredClone(runtime.getSnapshot().state.model);
  assert.notDeepEqual(
    changed,
    m.initialize(structuredClone(node.configuration)),
    `${slug}: no visible change`,
  );
  const bad = invalid[slug];
  if (bad) {
    let result;
    for (let i = 0; i < (bad[2] ?? 1); i++)
      result = runtime.submit(bad[0], bad[1]);
    assert.equal(result.accepted, false, `${slug}: invalid input accepted`);
    if (!bad[2]) assert.deepEqual(runtime.getSnapshot().state.model, changed);
  }
  const accepted = structuredClone(runtime.getSnapshot().state.model);
  const saved = JSON.parse(serializeRecipe(recipe, runtime.capture()));
  const reopened = loadRecipe(saved).runtime;
  assert.deepEqual(
    reopened.getSnapshot().state.model,
    accepted,
    `${slug}: save/reopen`,
  );
  assert.deepEqual(
    reopened.getSnapshot().outputs.model,
    runtime.getSnapshot().outputs.model,
  );
  assert.deepEqual(saved.document.presentation, recipe.document.presentation);
  // Structural follow-up: a second independent object is allowed, a third is not.
  const pair = structuredClone(recipe.document);
  pair.nodes.push({ ...structuredClone(node), id: "second" });
  const two = new DocumentRuntime(pair);
  assert.deepEqual(
    two.getSnapshot().state.second,
    two.getSnapshot().state.model,
  );
  pair.nodes.push({ ...structuredClone(node), id: "third" });
  assert.throws(() => new DocumentRuntime(pair), /maximum|instances|objects/i);
}
console.log(
  "A1 MATH-01, 03–10 integrated recipes, composition, rejection, save/reopen and instance-limit checks passed",
);
