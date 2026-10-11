const { load } = require("../../test-loader.cjs");
const { scienceSpecs } = load("src/simulations/domains/science/specs.ts");
const prompts = [
  "Show how one cell copies its chromosomes and divides into two cells. Let me follow a chromosome through the stages.",
  "Help me see how immune cells react the first time and the next time the same fictional pathogen appears.",
  "Make a fictional organism genetics lesson where I can trace traits to genes, change the environment, and compare offspring from two parents.",
  "Show how pollinators carry pollen between flowers and what happens when their flowering periods stop overlapping.",
  "Let me introduce an invasive plant into a habitat and compare removing it early with removing it several seasons later.",
  "Let me inspect Earth’s layers, compare compositional and mechanical layers, and follow a mantle tracer.",
  "Help me compare plate boundaries using a surface view and cross-section, including collision and subduction.",
  "Show a volcano cutaway where I can compare effusive and explosive activity and inspect magma and deposits.",
  "Show water moving through a watershed and let me compare vegetation with pavement during the same rainfall.",
];
exports.cases = scienceSpecs.map((s, i) => ({
  id: s.slug,
  prompt: prompts[i],
  definition: `prefabs/science/${s.name}`,
  kind: s.kind,
}));

// Diverse learner vocabulary exercises retrieval without copying display headings.
const paraphrases = {
  cell: [
    "Can you explain mitosis with an interactive example?",
    "Why do the two new cells get the same genetic information?",
    "Let me explore what happens when sister chromatids fail to separate.",
  ],
  immune: [
    "Why is the second encounter with a germ easier to fight?",
    "Show the body's defenses against an infection it has seen before.",
    "Compare an infection with a matching antigen and one the body does not remember.",
  ],
  genome: [
    "Why do siblings inherit different traits?",
    "How can light change gene expression without changing DNA?",
    "Let me breed offspring and track inherited alleles from their parents.",
  ],
  pollination: [
    "How do bees help blossoms become fruit?",
    "What if two flowers do not bloom at the same time?",
    "Show how pollen from the wrong species affects fertilization.",
  ],
  invasive: [
    "Can removing weeds stop their seeds from spreading?",
    "Compare native plants with an introduced plant spreading through their habitat.",
    "What happens when a dispersal barrier blocks an invasive plant?",
  ],
  earth: [
    "What is below Earth's crust?",
    "Let me inspect the planet interior and its solid and liquid layers.",
    "Why is the outer core liquid while the inner core is solid?",
  ],
  plates: [
    "Why do mountains form when continents crash together?",
    "Show how seafloor spreading makes new crust.",
    "Compare plates sliding past each other and one sinking beneath another.",
  ],
  volcano: [
    "Why do some eruptions produce flowing lava and others ash?",
    "Let me compare gas-rich magma with an effusive eruption.",
    "Show magma collecting underground before a volcano erupts.",
  ],
  water: [
    "What happens to rain when a grassy field becomes a parking lot?",
    "Where does rainfall go after the ground is paved?",
    "Follow water from clouds into soil and groundwater.",
  ],
};
exports.paraphraseCases = scienceSpecs.flatMap((s) =>
  paraphrases[s.kind].map((prompt, i) => ({
    id: `${s.slug}-paraphrase-${i + 1}`,
    prompt,
    definition: `prefabs/science/${s.name}`,
    kind: s.kind,
  })),
);
