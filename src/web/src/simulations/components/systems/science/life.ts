import { requireValue } from "../../../runtime/authoring/requireValue";
import {
  clamp,
  event,
  randomAt,
  type ScienceObservation,
  type ScienceState,
} from "./contracts";
export const cellStages = [
  "Interphase",
  "DNA replication",
  "Prophase",
  "Metaphase",
  "Anaphase",
  "Telophase",
  "Cytokinesis",
  "Two daughter cells",
];
export const flowerAvailable = (s: ScienceState, i: number) =>
  !!(s.settings.patch || (i !== 2 && i !== 3)) &&
  (i < 2
    ? s.time <= 5
    : s.time >= 6 - Math.round(s.settings.overlap / 20) && s.time <= 10);
export const inspectedGenome = (s: ScienceState) =>
  s.selected >= 2
    ? (requireValue(s.offspring)[s.selected - 2]?.alleles ?? [
        s.settings.parentA,
        0,
        1,
        0,
        1,
        0,
      ])
    : s.selected === 1
      ? [s.settings.parentB, 0, 0, 1, 1, 0]
      : [s.settings.parentA, 0, 1, 0, 1, 0];
export const genomeGlow = (alleles: number[], light: number) =>
  Math.round(((alleles[4] + alleles[5]) * light) / 2);
