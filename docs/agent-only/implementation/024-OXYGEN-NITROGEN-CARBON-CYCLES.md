# Oxygen, nitrogen, and carbon cycles: researched implementation plan

Date: 2026-10-10  
Status: implemented; this document retains the researched design plan. See [implementation and UX review](024-CYCLES-IMPLEMENTATION-REVIEW.md) for delivered behavior and validation evidence.

Target: three ordinary editable lessons, each with a distinct teaching scene and a sequence of focused investigations.  
Research checked: 2026-10-10. Source facts, teaching assumptions, and proposed implementation decisions are distinguished below.

## 1. Scope and governing requirements

Implement these concept documents:

- [05 — Oxygen cycle](../simulations/science/05-OXYGEN-CYCLE.md).
- [06 — Nitrogen cycle](../simulations/science/06-NITROGEN-CYCLE.md).
- [07 — Carbon cycle](../simulations/science/07-CARBON-CYCLE.md).

The governing UI requirement is [IMPORTANT.md](IMPORTANT.md): **“Simplicity must not be violated. The visuals should teach. Controls should make that learning easy.”** Apply its removal test before implementation and after every design iteration. Earlier plans or existing components do not override it.

Also apply the [builder philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md), [component philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md), [simulation philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md), and [usability QA guide](../design/004-USABILITY-QA-GUIDE.md). Preserve the [JSON recipe convention](013-PREMADE-JSON-RECIPE-CONVENTION.md).

Planning assumption: first-time middle-school/early-secondary learners who recognize plants, animals, soil, and water but may not know chemical notation. This is an audience choice, not a curriculum-alignment claim. Introduce familiar names before terminology; retain accurate formulas beside their plain-language names when the chemical distinction is the learning goal.

### Deliverables for implementation

1. Trusted, deterministic, bounded models for all three cycles.
2. A pond cutaway, a soil/root cutaway, and a landscape/ocean/geological scene.
3. Three complete `recipe.json` files with separately editable scenes, explanations, actions, and any necessary investigation measurements.
4. Coverage of every core investigation in the concept documents through focused activities, rather than simultaneous controls.
5. Public catalog contracts and actual Apertus/Laya generation coverage.
6. Model, recipe, builder, accessibility, desktop UX, and generation evidence.

Optional extensions: a live nitrogen-to-pond coupling, a nutrient-limitation lesson link, detailed carbonate chemistry, climate response, and a full global oxygen cycle. The first three lessons must work independently. Do not make optional extensions a prerequisite for using them.

## 2. Online research and decisions it informs

Use the following primary institutional sources and the original education-study record. The summaries deliberately identify mechanisms rather than copying source diagrams or numerical datasets. Source illustrations may have separate credit/licensing conditions; draw original code-native scenes.

