const fs = require("node:fs"),
  path = require("node:path"),
  { load } = require("../../test-loader.cjs");
const { thermalOptics, thermalOpticsSpecs } = load(
  "src/simulations/domains/physics/thermalOptics.ts",
);
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation/contracts",
);
const references = {
  turning: [
    "mv²/r; grip≤μmg; lean=atan(v²/(rg)); g9.81m/s²",
    "radius10m μ.5 -> limit7.003570518m/s; double5->10m/s needs4×force",
    "https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force",
  ],
  lens: [
    "1/f=1/do+1/di; magnification=−di/do",
    "f10cm do30cm -> di15cm m−.5; do5cm -> di−10cm m2; do=f -> null finite image",
    "https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses",
  ],
  fibre: [
    "external*sin(entry)=core*sin(direction); incidence90°−direction; critical asin(cladding/core) iff core>cladding; lossless unpolarized Fresnel reflectance",
    "core1.5 cladding1.45 -> critical75.164888418°; internal80° TIR,70° transmission; lower->higher never TIR",
    "https://openstax.org/books/university-physics-volume-3/pages/1-4-total-internal-reflection",
  ],
  doppler: [
    "Retarded emission te solves t=te+hypot(v*te,offset)/c; radial=−v²*te/distance; received=f*c/(c−radial)",
    "f700Hz v20m/s c343m/s -> collinear743.34365325/661.43250689Hz; off-axis frequency continuous, coincidence null",
    "https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect",
  ],
  string: [
    "c=sqrt(tension/linearDensity); fn=n*c/(2L); displacement sin(nπx/L)*cos(2πphase)",
    "L.65m T65N density.005kg/m -> f1 87.705801931Hz; half length doubles; all nodes zero for every phase",
    "https://openstax.org/books/university-physics-volume-1/pages/16-6-standing-waves-and-resonance",
  ],
  conduction: [
    "alpha=k/(rho*cp); conservative finite-volume flux divergence with half-cell fixed bath boundary and insulated far/side walls; explicit Fourier number≤.2",
    "uniform constant field remains constant; insulated arbitrary field sum conserved;32/64/128-cell handle convergence <.1°C at300s; k1vs100 with equal rhoCp/geometry warms differently",
    "https://openstax.org/books/university-physics-volume-2/pages/1-6-mechanisms-of-heat-transfer",
  ],
  latent: [
    "H=m*cice*Tinitial+power*time; derive temperature/fractions from enthalpy with334kJ/kg fusion and2256kJ/kg vaporization",
    "mass.1kg at0°C needs33.4kJ/334s at100W to melt; sensible heat before and after; fractions sum1 and reconstruct enthalpy",
    "https://openstax.org/books/university-physics-volume-2/pages/1-5-phase-changes",
  ],
  induction: [
    "phi=pole*peak*exp(−x²/(2width²)); emf=−turns*dphi/dx*speed; I=emf/R; dissipation=emf²/R",
    "100turns .002Wb change/.1s -> average−2V using an admitted profile segment; reverse speed/pole reverses emf; stationary0V",
    "https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law",
  ],
  capacitor: [
    "tau=R*C; after dt voltage=target+(prior−target)exp(−dt/tau); isolate leaves voltage unchanged; Q=CV; E=CV²/2",
    "R10kΩ C100μF -> tau1s; charging.632120559 and discharge.367879441 after tau; switches preserve voltage",
    "https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits",
  ],
};
for (const c of require("./a4-cases.json")) {
  if (c.kind === "cooling") continue;
  const m = thermalOptics.models.find((m) => m.ref === c.ref),
    s = thermalOpticsSpecs.find((s) => s.key === c.kind),
    [equation, reference, source] = references[c.kind];
  const text = `# ${c.id} contract v1 — A4; reviewer A3 pending

Learning question / outcome-only task: ${s.question} Compare initial and changed state to explain the relationship.
Canonical Human prompt (verbatim): ${c.prompts[0]}
Two natural paraphrases: ${c.prompts.slice(1).join(" / ")}
One primary action: ${s.controls[0].label}. Visible controls: ${s.controls.map((c) => `${c.label} (${c.type})`).join("; ")}. Each alters the relationship or advances its physical/display state. No generic inspectors/readout dashboards.
Visual: independently attached physics-${c.kind} scene draws the accepted geometry/temperature/field/phase/circuit. Short scene caption describes current result. Internal measurements are not separate mandatory panels.
Objects: ${s.objects?.length || 1} independently editable ${m.ref} models with separate scene nodes; ${s.objects ? "one shared time slider wired to both; keep equal geometry and storage" : "controls wired to the individual model"}. Canonical accepted state is domain-owned, all scalar properties typed and serializable.
Equations: ${equation}.
Source retrieved2026-10-11: ${source}
Idealizations: ${s.assumptions}
Independent reference/invariant: ${reference}. Tolerance1e-9 for analytic reference checks unless documented numerical quadrature/convergence tolerance.
Valid input domains/units: ${JSON.stringify(m.parameters.properties)}. Unknown, nonfinite, out-of-range and unsupported commands reject before applying; last accepted state is preserved. Numerical work-budget failures reject explicitly.
Seed/time/convergence: no randomness. Analytic models use requested state; conduction explicit stable conservative32-cell solution checked against64/128 cells; phase is a display-cycle fraction for string. RC analytic one-second advances preserve voltage across topology switches.
Existing primitives: DomainContribution, typed parameterSchema, house Slider/Select/Button, separate model/appearance/command connections, normal builder and Try rendering. Owned paths ownership/A4.md; shared registration A3 named writer requested; no changes to A3-owned physics/index.ts.
Recipe: model/scene/controls are separate nodes; authors can edit configuration, move/resize scenes, and rewire existing typed command ports without dismantling one monolithic component.
Save/reopen/Try: compare accepted configurations, references and connections, independently edit one input in builder, save/reload and verify same scientific output. Opening geometry changes must not change physical quantities.
Followup1: ${c.followups[0]}
Structural followup2: ${c.followups[1]}
Unsupported/invalid: ${c.invalid} Clarify/reject without replacing last accepted lesson; cancelled generation must preserve it.
Peer evidence: opening/changed/short/narrow, keyboard/reduced-motion, learning task, reference/singular/boundary/conservation checks, real Apertus/Laya canonical and both paraphrases/followups, preserved rejection/save/reopen/Try. Two distinct independent correctness/runtime and usability/live verdicts. No self-acceptance; release rounds not run.
Exclusions/open gates: proposal optional overlays/audio/dashboards omitted per IMPORTANT. Peer review/shared registration and real inference acceptance pending. No participant first-use evidence.
`;
  fs.writeFileSync(path.join(root, `${c.id}.md`), text);
}
console.log("A4 nine contracts written; PHYS17v2 preserved");