export function lifeStep(s: ScienceState): ScienceState {
  const n = { ...s, time: s.time + 1 };
  if (s.kind === "cell")
    return event(
      n,
      [
        "",
        "DNA copied; sister chromatids share a chromosome identity.",
        "Chromosomes condense; spindle begins to form.",
        "Copied chromosomes align at the cell equator.",
        "Sister chromatids separate; each now counts as a chromosome.",
        "Nuclear envelopes form around the allocated sets.",
        "Cell boundary divides.",
        "Compare chromosome identities in the daughter cells.",
      ][n.time],
    );
  if (s.kind === "immune") {
    const d = {
      ...requireValue(s.immune),
      memory: [...requireValue(s.immune).memory],
    };
    if (!d.exposure || d.burden === 0) return s;
    const remembered = d.challengeMemory;
    if (n.time < 3 && !remembered)
      d.burden = clamp(d.burden * 1.12 - 2, 0, 180);
    const adaptive = n.time >= (remembered ? 2 : 5);
    if (adaptive)
      d.antibodies = Math.min(100, d.antibodies + (remembered ? 24 : 12));
    // Binding capacity grows before clearance; innate removal remains distinct.
    d.burden = Math.max(
      0,
      d.burden - 2 - (n.time > (remembered ? 2 : 6) ? d.antibodies * 0.13 : 0),
    );
    if (d.exposure === 1) d.firstPeak = Math.max(d.firstPeak, d.burden);
    if (
      n.time >= (remembered ? 4 : 9) &&
      !d.memory.includes(s.settings.antigen)
    )
      d.memory.push(s.settings.antigen);
    if (d.burden <= 0.5) {
      d.burden = 0;
      d.clearance = n.time;
      if (d.exposure === 1) d.firstClearance = n.time;
      n.playing = false;
    }
    return event(
      { ...n, immune: d },
      d.burden === 0
        ? "Challenge cleared in this teaching scenario; matching memory remains."
        : n.time === 5
          ? "Matching lymphocytes activate after antigen presentation."
          : adaptive
            ? "Antibodies bind matching antigens; clearance follows separate encounters."
            : "Phagocytes provide innate containment while antigen recognition develops.",
    );
  }
  if (s.kind === "genome") {
    const index = requireValue(s.offspring).length;
    const a = [s.settings.parentA, 0, 1, 0, 1, 0],
      b = [s.settings.parentB, 0, 0, 1, 1, 0];
    const alleles: number[] = [],
      sources: string[] = [];
    for (let locus = 0; locus < 3; locus++) {
      for (const [parent, genome] of [
        [0, a],
        [1, b],
      ] as const) {
        const initial = randomAt(s.seed, index + 1, parent) > 0.5 ? 1 : 0;
        const homolog =
          s.settings.recombine && locus > 0 ? 1 - initial : initial;
        alleles.push(genome[locus * 2 + homolog]);
        sources.push(`${parent === 0 ? "A" : "B"}${homolog + 1}`);
      }
    }
    if (s.settings.mutation) {
      alleles[4] = 1 - alleles[4];
      sources[4] += " + mutation";
    }
    return event(
      {
        ...n,
        offspring: [
          ...requireValue(s.offspring),
          { id: index + 1, alleles, sources, mutation: !!s.settings.mutation },
        ],
        selected: index + 2,
      },
      "Meiosis forms one set per gamete; fertilization combines parental segments.",
    );
  }
  if (s.kind === "pollination") {
    const d = structuredClone(requireValue(s.pollen));
    for (let p = 0; p < s.settings.pollinators; p++) {
      const recipient = (n.time * 2 + p) % 6;
      const species = recipient % 2;
      const available = flowerAvailable(n, recipient);
      if (!available) continue;
      d.visits[recipient]++;
      if (d.loads[p] > 0) {
        if (d.origins[p] % 2 === species && d.origins[p] !== recipient) {
          d.transfers[recipient]++;
          if (!d.fertilized[recipient]) d.fertilized[recipient] = n.time + 1;
        }
        d.loads[p]--;
      }
      d.loads[p] = 2;
      d.origins[p] = recipient;
    }
    d.fruits = d.fruits.map((_, i) =>
      d.fertilized[i] > 0 &&
      n.time >= d.fertilized[i] + 2 &&
      s.settings.resources >= 40
        ? 1
        : 0,
    );
    return event(
      { ...n, pollen: d },
      d.fruits.some(Boolean)
        ? "Earlier compatible transfer has progressed through fertilization to fruit development."
        : "Visits transfer finite pollen; only matching species with an available recipient qualify.",
    );
  }
  return s;
}
export function lifeObservation(s: ScienceState): ScienceObservation {
  if (s.kind === "cell") {
    const copied = s.time >= 1,
      separated = s.time >= 4,
      daughters = s.time >= 6;
    const left = s.settings.error ? "A, B, C, D, A" : "A, B, C, D",
      right = s.settings.error ? "B, C, D" : "A, B, C, D";
    return {
      stage: cellStages[s.time],
      metrics: [
        daughters
          ? `Daughter sets · ${s.settings.error ? "Unequal" : "Matching"}`
          : `${separated ? 8 : 4} chromosomes in the cell`,
        `${daughters ? "Each normal daughter: 1×" : copied ? "2×" : "1×"} starting DNA`,
        daughters
          ? `Left: ${left} / Right: ${right}`
          : "A · B · C · D stay identifiable",
      ],
      explanation:
        s.time === 0
          ? "Replication comes before mitosis. Track A to see how its copied chromatids reach the daughter cells."
          : daughters
            ? s.settings.error
              ? "A failed separation allocated both copies of A to the left daughter. The right daughter lacks A."
              : "Each daughter received one copy of every starting chromosome identity."
            : separated
              ? "Separated chromatids now count as chromosomes. The cell has not finished dividing yet."
              : "Copied sister chromatids are two DNA copies joined at one centromere; they count as one chromosome until separation.",
      objects: ["A", "B", "C", "D"].map((name) => ({
        name: `Chromosome ${name}`,
        state: copied
          ? separated
            ? "Separated descendants"
            : "Two sister chromatids"
          : "One unreplicated chromosome",
        why: daughters
          ? `Allocation: ${name === "A" && s.settings.error ? "two left, none right" : "one in each daughter"}.`
          : "Identity remains stable as DNA is copied and distributed.",
      })),
    };
  }
  if (s.kind === "immune") {
    const d = requireValue(s.immune),
      active = d.exposure > 0,
      matching = d.memory.includes(s.settings.antigen);
    const stage = !active
      ? "Ready for exposure"
      : d.burden === 0
        ? "Memory retained"
        : s.time < 3
          ? "Innate response"
          : s.time < 5 && !matching
            ? "Antigen presentation"
            : "Adaptive response";
    return {
      stage,
      metrics: [
        `${Math.round(d.burden)} · pathogen burden`,
        `${d.memory.length} · memory identities`,
        d.exposure > 1
          ? `First ${d.firstClearance} / repeat ${d.clearance || "…"} · clearance steps`
          : `${d.antibodies} · antibody activity`,
      ],
      explanation: !active
        ? "Introduce a pathogen to begin. Antigen shapes identify what adaptive cells can recognize."
        : d.exposure > 1
          ? "The repeat challenge keeps stored memory and restores the original exposure dose. Only a matching antigen benefits."
          : "Innate containment starts first. Recognition activates matching lymphocytes; binding and clearance occur separately.",
      objects: [
        {
          name: "Pathogen",
          state: `${Math.round(d.burden)} relative burden · ${s.settings.antigen ? "diamond" : "triangle"} antigen`,
          why: "Its antigen identity is used for adaptive recognition.",
        },
        {
          name: "Phagocyte",
          state: active ? "Encountering pathogens" : "Patrolling tissue",
          why: "Innate containment is distinct from antigen-specific memory.",
        },
        {
          name: "Antigen-presenting cell",
          state:
            s.time >= 3
              ? "Presenting encountered antigen"
              : "Waiting for encounter",
          why: "Connects initial encounters to matching lymphocyte recognition.",
        },
        {
          name: "B lymphocyte",
          state: d.antibodies
            ? "Activated; producing antibodies"
            : "Awaiting recognition",
          why: "Antibodies bind a matching antigen before clearance.",
        },
        {
          name: "T lymphocyte",
          state:
            s.time >= 5 || matching ? "Matching adaptive response" : "Inactive",
          why: "Simplified T-cell activity illustrates recognition, not every infection pathway.",
        },
        {
          name: "Memory cell",
          state: matching ? "Matching identity stored" : "No matching memory",
          why: "Memory for one antigen is not a universal protection bonus.",
        },
      ],
    };
  }
  if (s.kind === "genome") {
    const child =
        s.selected >= 2 ? requireValue(s.offspring)[s.selected - 2] : undefined,
      alleles = inspectedGenome(s);
    const crest = alleles[0] + alleles[1] > 0,
      marks = alleles[2] + alleles[3] + alleles[4] + alleles[5];
    return {
      stage: ["Organism", "Cell", "Chromosomes", "Gene", "Illustrative DNA"][
        s.settings.zoom
      ],
      metrics: [
        `${requireValue(s.offspring).length} · offspring`,
        `${crest ? "Crest present" : "No crest"} · simple trait`,
        s.settings.trait === 2
          ? `${genomeGlow(alleles, s.settings.environment)} / 100 · glow expression`
          : `${marks} · marking contributions`,
      ],
      explanation:
        s.settings.trait === 2
          ? `Light ${s.settings.environment}/100 changes glow expression; inherited alleles are unchanged. This is a modeled expression-to-function-to-trait pathway.`
          : child
            ? `Offspring ${child.id} inherited one allele at each locus from each parent. Segment labels record crossover${child.mutation ? " and an explicit germline mutation" : ""}.`
            : "Crest has a simple allele relationship; markings combine two loci. Form gametes and breed to inspect segment ancestry.",
      objects: [
        {
          name: "Parent A",
          state: `Crest genotype ${s.settings.parentA ? "Aa" : "aa"}`,
          why: "Parent edits affect future gametes, not existing offspring.",
        },
        {
          name: "Parent B",
          state: `Crest genotype ${s.settings.parentB ? "Aa" : "aa"}`,
          why: "A second diploid parent contributes one homologous segment per locus through a gamete.",
        },
        ...requireValue(s.offspring).map((c) => ({
          name: `Offspring ${c.id}`,
          state: `Alleles: ${c.alleles.join(" · ")}`,
          why: `Sources: ${c.sources.join(", ")}. ${c.mutation ? "One germline variant was changed." : "All alleles have parental provenance."}`,
        })),
      ],
    };
  }
  const d = requireValue(s.pollen);
  return {
    stage: `Flowering day ${s.time}`,
    metrics: [
      `${d.visits.reduce((a, b) => a + b, 0)} · visits`,
      `${d.transfers.reduce((a, b) => a + b, 0)} · compatible transfers`,
      `${d.fruits.reduce((a, b) => a + b, 0)} · developing fruits`,
    ],
    explanation:
      "A visit is not automatically pollination. Pollen must come from a compatible donor; fertilization and resource-dependent fruit development follow later.",
    objects: Array.from({ length: 6 }, (_, i) => ({
      name: `Flower ${i + 1} · species ${i % 2 ? "B" : "A"}`,
      state: `${flowerAvailable(s, i) ? "Flowering" : !s.settings.patch && (i === 2 || i === 3) ? "Patch removed" : "Outside bloom window"} · ${d.visits[i]} visits · ${d.transfers[i]} compatible transfers`,
      why: d.fruits[i]
        ? "Developing fruit after fertilization and delay."
        : d.fertilized[i]
          ? `Fertilization at day ${d.fertilized[i]}; waiting for development/resources.`
          : "No fertilization yet; inspect the pollen origin and bloom overlap.",
    })).concat(
      d.loads.slice(0, s.settings.pollinators).map((load, i) => ({
        name: `Pollinator ${i + 1}`,
        state: `${load} pollen units · ${d.origins[i] < 0 ? "no donor" : `donor flower ${d.origins[i] + 1}`}`,
        why: "Follow the route: a finite load keeps its donor identity and is checked for recipient compatibility.",
      })),
    ),
  };
}