| ID | Source | Finding used in this plan | Implementation consequence |
| --- | --- | --- | --- |
| O1 | [USGS: Dissolved Oxygen and Water](https://www.usgs.gov/water-science-school/science/dissolved-oxygen-and-water) | Dissolved molecular oxygen differs from oxygen chemically bound in water; temperature affects solubility. | Distinguish `O2` from `H2O`; isolate solubility in the warming activity. |
| O2 | [USGS: Diurnal variations in water quality](https://www.usgs.gov/centers/new-jersey-water-science-center/science/diurnal-variations-water-quality-surface-water) | Photosynthesis and respiration contribute to daily oxygen variation, including observed supersaturation. | Day/night changes must arise from rates; saturation is an exchange reference, not a hard ceiling. |
| O3 | [USGS: Dissolved oxygen, Chapter 6](https://www.usgs.gov/publications/dissolved-oxygen-chapter-6) | Oxygen changes through production, consumption, exchange, and transport; exchange responds to under/oversaturation. | Use a signed air-water flux and an explicit oxygen budget. |
| O4 | [EPA CADDIS: Dissolved Oxygen](https://www.epa.gov/caddis/dissolved-oxygen) | Plant respiration and decomposition can lower oxygen; turbulence affects aeration; biological responses vary. | Keep plant respiration active; show fictional stress without universal fish-survival predictions. |
| O5 | [OpenStax Biology 2e: Light-dependent reactions](https://openstax.org/books/biology-2e/pages/8-2-the-light-dependent-reactions-of-photosynthesis) | Water splitting supplies the oxygen released during oxygenic photosynthesis. | An atom explanation must not identify carbon dioxide as the source of released `O2`. |
| O6 | [USGS: DOTABLES](https://water.usgs.gov/water-resources/software/DOTABLES/) and [published validity ranges](https://www.usgs.gov/tools/dotables) | USGS uses Benson/Krause oxygen-solubility formulations with temperature, pressure, and salinity corrections. | Use a documented formulation or checked table for equilibrium concentration; keep inputs within its supported domain. |
| N1 | [University of Minnesota SWROC: Nitrogen Cycle](https://swroc.cfans.umn.edu/research/soil-water/nitrogen-cycle) | Microbial transformations distinguish fixation, mineralization, two-step nitrification, denitrification, and leaching. | Use separate stores and named pathways with conditions; retain a nitrite intermediate. |
| N2 | [University of Minnesota Extension: Legume life cycles](https://extension.umn.edu/agriculture/crop-production/forages/legume-life-cycles-and-characteristics) | Legume fixation involves rhizobia and nodules; transfer to neighboring plants occurs through additional routes. | Route fixed nitrogen into the symbiotic plant first; avoid instant fertilizer delivery to every nearby root. |
| N3 | [University of Minnesota Extension: Rhizobia inoculation](https://blog-fruit-vegetable-ipm.extension.umn.edu/2022/01/rhizobia-inoculation-for-organic.html) | Compatible microbial partners matter; active nodules maintain a low-oxygen environment. | Do not give fixation the same oxygen gate as bulk-soil nitrification. |
| N4 | [EPA: Sources and Solutions](https://www.epa.gov/nutrientpollution/sources-and-solutions) | Unused nutrients can leave fields and affect downstream waters. | Record fertilizer input and distinguish runoff from drainage below the root zone. |
| N5 | [EPA N-STEPS: Nutrient and response overviews](https://archive.epa.gov/epa/nutrient-policy-data/n-steps-nutrient-and-response-variable-overviews.html) | Nitrogen limitation can occur in freshwater and marine systems; nutrient limitation is context-dependent. | Declare a nitrogen-limited pond preset if the optional bloom activity is added. |
| N6 | [EPA: Effects on the Environment](https://www.epa.gov/nutrientpollution/effects-environment) | Nutrient enrichment, algal growth, and subsequent decomposition can contribute to low oxygen. | Sequence the downstream effect with delays; fertilizer must not immediately remove pond oxygen. |
| C1 | [NASA Earth Observatory: The Carbon Cycle](https://science.nasa.gov/earth/earth-observatory/the-carbon-cycle/) | Biological and geological pathways operate over very different timescales; weathering and burial connect stores. | Separate biological and geological teaching presets and label their time basis. |
| C2 | [NOAA: Carbon cycle](https://www.noaa.gov/education/resource-collections/climate/carbon-cycle) | Air and surface water exchange carbon; deep storage differs from rapid surface exchange. | Separate surface/deep ocean stores and store amount from transfer rate. |
| C3 | [NOAA OAP: What is Ocean Acidification?](https://oceanacidification.noaa.gov/what-is-ocean-acidification/) | Dissolved inorganic carbon includes dissolved carbon dioxide, bicarbonate, and carbonate. | Label the ocean store as DIC; aggregate chemistry must not generate a pH readout. |
| C4 | [NOAA PMEL: Ocean Carbon Uptake](https://pmel.noaa.gov/co2/story/Ocean%2BCarbon%2BUptake) | Air-sea exchange varies across places and times and is an observed research quantity. | Use a declared schematic exchange law, without claiming forecast accuracy. |
| U1 | [Paul, Podolefsky, Perkins: Guiding without feeling guided](https://www.per-central.org/items/detail.cfm?ID=12838) | The authors describe redesign informed by middle-school think-aloud interviews and implicit scaffolding. | Place affordances and explanatory feedback in the scene; test comprehension instead of relying on a tutorial. |
| U2 | [W3C: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide) | Qualifying automatic movement and updating require user control. | Open static; prefer explicit state advancement and retain motion control if continuous playback is introduced. |
| U3 | [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Nonessential interaction-triggered motion can be disabled; this criterion is AAA. | Respect reduced motion with immediate, understandable state changes. |
| U4 | [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | The AA minimum is 24 CSS pixels with defined exceptions. | Use a project target of 44px for lesson actions and enlarged scene hit areas; verify after board scaling. |

Research limitations: U1's public study abstract/record was inspected; the PDF download was unavailable through the research tool, so no full-paper or effect-size claim is made. N5 is an archived EPA scientific overview. The O1 search extract was available, but direct opening timed out; O3/O4 supply independently opened support for the budget and solubility decisions. No empirical pond calibration, field dataset fit, agricultural prescription, or new global carbon inventory is claimed.

### Synthesis: scientific risks to resolve before drawing the UI

The source-backed mechanisms above and the supplied concept documents imply three different teaching problems. The proposed layouts, finite-store algorithms, activity sequencing, and numerical simplifications below are design/engineering decisions, not recommendations quoted from those sources.

| Cycle | Likely misconception | Required visual correction |
| --- | --- | --- |
| Oxygen | Plants only supply oxygen; darkness makes oxygen vanish. | Production stops in darkness while distinct consumption paths continue over elapsed time. |
| Oxygen | Fish breathe the oxygen inside `H2O`; mixing always adds oxygen. | Molecular `O2` has its own cue; the exchange arrow can reverse. |
| Nitrogen | Any nitrogen in the air is immediately usable by roots. | Atmospheric `N2` and root-available forms use different labeled shapes. |
| Nitrogen | Every atom follows one compulsory circle. | A highlighted possible route sits inside a branching network. |
| Nitrogen | Nodules simply pump fertilizer into the whole soil. | Show the symbiotic plant route and later residue/mineralization routes separately. |
| Carbon | Burning creates carbon; growing trees reverses an arbitrary release instantly. | A geological source decreases during burning; restoration accumulates gradually. |
| Carbon | A large store is necessarily a fast sink. | Distinguish store size from movement along a selected arrow. |
| Carbon | Fossil fuels form in several ordinary lesson days. | Geological exploration is a separate, explicitly labeled scenario. |

## 3. Presentation contract: simplicity before exposed capability

### Opening decisions

| Lesson | Opening learning question | Main visual | Primary action | Necessary opening evidence |
| --- | --- | --- | --- | --- |
| Oxygen cycle | Why can pond oxygen fall at night? | One pond, plants, animal, dead material, air-water boundary | `Advance to night` | Day/night cue, oxygen availability cue, current production/consumption paths |
| Nitrogen cycle | How does nitrogen in the air become available to a plant? | Roots and soil with a microbial route | `Follow nitrogen` | Clearly different nitrogen forms and one supported route |
| Carbon cycle | Where can carbon go after a plant takes it from the air? | Landscape with one carbon marker | `Follow carbon` | Selected store and one named transfer; ocean/rock context is subdued |

The oxygen question deliberately narrows the concept's broader question. Later activities expand it. The carbon lesson begins with biological movement; timescales become the question in a later activity.

Opening target: one primary action, one clearly named activity entry, and at most one currently selectable pathway/tracer target. **Count scene hotspots, text links, tabs, menus, repeated selectors, and host chrome during review.** Do not count only form controls. Initially avoid making every scene object focusable; enable meaningful selection in the relevant tracing/inspection activity. A screen with excessive competing targets must be simplified even if its form-button count is low.

Use one short state-dependent explanation. Do not add permanent Observe/Track/Compare cards, an event log, internal IDs, three fixed metric slots, or a generic playback toolbar. Authoring settings do not belong in the learner view.

The optional activity entry is explicitly named for its job: `Try another pond question`, `Try another soil question`, or `Explore another carbon route`. It opens a focused activity choice, not a bag of every setting. An individual activity exposes only its own needed choices; unrelated fields are absent, not hidden under “More.”

### What remains visible and why

| Proposed block | Learner need | Removal decision |
| --- | --- | --- |
| Short lesson title + one question | Establish the current task | Keep; question changes with activity. |
| Large scene | Explain the causal process | Keep and prioritize. |
| One sentence beneath the scene | Interpret the visible accepted change | Keep; replace it rather than accumulate history. |
| Primary action | Advance the current exploration | Keep; label follows the current task/state. |
| Activity entry | Discover other required investigations | Keep as a quiet secondary action. |
| Nearby selected-path detail | Explain a chemical transformation | Contextual only; replace the ordinary caption where possible. |
| DO value or store/flux pair | Reason quantitatively in a measurement activity | Absent from ordinary opening; independently editable when authored. |
| Reset, setup, speed, baseline, overlays | Not needed to start these activities | Remove from opening; offer scoped restart in completed/activity state only. |
| Save, Remix, board navigation | Application/authoring tasks | Use existing quiet host placement; review total competition. |

## 4. Visual formatting and ASCII conventions

All wireframes are rough content outlines, not literal nested cards. Their outer borders show the available workspace. Scene, caption, action, activity entry, and optional measurement must remain independent board items. Rendering them together in one immutable lesson panel would violate the component/recipe requirements.

Use existing cream surfaces, restrained teal emphasis, dark text, fine boundaries, and sans-serif typography. Start from `--bg`, `--panel`, `--border`, `--text`, and `--accent`; avoid a second cycle-specific theme. Use the established 4/8/12/16/20/24px rhythm. Proposed learner body text is 16px, scene labels 14–16px after rendering, and lesson headings 22–28px. Adjust with real viewport measurements; do not shrink labels to fit a crowded diagram.

At 1440x900 aim for a scene around 1000–1100px wide and 430–520px high, with a compact caption/action area. These are hypotheses to validate against actual host height, reserved prompt space, and chrome. At 1366x768 reduce decorative sky/depth before reducing readable text. Do not scale physical quantities when resizing the board.

Chemical marks use both text and shape:

| Meaning | Proposed cue |
| --- | --- |
| Molecular oxygen | Paired circles with `O2`; an individual atom marker is explicitly labeled separately. |
| Nitrogen gas | Paired mark labeled `N2 / nitrogen gas`. |
| Ammonium / nitrite / nitrate | Different outline shapes labeled `NH4+`, `NO2-`, `NO3-`, with plain-language names. |
| Carbon tracer | Outlined `C` marker; surrounding carrier label identifies `CO2`, organic matter, or DIC. |
| Producing/consuming/transferring | Named arrow with direction; distinguish roles by line treatment as well as color. |
| Inactive pathway | Subdued but readable line with a short contextual reason if selected. |

Use real subscripts/superscripts and accessible spoken names in the app. ASCII formulas below are intentional fallbacks. Representative marks are illustrative, not molecular inventories. Particle density must not pretend to be quantitatively proportional across vastly different stores.

## 5. Oxygen cycle: pond story and implementation

### 5.1 Opening and changed-state outline

```text
+----------------------------------------------------------------------------+
| Oxygen cycle                                                               |
| Why can pond oxygen fall at night?                                          |
|                                                                            |
|       DAYLIGHT              atmospheric O2                                  |
|      \  |  /                      | exchange                               |
|        SUN                        v                                        |
|  bank plants       ~~~~~~~~~ pond surface ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |
|                    |                                                       |
|                    |  aquatic plants --- produces O2 ---> (O2)             |
|                    |       ^                              |                |
|                    |       +----- uses O2 ----------------+                |
|                    |                                      v                |
|                    |                                    animal             |
|                    |                                                       |
|                    |  dead leaves -> microbes <--- uses O2                  |
|                    +----------------------------------------------------   |
|                       Oxygen in water: increasing in this daytime preset   |
|                                                                            |
| Sunlight supports oxygen production. Plants and animals still use oxygen.  |
|                                           [ Advance to night ]             |
| Try another pond question                                                  |
+----------------------------------------------------------------------------+

After the action settles:
+----------------------------------------------------------------------------+
|       NIGHT                 exchange remains active                        |
|       MOON                                                                 |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~ pond surface ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |
|  plants -- production inactive                                             |
|  plants, animal, microbes <------ fewer available O2 marks                  |
|  Oxygen in water: decreasing in this nighttime preset                      |
|                                                                            |
| In darkness, production stops here while respiration continues.             |
|                                           [ Advance to daylight ]          |
+----------------------------------------------------------------------------+
```

The ASCII view shows candidate pathway placement; not every arrow is a separate initial button. Preserve uncluttered space around plants and animal. Avoid giant `O2` bubbles resembling literal atmospheric bubbles breathed by fish. The qualitative oxygen cue is driven by accepted dissolved concentration; state copy must accommodate increasing, falling, or approximately steady oxygen.

`Advance to night` integrates the defined intervening model interval with the light schedule before settling at night. It does not simply darken the scene and subtract oxygen. A small noninteractive phase/time caption identifies the endpoint. `Advance to daylight` continues the same timeline; this is not a matched experiment from equal initial oxygen.

### 5.2 Required focused activities

| Activity | Question and control | Matched conditions / visual outcome |
| --- | --- | --- |
| Daylight and darkness | `Run light comparison` | Two fresh states with the same DO, organisms, organic material, temperature, exchange, seed, and duration; change light only. |
| More aquatic plants | Plant abundance choice + `Run day and night` | Matched full-cycle runs; more visible plants and both production/respiration routes. No claim that more plants always improve net oxygen. |
| Dead material | `Add dead leaves`, then `Advance decomposition` | One bounded input; accumulating microbial demand and remaining material are visible. No instant total oxygen loss. |
| Water temperature | Cooler/warmer choice + `Compare oxygen exchange` | Isolate physical solubility; hold biological rates fixed and state this beside the choice. |
| Mixing | Still/mixed choice + `Run exchange comparison` | Change exchange coefficient only; indicate inward or outward movement according to the current gradient. |
| Oxygen atoms | `Follow an oxygen atom` | Replace molecular-tracer cue with explicitly labeled atom explanation; retain chemical carriers after consumption. |

Activity outcomes show either one scene with a retained, labeled earlier state or two synchronized miniature cutaways. Do not mix the continuation timeline with equal-start comparison labels. Each result gets one causal sentence and `Try again` or the next task, not an extra row of baseline controls.

```text
Focused temperature activity:
+----------------------------------------------------------------------------+
| How does temperature affect oxygen exchange?                               |
|             COOLER WATER                 WARMER WATER                       |
|             identical starts             identical starts                  |
|             [pond cutaway]               [pond cutaway]                     |
|             exchange toward              exchange toward                   |
|             its equilibrium              its equilibrium                   |
|                                                                            |
| Biological rates are held fixed in this comparison.                        |
| Water pair: [ cooler / warmer preset v ]   [ Run comparison ]               |
| Return to pond                                                             |
+----------------------------------------------------------------------------+
```

### 5.3 Authoritative model

Use one well-mixed freshwater pond in v1. Declare fixed volume, pressure/salinity assumptions, representative organisms, and omitted stratification/anaerobic chemistry. Bankside plants can exchange with the local air store but must not route their oxygen directly into the pond.

State must include dissolved `O2`, a finite representative atmospheric `O2` store, light phase, temperature, plant/animal respiration capacities, remaining decomposable organic matter, transfer history, and the biochemical bookkeeping needed for oxygen-atom conservation. The representative air store is large enough that local pond changes do not visibly imply global atmospheric depletion.

Proposed internal bookkeeping: chemical-carrier amounts in mmol; `O2` carriers have two oxygen atoms, water one, `CO2` two, and a simplified `CH2O` organic unit one. Count oxygen atoms across every modeled carrier, including terrestrial material if it participates. Water volume for concentration is a separate fixed scenario parameter.

```text
DO_mg_per_L = dissolved_O2_mmol * 32 / pond_volume_L

delta dissolved_O2 = photosynthetic production
                    - plant aerobic respiration
                    - animal aerobic respiration
                    - microbial aerobic respiration
                    + signed air-water exchange

exchange proposal = k_exchange * (DO_equilibrium(T, pO2) - DO) * dt
                    [convert concentration proposal to carrier amount]
```

This is a proposed teaching model, not a calibrated pond equation. Source O3 supports the budget's mechanisms. Base the equilibrium relation on the [USGS DOTABLES method](https://water.usgs.gov/water-resources/software/DOTABLES/) (O6), either by implementing its documented formulation or using a versioned checked table. USGS lists a 0–40 degrees Celsius temperature domain; v1 can deliberately use a narrower freshwater range with fixed declared pressure. Proposed cooler/warmer presets are 15/25 degrees Celsius, subject to verification against the chosen relation. Compare several calculated equilibrium values with an independent DOTABLES reference and retain provenance, pressure/salinity inputs, interpolation error, and formula version. This validates equilibrium calculation, not biological rates or forecast accuracy.

Positive exchange debits atmospheric `O2`; negative exchange returns it. Increased mixing increases the magnitude of exchange toward equilibrium. Do not clamp oxygen to the saturation value; photosynthesis may temporarily exceed it. Temperature changes the equilibrium target, not the inventory instantaneously.

For biochemical bookkeeping, use declared simplified reactions. Net `CO2 + H2O -> CH2O + O2` and its aerobic reverse conserve atom counts. If illustrating oxygen provenance, use the expanded photosynthetic bookkeeping `CO2 + 2 H2O -> CH2O + H2O + O2` and identify released oxygen as originating in water. This schematic does not model isotopic scrambling or all biochemical intermediates. Feeding and death transfer organic material without manufacturing oxygen.

Cap reaction extents by every required substrate and available `O2`. As DO approaches zero, aerobic consumption becomes limited; remaining demand/material stays in the state. A fictional stress cue follows accepted concentration using documented teaching bands; do not present a species diagnosis. Prefer a stable posture plus text over fish death theatrics.

**Focused scientific checks:** zero-light production is zero; plant respiration is possible in either light phase; decomposition demand needs material; low DO limits actual consumption; exchange reverses above equilibrium; warming alone cannot delete oxygen; molecular consumption preserves total oxygen atoms; temperature and mixing comparisons change only their declared factors.

## 6. Nitrogen cycle: soil routes and implementation

### 6.1 Opening and traced-path outline

```text
+----------------------------------------------------------------------------+
| Nitrogen cycle                                                             |
| How does nitrogen in the air become available to a plant?                   |
|                                                                            |
|          AIR: (N2) nitrogen gas                                             |
|                   |                                                        |
|                   | fixation by microbial partners                         |
|                   v                         legume plant                   |
|  ---------------- SOIL -------------------------|-----------------------   |
|               [microbes in nodule] =====> organic N in plant               |
|                        |                        roots                      |
|                        | later residues                                    |
|                        v                                                   |
|                  dead organic N -- mineralization --> <NH4+> ammonium      |
|                                                        |                   |
|                                          root uptake <-+                   |
|                                                                            |
| Nitrogen gas needs a microbial transformation before this plant uses it.   |
|                                             [ Follow nitrogen ]            |
| Try another soil question                                                  |
+----------------------------------------------------------------------------+

Later, in the soil-transformation activity:
  <NH4+> ammonium -- nitrification --> [NO2-] nitrite --> {NO3-} nitrate
       |                                  oxygen conditions matter   |
       +---------- root uptake --------------------------------------+ 
                                                                     |
                                  low-oxygen route: denitrification -> N2
                                                                     |
                                  drainage below roots: leaching -----v
```

The default is a declared legume with compatible microbial partners. Use a highlighted possible route through the nodule; background alternatives appear only when needed. Nitrite becomes visible in the nitrification activity, rather than requiring learners to decode all chemical forms immediately.

For the no-partner comparison use the same legume species, initial biomass, soil stores, and resource conditions. Changing crop identity and microbial partners simultaneously would confound the investigation.

### 6.2 Required activities and a comparison outline

| Activity | Primary operation | What becomes visible |
| --- | --- | --- |
| Nitrogen through living things | `Follow nitrogen` | Fixation/uptake, plant incorporation, feeding, dead matter, and mineralization; one highlighted transfer at a time. |
| Microbial partners | `Compare microbial partners` | Two equal-start legume plots with/without compatible partners; nodules and incorporation differ. |
| Fertilizer and limits | Bounded dose choice + `Add nitrogen` / `Advance growth` | Available soil N changes first; growth develops over time and eventually another declared resource limits it. |
| Rainfall and nitrogen loss | Input scenario choice + `Apply the same rain` | Untreated, symbiotic, or fertilizer scenario; explicit root-zone drainage and surface runoff. |
| Aerated/waterlogged soil | Soil condition choice + `Compare pathways` | Nitrification and denitrification activity changes under declared conditions; plant stress is distinguished if modeled. |

```text
+----------------------------------------------------------------------------+
| Do microbial partners change nitrogen access?                              |
|                                                                            |
|    SAME LEGUME, NO PARTNERS          SAME LEGUME, COMPATIBLE PARTNERS        |
|             leaves                             leaves                      |
|           -- roots --                        -- roots --                   |
|           no nodule                          (nodules)                     |
|    N2 cannot enter this route          N2 -> microbial transformation       |
|       soil uptake remains                  -> plant organic N              |
|                                                                            |
| Compare equal starting plots over the same modeled growth period.          |
|                                         [ Advance growth period ]          |
| Return to nitrogen route                                                   |
+----------------------------------------------------------------------------+

Rain activity, changed state:
  ground surface -------- runoff containing nitrogen --------> outlet
  soil NO3- -------- roots take some up
       |
       +------------ drainage below roots --------------------> leached N
  Caption identifies which route carried the accepted loss.
```

Do not display every plot, pathway, measurement, and the optional pond together. If a three-input comparison is too dense, compare untreated versus the selected input in two plots, then switch the selected input while preserving the untreated reference. A three-plot quantitative activity is acceptable only after a separate simplicity review.

### 6.3 Authoritative model

Track stores on a common elemental-nitrogen basis, proposed `mmol N`: atmospheric `N2` nitrogen, nodule/microbial organic N, root-zone ammonium, nitrite, nitrate, plant organic N, animal organic N, dead organic N, and explicit outflow stores/ledgers. A store containing 1 mmol `N2` molecules contains 2 mmol N; do not mix molecule counts with the elemental ledger.

Proposed network:

```text
atmospheric N2 -- microbial fixation --> symbiotic/nodule N --> plant N
soil NH4+ ------------------------------------------ uptake --> plant N
soil NO3- ------------------------------------------ uptake --> plant N
plant N ---------------- feeding --> animal N
plant/animal/microbial N --- death/waste --> dead organic N
dead organic N -------- mineralization --> NH4+
NH4+ -------- nitrification stage 1 --> NO2-
NO2- -------- nitrification stage 2 --> NO3-
NO3- -------- denitrification --> atmospheric nitrogen
fertilizer boundary -------- declared dose --> NH4+ and/or NO3-
root-zone nitrate -------- drainage --> below-root-zone export
declared surface N -------- runoff --> downstream export
```

Fixation is microbial and requires compatible partners and an authored energy/resource capacity. Represent nodule oxygen regulation separately from bulk soil aeration (N3). Mineralization and uptake are different operations. Do not require nitrate formation before all uptake: roots can use ammonium in the teaching model.

Nitrification consists of two bounded fluxes, with at least one model interval of intermediate residence under the chosen step scheme. Denitrification requires nitrate, low-oxygen conditions, and a declared electron-donor capacity. V1 may aggregate gaseous intermediates into a clearly declared final atmospheric product; do not claim every denitrified atom becomes only `N2` in real soils. Omit detailed `N2O`, volatilization, clay adsorption, and other reactions explicitly unless implemented.

Growth is bounded by a stated minimum of nitrogen supply and another resource capacity, such as light. Give that second resource an authored fixed value in the fertilizer activity, not another default slider. Plant N storage cannot grow without removing nitrogen from soil or the symbiotic route. Visual leaf area follows a documented illustrative growth function, rather than being a nitrogen mass measurement.

Use a fixed, declared soil drainage/runoff scenario for the rain activity; do not imply a full hydrology model. In a simple nitrate-fertilizer preset, name the fertilizer form. For a mixed fertilizer, declare dose fractions summing to one. Dose is a fictional scenario amount, never fertilizer-application advice. Surface runoff and root-zone leaching have separate destinations; leaving the root zone does not automatically mean arrival in a pond.

**Focused scientific checks:** no direct gas-to-root uptake; no fixation without compatible partners; elemental balance through every form; explicit nitrite stage; reduced nitrification under the low-oxygen preset; denitrification bounded by available nitrate/donor capacity; plant growth limited by another resource after sufficient N; identical rain and duration in matched cases; each export recorded once.

## 7. Carbon cycle: routes, interventions, and timescales

### 7.1 Opening and biological outline

```text
+----------------------------------------------------------------------------+
| Carbon cycle                                                               |
| Where can carbon go after a plant takes it from the air?                    |
|                                                                            |
|              AIR: CO2 [C]                                                  |
|                  | photosynthesis                                          |
|                  v                                                         |
|               tree/plant -------- feeding --------> animal                 |
|                   |                                  |                     |
|                   +------------ respiration ---------+-----> AIR           |
|                   |                                                        |
|                   v dead matter                                            |
|               [soil organic C] -- decomposition --> AIR                    |
|                                                                            |
|                                     coast | surface ocean                  |
|                         quiet context     | geological stores below        |
|                                                                            |
| This carbon is entering plant material through photosynthesis.             |
|                                             [ Follow carbon ]              |
| Explore another carbon route                                               |
+----------------------------------------------------------------------------+
```

The marker indicates an element; its carrier label changes at the destination. It may remain in a store. The scene should not promise that the next click always moves it, nor force a route through every store. One selected transfer is prominent; other arrows remain subdued. Energy is not represented as a carbon store or a marker returning to the Sun.

### 7.2 Required activities

| Activity | Main action | Teaching result |
| --- | --- | --- |
| Biological pathways | `Follow carbon` | Photosynthesis, feeding, respiration, decomposition, and retention in soil; branch choices are contextual. |
| Forest clearing | Clearing scenario choice + `Clear this patch` | Carbon destinations reflect the selected fractions: air, dead matter, harvested material, retained biomass. |
| Regrowth | `Restore vegetation`, then `Advance a year` | Habitat structure and stored biomass recover gradually; prior clearing release remains identifiable. |
| Fossil fuel combustion | `Burn one fuel parcel` | Fossil store decreases by exactly the carbon transferred into the atmosphere in the declared complete-combustion preset. |
| Geological pathways | `Explore geological time` | Separate preset with burial, distinct fossil/carbonate stores, weathering, and geological return routes. |
| Ocean storage and exchange | `Advance one exchange interval` | A paired amount/rate observation appears only here; surface and deep stores are distinct. |

```text
Clearing activity, settled result:
+----------------------------------------------------------------------------+
| Where does carbon go when a forest is cleared?                              |
|                                                                            |
|     INTACT REFERENCE                    CLEARED PATCH                      |
|        trees [C]                        stumps / dead litter [C]           |
|                                         harvested material [C]             |
|                                         air receives burned fraction [C]   |
|                                                                            |
| Some carbon was released; some remains in material that can decay later.   |
|                                             [ Restore vegetation ]         |
| Return to carbon routes                                                    |
+----------------------------------------------------------------------------+

Geological activity, separate preset:
+----------------------------------------------------------------------------+
| How can carbon remain stored for very long periods?                        |
| GEOLOGICAL TIME: schematic intervals; not ordinary growing seasons          |
|                                                                            |
| atmosphere --- weathering-related route ---> ocean inorganic C             |
|                                              | carbonate deposition        |
| buried organic material                      v                             |
|          | long-term formation       carbonate sediments -> rock            |
|          v                                      |                          |
|     fossil carbon                       geological return -> atmosphere     |
|                                                                            |
| The selected route shows a possible transfer and long storage.             |
|                                     [ Advance geological interval ]        |
| Return to biological time                                                  |
+----------------------------------------------------------------------------+

Ocean activity, contextual measurement only:
  air CO2 <---- signed exchange ----> surface DIC <---- mixing ----> deep DIC
                     selected arrow
  [ Surface carbon stored: ... carbon units ]
  [ Net transfer this interval: ... carbon units / modeled interval ]
```

Returning from geological exploration restores the biological activity's state. It must not add millions of years to the user's saved forest timeline or silently alter the forest/fossil stores. State clearly when starting an independent preset. Preserve separate units/horizons; do not compare a biological “step” against a geological “step” as if they had equal duration.

### 7.3 Authoritative model

Proposed unit: normalized elemental-carbon teaching units, labeled `carbon units`. These are neither current global Gt C nor atmospheric ppm. Stores: atmospheric carbon in `CO2`, plants, animals, dead organic matter, soil organic C, harvested material, surface DIC, deep DIC, buried organic sediment, fossil carbon, carbonate sediment, carbonate rock, and a geological reservoir if the return route uses it.

Keep fossil carbon and carbonate rock distinct. Do not turn limestone directly into combustible fuel. Use an explicit graph with finite transfers; the carbon ledger is the sum of elemental C in all included stores plus accounted boundaries.

```text
photosynthesis: atmosphere -> plants
feeding: plants -> animals
respiration: plants/animals -> atmosphere
death/waste: plants/animals -> dead matter
decomposition: dead matter -> atmosphere and/or soil, with declared fractions
soil respiration: soil -> atmosphere
clearing: plants -> atmosphere + dead matter + harvested + retained plants
combustion: fossil carbon -> atmosphere
air-sea exchange: atmosphere <-> surface DIC
mixing: surface DIC <-> deep DIC
organic burial: declared organic donor -> buried organic sediment
long-term formation: buried organic sediment -> fossil carbon
carbonate deposition: DIC -> carbonate sediment, plus declared return partition
lithification: carbonate sediment -> carbonate rock
geological return: rock/reservoir -> atmosphere through named schematic routes
```

Define weathering with a source/destination budget, not a free negative atmospheric number. A permissible explicitly simplified silicate-weathering route moves atmospheric carbon into ocean DIC while non-carbon reactants are represented as assumptions. A carbonate-weathering route, if implemented, must also debit carbonate-rock carbon; it cannot use the same one-source accounting. Carbonate precipitation has a declared schematic DIC-to-sediment/atmosphere partition. These chemistry decisions require focused review before the geological preset passes; naming an arrow “weathering” is insufficient.

Air-sea exchange is a signed relaxation based on a declared effective air/surface equilibrium, with fixed teaching chemistry assumptions. It must support reversal. Because DIC is aggregated, do not present exact carbonate-species percentages, pH, or buffer capacity. Deep-ocean transfer occurs through its own limited mixing flux, not instant access to the entire ocean inventory.

Clearing fractions must be nonnegative and sum to one. A burning fraction can release immediately; litter/harvest fractions follow their later decay or export rules. If harvested material leaves the represented scene, record a boundary export instead of keeping it both inside and outside the ledger. Changing the clearing preset must not retroactively repartition an already accepted action.

Regrowth initializes restoration conditions, not a large carbon deposit. Each subsequent photosynthetic increment debits the air store and competes with respiration/resource constraints. Combustion consumes a finite parcel; repeated action cannot burn below zero. Separate formation and release rates, with declared time units, prevent instantaneous compensation by arbitrary regrowth or ocean uptake.

If carbon dioxide mass is added in a future quantitative activity, `mass_CO2 = mass_C * 44/12` using the declared nominal molecular masses; label both quantities. Do not apply that conversion to the default normalized marker display.

**Focused scientific checks:** balance through all pathways and interventions; clearing fractions; no negative fossil store; plants both assimilate and respire; restoration is gradual; geological formation inactive on the ordinary biological horizon; independent preset return preserves prior state; air-sea reversal; surface/deep distinction; store amount and rate have different units; no unimplemented climate/pH output.

## 8. Shared scientific kernel, separate domain models

Share reliable transfer accounting rather than a universal learner dashboard. Proposed pure kernel responsibilities:

1. Validate finite, nonnegative stores and supported parameters.
2. Compute all candidate transfers from one immutable starting snapshot per substep.
3. Resolve competing withdrawals together. For reactions requiring several substrates, choose bounded reaction extents subject to every donor constraint; sequential independent clamps are insufficient.
4. Commit donor debits and destination credits atomically.
5. Record external inputs/exports exactly once and verify the elemental ledger.
6. Produce an accepted flux record with process, source(s), destination(s), amount, units, and elapsed model time.
7. Derive scene/caption outputs from accepted state and fluxes.

```text
authored setup + supported action
              |
              v
      validated domain reducer
              |
              v
  proposed fluxes -> constrained extents -> atomic accepted state
                                          |             |
                                          v             v
                                  conservation ledger   scene projection
                                                        |
                                            scene + short caption
```

Use deterministic fixed model substeps for nonlinear dynamics, independent of animation frames. Stage actions can integrate several substeps and then settle. Confirm result convergence when halving the internal step; don't rely solely on nonnegativity tests. Proposed balance tolerance: `abs(residual) <= 1e-9 * max(1, initial_total, cumulative_inputs)` in each model's elemental units; tune to justified numerical precision, not to hide drift.

Tracers select from accepted positive transfers and can remain at a store when no supported transfer exists. Use seeded selection if stochastic route selection is enabled. An instructional route can highlight a real available pathway but cannot fabricate a nonzero transfer. Store quantities own the budgets; visual dots and tracer positions do not.

Reject NaN, Infinity, invalid enum values, negative inputs, oversize doses, and missing command bindings without partial mutation. Restart must name its scope: `Restart this pond`, `Restart this soil comparison`, or `Restart this carbon activity`. Presentation resizing, selection, dialog opening, and caption changes must not mutate the scientific state.

## 9. Repository integration and editable composition

### 9.1 Current inventory, verified by reading this working tree

The existing nine-science implementation is present, with substantial uncommitted work. Preserve it and unrelated changes. Paths read for this plan include:

| Existing path under `src/web/` | Relevance / caution |
| --- | --- |
| `src/simulations/runtime/contribution.ts` | `DomainModel`/`DomainContribution`, validated action contracts, initialization, measurement, runtime stepping. |
| `src/simulations/runtime/assembly.ts` | Explicit domain contributions and concrete presentation-contract registrations. |
| `src/simulations/domains/science/index.ts` and `specs.ts` | Existing domain, nine-kind dispatch, settings/actions/outputs; current kinds exclude the new cycles. |
| `src/simulations/components/systems/science/contracts.ts` | Existing `ScienceState`; not a complete elemental-store network. |
| `src/simulations/components/catalog/index.ts` and `science.ts` | Model/control/appearance catalog contracts; question configuration currently special-cases `prefabs/science/`. |
| `src/simulations/components/views/recipe/RecipeAppearance.tsx` | Concrete scene adapter map and special handling of science adapters. |
| `src/simulations/components/views/recipe/NodeView.tsx` | Existing science-control routing; new definitions require deliberate supported rendering. |
| `src/simulations/components/views/SciencePanels.tsx` and `views/science/` | Existing action/caption/investigation patterns; do not inherit universal control inventories. |
| `src/simulations/components/visuals/science/ScienceScene.tsx` | Existing SVG interactions; do not add all new cycles to its large switch by default. |
| `src/simulations/pre-made/water-cycle/recipe.json` | Actual v2 recipe/v3 document, separate nodes, command/value/attachment connections, saved board layout. Reuse its contract, not its full control wiring. |
| `scripts/domains/science/` | Existing verification/browser/live/replay/task harnesses; not yet cases for these cycles. |
| `src/simulations/domains/ecology/index.ts` | Existing nutrient-growth capability; reuse only if units/state/contracts match. |

Important findings: the existing live harness restricts evidence to `023-validation`; its cases are derived from the nine science specs. It cannot establish three-cycle coverage without modification or a dedicated harness. Existing appearance question handling is namespace-specific; a new domain must explicitly support authored learning questions. The [023 redesign report](023-NINE-SCIENCE-SIMULATIONS.md#historical-redesign-round-1) describes a prior simplicity iteration and separate evidence gaps; do not copy its pass claims into these lessons.

### 9.2 Proposed homes

Choose a cohesive `biogeochemistry` contribution with separate typed models instead of extending the nine-kind state switch. Confirm final names against registration validation during implementation. These files/IDs are **proposed**, not existing APIs:

```text
src/web/src/simulations/
  domains/biogeochemistry/
    index.ts                     DomainContribution + three DomainModels
  components/systems/biogeochemistry/
    transfers.ts                 constrained transfer/reaction kernel
    contracts.ts                 elemental units, fluxes, activity state
    oxygen.ts                    pond reducer and projections
    nitrogen.ts                  root-zone reducer and projections
    carbon.ts                    biological/geological reducers
  components/visuals/biogeochemistry/
    OxygenScene.tsx
    NitrogenScene.tsx
    CarbonScene.tsx
    cycle-scenes.css
  components/views/biogeochemistry/
    CycleAction.tsx               supported primary action only
    CycleCaption.tsx              accepted-state explanation
    CycleActivity.tsx             one purposeful activity flow
    CycleMeasurement.tsx          quantities when needed
  components/catalog/biogeochemistry.ts
  pre-made/
    oxygen-cycle/recipe.json
    nitrogen-cycle/recipe.json
    carbon-cycle/recipe.json

src/web/scripts/domains/biogeochemistry/
  cases.cjs                      invariant / interaction / prompt cases
  verify.cjs                     trusted model + recipe checks
  browser.cjs                    actual learner/builder flows
  live.cjs                       actual provider receipts + accepted exports
  replay.cjs                     frozen accepted recipe review
```

Use SVG/HTML initially because these cutaways need readable labels, stable selection, and modest rendering cost. This is a justified implementation choice, not a restriction against later 3D. No asset-generation workflow is needed for the first version.

Proposed definition IDs: `prefabs/biogeochemistry/OxygenCycle`, `NitrogenCycle`, `CarbonCycle`; adapters `cycle-oxygen`, `cycle-nitrogen`, `cycle-carbon`; independent supported control/caption/activity definitions. Use unit-bearing scalar outputs where appropriate and validated scene snapshots for visual bindings. Diagnostic ledgers remain internal; distinguish them from learner observations required for an actual quantitative task.

Register through existing explicit assembly/catalog maps. Replace namespace-specific learning-question presentation checks with an explicit supported capability if needed; avoid broad arbitrary-prefix fallbacks. Check planner composition/default-observation behavior so internal balance outputs do not automatically become learner metric cards.

### 9.3 Recipe and builder outline

```text
CONNECTIONS VIEW (authoring only)

                   attachment
  [cycle model] ----------------------> [scene appearance]
        |
        +--- accepted scene value ----> [short caption]
        +--- accepted activity value -> [primary action]
        +--- accepted activity value -> [activity chooser]
        +--- needed quantity ---------> [optional measurement]

  [primary action] ---- command ------> [cycle model]
  [activity chooser] -- command ------> [cycle model]
  scene selection ------ command -----> [cycle model / supported selection]

BUILD / LEARNER BOARD
  [ large scene                         ]
  [ short caption ]        [ main action ]
  [ quiet activity entry ]
  [ measurement only in the relevant authored activity ]
```

Each node can be selected, moved, resized, configured, and remapped through actual builder operations. A group is allowed for a two-run comparison with shared timing, but not merely to lock all lesson content together. The JSON owns copy, defaults, allowed activities, dependencies, layout, and presentation sizes. The loader must not inject missing controls or invent lesson content based on the slug.

A scene may display a model-owned projected comparison inside its drawing area, while caption/actions/measurements stay independent. Use explicit snapshot projections or independent model instances with declared synchronization. Do not create duplicate mutable model state inside React.

Save/reopen preserves authored configuration, activity permissions, identity/connection remapping, board positions, and question text. Define export semantics: ordinary recipe export is an authored setup, not automatically a runtime checkpoint. If runtime checkpoints are implemented, version them separately and test their ledgers/preset contexts. Enter **Try lesson using the builder button**, operate the result, and measure geometry; a mounted zero-height SVG is a failure.

## 10. Activity, selection, motion, and recovery states

| State | Required behavior |
| --- | --- |
| Opening | Static scene, one question, useful accepted state, clear first action. |
| Advancing | One bounded model advance; stable button focus; prevent accidental duplicate input while committing. |
| Settled | Scene and caption agree with the committed state; next action has a meaningful label. |
| Selecting a route | One highlight and nearby detail; Escape clears selection; no unrelated model restart. |
| Choosing an activity | One labeled select plus `Start activity` and `Cancel`; preserve original state until accepted. |
| Applying a numeric draft | Keep local draft; unit/range near field; rejected input leaves last accepted state intact. |
| Completed activity | A concise outcome and scoped retry/next activity; no disabled-button graveyard. |
| Empty store / unavailable route | Explain the constraint; do not animate nonexistent matter. |
| Missing binding | Builder identifies needed connection; learner gets a useful unavailable state without raw IDs. |
| Unsupported saved content | Existing validation/recovery flow; never pretend to have loaded a valid lesson. |

Opening an activity dialog is a distinct decision; keep it compact. A five-variable settings dialog with baseline/playback/readout controls fails even if it is hidden initially. If a task needs an exact quantity, use the existing reusable numeric control with draft handling. Avoid slider + duplicate equally prominent numeric values.

Default stage actions use brief optional transitions and then stop. No ongoing decorative fish swimming, flowing tracer loops, or ambient waves. Reduced motion applies the same committed state immediately, using arrow emphasis, text, and selected-store outlines. Animation time must not determine biological time.

If continuous playback is added because a later investigation requires it, the primary action toggles between a named watch/pause action. Keep pause available while movement runs. Do not use the one-to-three-controls guardrail to remove necessary motion access. See U2/U3; reduced motion support alone does not replace required controls for other users.

Essential selection works with keyboard and pointer; scene marks have enlarged hit areas, visible focus, supported Enter/Space activation, and accessible names. Prefer a single contextual selector for a dense network over dozens of tiny focusable arrows. Provide concise accessible state descriptions and polite announcements on explicit actions; do not stream per-frame announcements.

## 11. Responsive outline and layout verification

```text
SHORT DESKTOP                              NARROW VIEW
+-------------------------------------+    +---------------------------+
| Title / one question                |    | Title / one question      |
|                                     |    |                           |
|   scene with less decorative sky    |    |   focused cutaway         |
|   stable object/arrow labels        |    |   legible labels          |
|                                     |    |                           |
| one sentence     [primary action]   |    | one sentence              |
| quiet activity entry                |    | [ primary action ]        |
+-------------------------------------+    | quiet activity entry      |
                                           +---------------------------+
```

At narrow widths, stack independently authored items; for comparison scenes, stack the two plots with aligned labels and the same horizon rather than shrinking both to unreadable thumbnails. Preserve essential process context through an explicit view projection. Do not crop away the source/destination that explains the selected transfer.

Required implementation viewports: 1440x900, 1280x800, 1366x768, 1920x1080, and 390x844; include 200% browser zoom. Review learner, builder Build, Connections/settings where relevant, and builder Try lesson. Inspect final CSS pixel text/target sizes, actual SVG/object geometry, prompt clearance, floating-navigation overlap, and scroll access. Screen fit alone is insufficient.

## 12. Optional nitrogen-to-pond handoff

Implement only after the three independent lessons pass. A lesson hyperlink is not a live scientific coupling; label either honestly.

For a real coupling, use an explicit transfer contract containing nitrogen form, amount in mmol N, source instance/outlet, destination store, event ID, and model interval. Use a configured catchment routing fraction/delay; only the routed fraction of an outlet reaches the pond. A receiving owner commits a transfer once. Reject incompatible units, repeated IDs, and absent stores atomically; never debit a source if the destination rejects it.

The pond extension needs nitrogen-bearing algal and dead-material stores plus a declared nitrogen-limited growth law. Oxygen responds to accepted algal production, respiration, mortality, and decomposition with delays. Do not connect a nitrate scalar to a decorative green pond or subtract oxygen on fertilizer arrival. If also representing carbon, declare the stoichiometric assumptions and reconcile all affected ledgers.

Do not directly connect existing ecology percentages to mmol N. The current nutrient-growth model may supply lesson concepts/patterns, but coupling needs a verified unit/state contract. Keep nitrogen-limited assumptions explicit and avoid implying that adding nitrogen always creates a bloom.

## 13. Implementation sequence and concrete gates

| Phase | Work | Exit condition |
| --- | --- | --- |
| 1. Contract inventory | Recheck current APIs, dirty-tree boundaries, cycle requirements, recipe ownership, generation defaults | File/definition/action/units map and per-activity control inventory recorded. |
| 2. Scientific kernel | Implement constrained transfers, reaction extents, boundary accounting, deterministic stepping | Conservation, boundedness, competition, invalid-action atomicity, and convergence checks pass. |
| 3. Oxygen vertical slice | Real pond model + scene + independent caption/action + complete minimal recipe | Day/night outcome is visible; first desktop simplicity review completed and issues fixed. |
| 4. Oxygen investigations | Equal-start comparisons, vegetation, decomposition, isolated warming, mixing, atom explanation | Every O investigation works without a dashboard; recipe round trip passes. |
| 5. Nitrogen slice and activities | Chemical forms, microbial route, symbiosis, transformations, growth limits, rainfall | Full N network ledger passes; all five investigations are independently understandable in review. |
| 6. Carbon slice and activities | Biology, interventions, ocean, geological preset and time separation | Carbon and clearing budgets pass; timescale/chemistry review complete. |
| 7. Authoring and catalog | Register supported capabilities; independent editing; question capture; planner exposure | Remix/edit/save/export/reopen/Try lesson preserves setup and visuals for all three. |
| 8. Generated compositions | Actual Apertus/Laya requests and accepted exports | Fresh complete batch + provider receipts; generated layouts pass the same simplicity criteria. |
| 9. Final UX/regressions | Desktop/keyboard/motion/zoom/recovery review; affected existing lessons | No blocking/major issues or missing mandatory evidence; final checks recorded honestly. |

Do not multiply an unreviewed first scene into three lessons. If a shared control/host defect is found, fix it at the shared source and recheck the affected existing nine-science lessons and Gas behavior. Do not restructure or overwrite unrelated uncommitted work.

## 14. Meaningful verification and online generation

### 14.1 Scientific / contract suite

Implement the proposed `scripts/domains/biogeochemistry/verify.cjs` before invoking it. Test independent invariants, not functions compared with their own implementation. Include hand-calculated transfer fixtures, zero-source/zero-rate cases, competing withdrawals, boundary accounting, multiple seeds where applicable, deterministic replay, independent instances, reset scopes, and saved recipe round trips.

| Area | Required evidence |
| --- | --- |
| Kernel | Competing consumers cannot overdraw a donor; multi-substrate reactions preserve elemental totals; rejected batch is atomic. |
| Oxygen | Stoichiometric atom check, accepted DO budget, nighttime respiration, bidirectional exchange, isolated temperature change, bounded decomposition. |
| Nitrogen | Elemental N conservation, no direct `N2` uptake, compatible symbiosis, nitrite delay, oxygen-conditioned transformations, growth limitation, separate exports. |
| Carbon | Equal total C before/after clearing/burning, retained material, gradual regrowth, distinct fossil/carbonate stores, ocean reversal, independent geological timeline. |
| Comparison | Same start/seed/horizon/other conditions; declared changed factor only; mismatched imported comparisons not labeled matched. |
| Presentation | Every visible result is an accepted-state projection; no runtime advance in React; resize/selection leaves science unchanged. |
| Recipe | Current schema, exact dependencies, supported commands/bindings, complete saved layout, regenerated registry, identity remapping. |

Existing commands, to use during implementation:

```sh
pnpm --dir src/web recipes:generate
pnpm --dir src/web test:recipes
pnpm --dir src/web test:public-catalog
pnpm --dir src/web exec tsc --noEmit
pnpm --dir src/web test:science
pnpm --dir src/web test:gas-recipe
```

Proposed new commands after their harnesses exist:

```sh
node src/web/scripts/domains/biogeochemistry/verify.cjs
UX_TEST_URL=http://127.0.0.1:43110 node src/web/scripts/domains/biogeochemistry/browser.cjs
UX_TEST_URL=http://127.0.0.1:43110 GENERATION_RUNS=3 node src/web/scripts/domains/biogeochemistry/live.cjs
```

Run scoped Biome on the actual changed files; no placeholder filenames. Run `pnpm --dir src/web test` and the existing production-build command on the final candidate after focused checks pass. Recheck affected browser regressions once; repeat only for a change/failure/unresolved concern. Never relabel a failed or unrelated old batch as passing.

### 14.2 Actual Apertus and Laya acceptance

Follow the repository's established actual-provider setup, reusing healthy services. Use `make run-apertus`, `make run-laya`, and inference smoke targets only when needed. Verify current provider settings from the repository at implementation time; this plan does not claim the services are running or the currently pinned model IDs remain appropriate.

Freeze source/catalog/styles/provider configuration for a final batch of **three serial rounds x three canonical prompts = nine fresh generations**. Add development paraphrases for each cycle, including “plants breathe at night,” “air nitrogen versus fertilizer,” and “slow fossil formation versus fast burning.” Nine attempts are a bounded repeatability check, not a guarantee of future success.

| Cycle | Canonical request |
| --- | --- |
| Oxygen | Show why pond oxygen can fall at night, including plants that both produce and use oxygen. Let me investigate dead leaves separately. |
| Nitrogen | Help me follow nitrogen from air into a legume with microbial partners, then compare what the same rain does to untreated and fertilized soil. |
| Carbon | Let me follow carbon through plants and animals, compare clearing with regrowth, and explore fossil storage on a separate geological timescale. |

Require actual Laya decisions and actual Apertus inference on the accepted composition path. Capture provider/model receipts, request IDs, timestamps, failures/repairs, original prompt, non-secret configuration, source fingerprint including uncommitted files, accepted recipe, validation outcome, and artifact locations. Fixture, cache, fallback, or replay does not satisfy live-provider proof. Do not put secrets into evidence.

Write a dedicated evidence root such as `024-validation/` and enforce it in the new harness. The existing `science/live.cjs` root restriction must not be bypassed by an environment variable. Preserve failed attempts rather than retrying until only success remains. Inspect actual generated layouts; repairing them manually creates a separate artifact and invalidates their use as original-generation acceptance evidence.

AI selects and configures catalog-supported components. It must not generate executable science, alter conservation rules, invent numerical calibration, or introduce all controls just because the model supports them. Public descriptors should state allowed activity/control roles and the relevant simplifications.

## 15. Mandatory UX review and evidence plan

Apply IMPORTANT's simplify-and-review loop to **every** activity and generated composition. Planning ASCII is not UX verification. At implementation time discover available Playwright MCP tools and use them for requested screenshots when available. If unavailable, record standalone Playwright/browser evidence as a fallback and mark MCP verification Not tested; do not claim it happened.

Opening inspection comes before operating the flow or consulting implementation notes. Review title/question, action prominence, total targets including workspace chrome, scene presence, chemical-label readability, spacing, and whether numbers are truly necessary. Then complete an outcome-only task.

| Lesson | Outcome-only task | Expected visible explanation |
| --- | --- | --- |
| Oxygen opening | Explain why oxygen availability changes when the pond passes into darkness. | Production becomes inactive while respiration/exchange continue; dissolved availability follows the accepted budget. |
| Oxygen alternatives | Explain what dead material, warmer water, or mixing changes in the respective activity. | Distinct causal pathway; no instantaneous deletion or one-way mixing claim. |
| Nitrogen opening | Explain how air nitrogen reaches the selected plant and what would prevent that route. | Labeled microbial transformation, nodule/organic route, absent direct gas uptake. |
| Nitrogen alternatives | Determine where nitrogen goes after rain and why extra fertilizer eventually stops increasing growth. | Separate exports and another resource limit; microbes and uptake are not conflated. |
| Carbon opening | Explain where the selected carbon can move from the plant. | Supported branching transfer, changing carrier, optional residence. |
| Carbon alternatives | Explain where clearing/burning carbon goes and why regrowth or deep storage takes time. | Source/destination accounting and separate time contexts are visible. |

For each task inspect opening, meaningful changed state, relevant comparison, keyboard focus, recovery, reduced motion, and short/narrow/zoom layouts. In the builder: select independent scene/caption/action, edit a supported value, undo where applicable, save/export/reopen, and launch Try lesson through its button. Operate the resulting lesson and verify actual scene dimensions.

Proposed evidence structure:

```text
docs/agent-only/implementation/024-validation/
  <frozen-batch>/
    manifest.json
    model-report.json
    live/<round>/<cycle>/accepted-recipe.json
    iteration-<n>/<cycle>/<activity>/<host>/<viewport>/
      opening.png
      changed.png
      comparison.png          when comparison is the task
      keyboard-focus.png
      recovery.png            when applicable
    findings.md
    acceptance-ledger.json
```

Every capture records route, recipe identity, activity, seed, modeled time, viewport, motion preference, browser, capture method, and source fingerprint. Inspect screenshots after capture. Link each concern/failure to reproduction steps, severity, fix, and recapture as required by guide 004. Retain earlier evidence.

Criterion statuses: Pass, Concern, Fail, Not tested. No averaging across activities or lessons. Technical assertions establish behavior; screenshots establish appearance; an agent's review establishes inferred usability concerns. First-time learner comprehension requires participant observation, separately stated if unavailable. User criticism requires another design iteration even when automated checks pass.

## 16. Definition of done and implementation report

- [ ] All three core lessons exist as complete ordinary JSON recipes with independent editable items.
- [ ] Every supplied core investigation is reachable through a focused activity with a clear question/action.
- [ ] Research-supported mechanisms and all teaching simplifications are recorded in model assumptions and lesson metadata.
- [ ] Elemental conservation, bounded transfers, deterministic stepping, atomic rejection, and independent instances pass.
- [ ] Tracers and visuals agree with accepted stores/fluxes, including residence and unavailable routes.
- [ ] Opening and activity views pass IMPORTANT's removal test and real total-control review.
- [ ] Chemical forms, motion alternatives, focus, targets, recovery, short desktop, narrow view, and zoom are usable in actual hosts.
- [ ] Matched comparisons declare equal starts, horizon, seed, and changed factors.
- [ ] Save/reopen/remix/undo/Try lesson preserve authored values, questions, independent placement, and supported behavior.
- [ ] Catalog definitions have real adapters and generation exposes only useful learner capabilities.
- [ ] A fresh frozen nine-generation batch supplies actual Apertus/Laya evidence and accepted-layout review.
- [ ] Required screenshots are inspected, findings resolved and recaptured, and capture-method limitations stated honestly.
- [ ] Existing affected science/shared-component/Gas regressions and final required checks are recorded.
- [ ] No blocking/major scientific or usability issue remains; missing mandatory evidence prevents a completion claim.

Write `024-IMPLEMENTATION-EVIDENCE.md` when implementation occurs. Lead with delivered behavior and material gaps, then link source/assumption notes, model reports, accepted exports, screenshots, findings, and rerun commands. Mark optional coupling as implemented, deferred, or out of scope. Do not claim browser verification, provider acceptance, usability approval, or simulation completion from this planning document.
