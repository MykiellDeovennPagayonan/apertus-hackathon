const cases = [
  {
    id: "arithmetic",
    prompt:
      "Help me learn addition. Start with 7 circles and add 4. Let me change the two numbers, and wait for me to press Add circles.",
    definition: "models/arithmetic",
    coverage: "full",
    expected: { a: 7, b: 4, result: 11, changedA: 8, changedResult: 12 },
    overrides: [
      {
        alias: "A",
        overrides: { task: { operation: "add", a: 7, b: 4 }, looping: false },
      },
    ],
  },
  {
    id: "rectangles",
    prompt:
      "Help me learn area and perimeter. Compare two rectangles: A is 6 metres wide and 4 metres high; B is 8 metres wide and 2 metres high. They should start with the same perimeter. Put them side by side, give each its own width and height controls, and show area and perimeter for each.",
    definition: "models/area-perimeter",
    coverage: "full",
    expected: {
      A: { width: 6, height: 4, area: 24, perimeter: 20 },
      B: { width: 8, height: 2, area: 16, perimeter: 20 },
    },
    overrides: [
      { alias: "A", overrides: { width: 6, height: 4 } },
      { alias: "B", overrides: { width: 8, height: 2 } },
    ],
  },
  {
    id: "bridge",
    prompt:
      "Help me learn how a truss bridge carries a load. Start with a 10-tonne load halfway across, let me move it, and let me select a beam to inspect its response. Also show the bridge's exact deflection in millimetres.",
    definition: "models/BridgeResponse",
    coverage: "partial",
    expected: {
      magnitude: 10,
      position: 0.5,
      shares: [5, 5],
      changedPosition: 0.25,
      changedShares: [7.5, 2.5],
    },
    overrides: [{ alias: "A", overrides: { position: 0.5, magnitude: 10 } }],
  },
];
module.exports = { cases };
