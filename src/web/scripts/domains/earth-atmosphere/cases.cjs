exports.cases = [
  [
    "earthquake",
    "earthquake-formation",
    [
      "how do earthquakes happen?",
      "why does the ground shake",
      "how earth quakes form",
    ],
    ["show sideways movement", "show it slower"],
  ],
  [
    "tsunami",
    "tsunami-formation",
    ["how does a tsunami form?", "what causes tsunamis", "show me tsunami"],
    ["what if the ocean is deeper", "show the next wave"],
  ],
  [
    "atmosphere",
    "atmosphere-ozone",
    [
      "what are the layers of the atmosphere?",
      "show the atmosphere and ozone layer",
      "earth air layers",
    ],
    ["where is the ozone layer", "what if there is less ozone"],
  ],
  [
    "greenhouse",
    "greenhouse-effect",
    [
      "how does the greenhouse effect work?",
      "why do greenhouse gases warm earth",
      "green house effect",
    ],
    ["add more greenhouse gas", "keep the sunlight the same"],
  ],
  [
    "lightning",
    "lightning-formation",
    [
      "how does lightning form?",
      "where does lightning come from",
      "how is lighting made in a storm",
    ],
    ["show lightning inside the cloud", "why is thunder later"],
  ],
  [
    "rainbow",
    "rainbow-formation",
    ["how do rainbows form?", "why do we see a rainbow", "show me rainbows"],
    ["show a double rainbow", "make the sun higher"],
  ],
  [
    "weather",
    "weather-formation",
    [
      "how is weather formed?",
      "why do clouds and rain happen",
      "how weather works",
    ],
    ["what happens over a mountain", "make the air drier"],
  ],
].map(([kind, slug, prompts, followups]) => ({
  kind,
  slug,
  prompts,
  followups,
  definition: "prefabs/earth-atmosphere/" + kind,
}));
