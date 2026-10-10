const { load } = require("../../test-loader.cjs");
const m = load("src/simulations/components/systems/collective/crowd.ts");
for (const friction of [0.4, 0.7, 0.9])
  for (const placement of [0, 1, 2]) {
    const rows = [];
    for (let seed = 1; seed <= 30; seed++) {
      let s = m.initializeCrowd({
        ...m.crowdDefaults,
        seed,
        friction,
        placement,
      });
      for (let t = 0; t < 2000 && s.lanes.some((l) => l.people.length); t++)
        s = m.advanceCrowd(s);
      rows.push(s.lanes.map((l) => l.finished || 2000));
    }
    console.log(
      JSON.stringify({
        friction,
        placement,
        mean: rows.reduce((a, [x, y]) => a + y - x, 0) / 30,
        helped: rows.filter(([x, y]) => y < x).length,
        incomplete: rows.filter((r) => r.includes(2000)).length,
      }),
    );
  }
