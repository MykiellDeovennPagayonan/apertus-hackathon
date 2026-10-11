# Science simulation concepts

Date: 2026-10-10  
Status: Proposed learning experiences; new models and presentations are not implemented by this document.  
Scope: The nine simulations selected by the user.

## 1. Direction

These simulations make normally hidden processes visible. Learners inspect identifiable objects, follow stages, change a condition, and observe the consequences. The main experience should be an animated scene with meaningful interactions; equations and numerical charts are secondary.

The selected subjects are biology, genetics, ecology, geology, and the water cycle. Earth science necessarily connects with physics and chemistry, but these lessons focus on Earth structures, biological processes, and environmental pathways rather than duplicating standalone mechanics or chemistry experiments.

| ID | Simulation | Main learning question | Primary visual |
| --- | --- | --- | --- |
| SCI-01 | Cell Division | How does a cell distribute copied chromosomes into daughter cells? | Cell and chromosome animation |
| SCI-02 | Immune Defense | How does an immune response recognize a threat and develop memory? | Tissue scene with immune actors |
| SCI-03 | Genome to Organism | How do inherited DNA variants and gene expression contribute to traits? | Organism-to-genome zoom and family tree |
| SCI-04 | Pollination Network | How does pollen transfer connect flowers, pollinators, and fruit formation? | Flower patch with pollinator routes |
| SCI-05 | Invasive Species Spread | How does an introduced species establish and spread through a habitat? | Habitat map across seasons |
| SCI-06 | Inside Earth | How are Earth's layers arranged, and how does mantle material move? | Cutaway Earth with layer inspection |
| SCI-07 | Plate Boundaries | How do plate interactions create different landscapes? | Surface and geological cross-section |
| SCI-08 | Volcano's Life Cycle | How do magma supply and volcanic structure influence activity? | Volcano cutaway and event timeline |
| SCI-09 | Water Cycle | Where does water move, and how do environmental changes alter its pathways? | Watershed with linked water stores |

## 2. Shared learner experience

- Start with an already populated, understandable scene and one short learning question.
- Provide play, pause, single-step, speed, and reset when the model advances through time. Stage-based lessons may use next stage instead of a continuous clock.
- Make objects selectable. Inspection explains identity, current state, and the process currently affecting the object.
- Show arrows, labels, paths, and highlighted structures as optional overlays.
- Offer a small number of controls that have visible consequences. Put advanced configuration in setup.
- Let learners compare a baseline run with one changed condition, using the same initial state and random seed where applicable.
- Include an event timeline and a few relevant observations rather than a large dashboard.
- Use labels and shapes as well as color to distinguish states.
- State when time, distances, actor counts, or process rates are compressed for teaching.

## 3. SCI-01 — Cell Division

### Concept and learning goals

Follow a simplified animal cell through the cell cycle and mitosis. Learners identify DNA replication before mitosis, chromosome alignment, sister chromatid separation, and the formation of two daughter cells.

### First-version experience

Start with one cell in interphase. Advance through DNA replication, prophase, metaphase, anaphase, telophase, and cytokinesis. Select a chromosome to preserve its identity through the animation. Finish with two daughter cells and compare their chromosome sets.

### Objects and controls

- Objects: cell boundary, nucleus, chromosome pairs, sister chromatids, spindle, and daughter cells.
- Controls: next stage, play/pause, chromosome labels, spindle overlay, and reset.
- Setup: a small teaching chromosome set and an optional chromosome-separation error scenario.
- Inspection: distinguish a chromosome from its copied sister chromatids and distinguish chromosome count from DNA amount.

### Model and observations

Use a stage state machine with stable chromosome identities and explicit replication/separation events. Animation interpolates the model's stages; it does not independently decide chromosome movement or inheritance.

Show current stage, copies of DNA, chromosome identities in each daughter cell, and a short explanation of the transition. A separation-error scenario can reveal unequal chromosome allocation without turning the lesson into a disease simulator.

### Example exploration

“Track the blue chromosome from replication to the daughter cells. Which step ensures each daughter receives a copy?”

### Rough layout

```text
+---------------- CELL DIVISION ----------------+
| Interphase -> Prophase -> Metaphase -> ...      |
|                                                |
|     ( ~ ~ )         ( X | X )       ( | ) ( | ) |
|      nucleus          spindle       daughters  |
|                                                |
| Selected chromosome: A    Stage: metaphase      |
| [Next stage] [Play] [Spindle] [Reset]            |
+------------------------------------------------+
```

### Boundaries and acceptance

The first version covers mitosis, not meiosis. Use a visibly simplified chromosome set rather than implying that a small example is a complete human genome. A successful run preserves chromosome identity and produces matching daughter chromosome sets in the normal scenario.

## 4. SCI-02 — Immune Defense

### Concept and learning goals

Make innate response, adaptive recognition, and immune memory visible in a fictional tissue environment. Learners compare a first exposure with a later exposure to the same modeled pathogen.

### First-version experience

Introduce a pathogen into a small tissue scene. Watch innate immune actors respond, an antigen-presenting actor connect recognition to an adaptive response, and matching lymphocytes activate. Replay exposure after memory has formed.

### Objects and controls

- Objects: tissue cells, pathogens, phagocytes, an antigen-presenting cell, simplified B and T cells, antibodies, and memory cells.
- Controls: introduce pathogen, play/pause, inspect actor, show recognition links, repeat exposure, and reset.
- Setup: initial exposure level and a small set of distinct fictional antigen identities.
- Optional later scenario: a changed antigen that is less well recognized by existing memory.

### Model and observations

Use bounded actor states for encounter, recognition, activation, response, and memory. Keep innate containment distinct from antigen-specific recognition. Antibody binding and clearance should be separate events so binding does not automatically imply destruction.

Show pathogen burden, active response types, memory identities, and exposure history. Compare the response timing and burden between first and repeat exposure under the same starting conditions.

### Example exploration

“Expose the tissue twice to the same pathogen. Which actors respond differently the second time, and why?”

### Rough layout

```text
+---------------- IMMUNE DEFENSE ----------------+
| Tissue:  [cell]   x x pathogen   [cell]          |
|                    ^                            |
| phagocyte O --> x   | Y antibody                |
|                                                |
| recognition -> activation -> response -> memory |
| [Expose] [Inspect] [Repeat exposure] [Reset]     |
+------------------------------------------------+
```

### Boundaries and acceptance

This is a qualitative teaching model, not a medical prediction tool. Compress timing explicitly and avoid implying that all infections follow one pathway or that memory guarantees protection. Repeat exposure must consult the stored antigen identity rather than grant a universal response bonus.

## 5. SCI-03 — Genome to Organism

### Concept and learning goals

Expand the original inherited-traits idea into a connected genetics experience. Learners move between organism, cell, chromosome, gene, DNA variant, expression, and offspring inheritance.

The lesson should distinguish:

- Genome: the organism's genetic material represented by the model.
- Chromosomes: organized DNA structures carrying multiple modeled genes.
- Genes and alleles: a gene's role and alternative versions at a locus.
- Genotype and phenotype: inherited configuration and observed trait.
- Expression: when and where a modeled gene is active.
- Recombination: the exchange of segments between homologous chromosomes during meiosis.
- Mutation: a change to DNA that may have no visible effect or may alter a modeled function.

### First-version experience

Use a fictional diploid organism with a small, explicitly partial teaching genome. Select a visible trait, find its contributing gene or genes, inspect inherited alleles, and see a simplified expression-to-function-to-trait pathway. Breed two organisms and trace parental chromosome segments into offspring.

Include three kinds of example trait: a simple dominant/recessive trait, a trait influenced by multiple genes, and a trait whose expression depends on an environmental condition. Dominance belongs to a specific trait relationship; do not present one allele as universally “stronger.”

### Objects and controls

- Objects: organism, tissue/cell view, homologous chromosome pairs, loci, DNA segments, expression indicators, gametes, offspring, and pedigree.
- Controls: zoom level, select trait, inspect gene, edit a permitted variant, change environment, form gametes, choose parents, breed, and trace ancestry.
- Setup: parent genomes, environmental preset, seeded inheritance, and optional mutation.
- Gene edits apply to a new modeled organism or explicitly selected germline scenario; do not silently rewrite existing descendants.

### Model and observations

Store stable chromosome/locus identities, two allele copies per diploid locus, sequence snippets, trait contribution rules, and expression state. Sequence snippets are illustrative, not functional whole-genome prediction inputs.

Model gamete formation separately from mitotic cell division. Each gamete receives one chromosome set. Recombination operates on ordered homologous segments, with provenance retained. Fertilization combines two gametes. Distinguish a somatic mutation from a mutation in a lineage contributing to gametes.

Show genotype, expression by selected tissue, modeled functional output, phenotype, parental segment provenance, and an offspring family tree. Represent a simplified DNA -> RNA -> protein/function pathway where appropriate, while acknowledging that some genes produce functional RNA rather than protein.

### Suggested lesson sequence

1. Inspect one organism's chromosomes and locate a trait-associated gene.
2. Compare two alleles and observe a simple trait rule.
3. Change an environmental condition and observe expression-dependent behavior.
4. Follow meiosis, recombination, gamete formation, and fertilization.
5. Compare siblings and trace their inherited segments.
6. Introduce a permitted mutation and distinguish DNA change from guaranteed visible change.

### Example exploration

“These siblings share parents but have different markings. Trace the inherited chromosome segments that contribute to the difference.”

### Rough layout

```text
+---------------- GENOME TO ORGANISM ----------------+
| Organism -> Cell -> Chromosomes -> Gene -> DNA       |
|    /\        (o)       X X          [G2]   ATCG...   |
|   /oo\                                              |
|                                                     |
| Parent A: [AAA|BBB]   Parent B: [CCC|DDD]             |
| Gametes:     [ABB]               [CCD]               |
|                         \       /                   |
| Offspring genome:       [ABB / CCD]                 |
|                                                     |
| Variant -> expression -> function -> visible trait  |
| [Inspect] [Edit variant] [Environment] [Breed]        |
+-----------------------------------------------------+
```

### Boundaries and acceptance

“More complete” means connected coverage of genetics concepts, not a real whole-genome simulator. Avoid deterministic claims about real human traits or disease. Every offspring allele must have parental provenance or an explicit mutation event. Reset and seeded replay must reproduce inheritance. Environmental changes may affect modeled expression without changing the inherited DNA sequence.

## 6. SCI-04 — Pollination Network

### Concept and learning goals

Follow pollen from a flower to a compatible recipient. Explore how pollinator visits, flowering overlap, and habitat arrangement influence successful pollination and later fruit formation.

### First-version experience

Open a flowering patch containing two fictional plant species and several pollinators. Select a pollinator, follow its visits, and inspect pollen carried between flowers. Remove a flowering patch or shift bloom timing and compare outcomes.

### Objects and controls

- Objects: flowers, species identities, bloom windows, pollen loads, pollinators, nests/shelter, and developing fruits.
- Controls: add/remove flower patch, shift bloom period, change pollinator availability, follow pollinator, and advance day.
- Inspection: flower availability, visit history, pollen origin, recipient compatibility, and fruit-development stage.

### Model and observations

Use visit/transfer events, finite pollen loads, explicit species compatibility, and a delayed fruit-development stage. Pollination, fertilization, and fruit formation are distinct modeled stages. Include a stated resource condition for successful fruit development.

Show visits, compatible pollen transfers, flowers reached, and developing fruit. Render the transfer network as an optional overlay instead of replacing the flower scene with a graph.

### Example exploration

“Flowers remain abundant, but their bloom periods no longer overlap. What happens to compatible pollen transfer?”

### Rough layout

```text
+---------------- POLLINATION ----------------+
| Species A        bee -->       Species A    |
|    \|/             b              \|/      |
|     |       pollen trail ....      |       |
|                    Species B: \|/          |
| [Bloom timing] [Add patch] [Follow bee]      |
| Compatible transfers: ...  Fruits: ...      |
+---------------------------------------------+
```

### Boundaries and acceptance

Use fictional species rules and avoid implying that all plants require animal pollinators. Incompatible pollen must not count as successful pollination. Fruit should not appear instantly after any visit.

## 7. SCI-05 — Invasive Species Spread

### Concept and learning goals

Distinguish introduction, establishment, spread, and ecological impact. Explore why early removal, containment, habitat suitability, and repeated introductions produce different outcomes.

### First-version experience

Introduce a fictional invasive plant into a habitat map containing native vegetation. Advance through seasons, inspect newly established patches, and apply a bounded removal action. Compare intervention timing with the same initial introduction.

### Objects and controls

- Objects: habitat patches, native cover, invasive propagules, established invasive cover, barriers, and intervention areas.
- Controls: introduce at a location, advance season, remove a patch, add a dispersal barrier, restore native cover, and compare runs.
- Setup: habitat suitability, dispersal range, introduction frequency, and seeded establishment.
- Inspection: introduction origin, establishment event, local competition, and treatment history.

### Model and observations

Use a spatial patch model with explicit dispersal, establishment, competition, and regeneration. Removal affects a specified state; show whether residual propagules remain in the selected scenario. A barrier may reduce dispersal without making a patch unsuitable.

Show occupied patches, native cover, newly established sites, treatment extent, and recolonization events. Intervention effort is an ecological action limit, not an economics model.

### Example exploration

“Remove the initial patch immediately, then repeat after several seasons. How does intervention timing change the spread?”

### Rough layout

```text
+-------------- HABITAT MAP ----------------+
| n n n n | n I I n | n n n n              |
| n n n n | n I I I | n n n n              |
| -------- dispersal barrier --------       |
| n n n n | n n n n | n n n n              |
| n native   I invasive   . propagule       |
| [Introduce] [Remove] [Restore] [Season +]   |
+-------------------------------------------+
```

### Boundaries and acceptance

Non-native does not automatically mean invasive. The scenario explicitly defines establishment and harmful impact. Avoid generalizing fictional rates to real ecosystems. Spread must follow configured dispersal rules, and a cleared patch may recolonize only through an explicit surviving or incoming source.

## 8. SCI-06 — Inside Earth: Crust, Mantle, and Core

### Concept and learning goals

Inspect Earth's internal structure and follow schematic mantle movement beneath tectonic plates. Distinguish compositional layers from layers defined by mechanical behavior.

### First-version experience

Open a cutaway Earth. Peel back crust, mantle, outer core, and inner core. Switch to a mechanical-layer view showing lithosphere and asthenosphere. Select a mantle tracer and follow a schematic path over compressed geological time.

### Objects and controls

- Objects: crust, mantle, outer core, inner core, lithosphere, asthenosphere, surface plates, and mantle tracers.
- Controls: peel layer, switch layer classification, inspect material/state, show circulation arrows, follow tracer, and change playback speed.
- Setup: schematic circulation preset and surface plate arrangement.

### Model and observations

The first version is an inspectable layered model plus a prescribed teaching flow field, not a geodynamic solver. Tracer movement reads the flow field. Surface arrows should have an explicit relation to the selected preset without claiming that one circulating cell alone drives a plate.

Show selected layer, depth band, material state, and geological timescale. Use a clearly labeled exaggerated crust thickness for readability.

### Example exploration

“Switch from compositional layers to mechanical layers. Why does the lithosphere include more than the crust?”

### Rough layout

```text
+---------------- INSIDE EARTH ----------------+
|              _________                       |
|            / thin crust\                     |
|           /-------------\                    |
|          | mantle  ^  v  |                    |
|          |    /-------\ |                    |
|          |   |outer core||                    |
|          |   | (inner) ||                     |
|           \   \-------//                     |
| [Peel] [Layer classification] [Follow tracer] |
+-----------------------------------------------+
```

### Boundaries and acceptance

The mantle is predominantly solid and can deform over geological time; do not draw it as a global liquid ocean. The outer core is liquid and the inner core solid. Clearly label schematic flows and exaggerated geometry. Inspection must preserve these distinctions in both layer views.

## 9. SCI-07 — Plate Boundaries: Build a Landscape

### Concept and learning goals

Compare divergent, convergent, and transform boundaries. Connect plate interactions to rifts, ocean ridges, trenches, mountains, and volcanic arcs.

### First-version experience

Choose a boundary preset and watch a synchronized surface view and cross-section. Compare oceanic–continental convergence, oceanic–oceanic convergence, continental collision, divergence, and transform motion.

### Objects and controls

- Objects: tectonic plates, continental/oceanic crust, boundary, surface terrain, subducting slab, and applicable volcanic features.
- Controls: boundary preset, relative-motion setting, geological time step, cross-section toggle, and feature inspection.
- Setup: plate types and initial surface profile. Use scenario presets to avoid arbitrary combinations with misleading outcomes.

### Model and observations

Use a scenario-specific kinematic teaching model that updates geometry and named feature stages. Keep transforms, collision, subduction, and divergence distinct. Surface terrain and cross-section must read the same modeled state.

Show relative plate motion, active boundary type, elapsed model time, and a feature-formation timeline. Earthquake locations may be schematic markers in a later version; realistic hazard prediction is outside the first version.

### Example exploration

“Compare continental collision with oceanic–continental convergence. Which scenario creates a subducting slab and a volcanic arc?”

### Rough layout

```text
+---------------- PLATE BOUNDARIES ----------------+
| oceanic plate -->      <-- continental plate      |
| ~~~~~~~~~~~~~~~~           ____/\____            |
| ________________\_________/   volcano            |
|                  \                               |
|                   \ subducting slab              |
|                                                  |
| [Boundary preset] [Time +] [Inspect feature]       |
+---------------------------------------------------+
```

### Boundaries and acceptance

Plate tectonics involves lithospheric plates, not just disconnected pieces of crust. Avoid portraying every convergent boundary as volcanic or every boundary as subduction. Each preset must produce the appropriate features and a consistent cross-section.

## 10. SCI-08 — Volcano's Life Cycle

### Concept and learning goals

Explore magma storage, movement through conduits, eruption, and the resulting deposits and landforms. Compare selected volcanic activity scenarios rather than implying a universal repeating life cycle.

### First-version experience

Start with a volcano cutaway showing a reservoir, conduit, and vent. Run a quiet-effusive or explosive teaching preset. Observe activity, deposit formation, and a later period of reduced activity. Inspect the reservoir and surface before and after the event.

### Objects and controls

- Objects: magma reservoir, conduit, vents, volcanic edifice, lava paths, ash plume, and deposits.
- Controls: scenario preset, magma supply setting, advance time, inspect reservoir, surface/cutaway view, and reset.
- Setup: bounded presets for viscosity, gas content, and conduit condition with qualitative explanations.

### Model and observations

Use a transparent reservoir/supply/outflow model and scenario-specific eruption transitions. Explain the factors behind each transition. Surface deposits accumulate from modeled events; the presentation must not create lava or ash independently.

Show activity state, reservoir trend, eruption type, and deposits formed. If pressure is represented, label it as a simplified model indicator rather than a measured forecast.

### Example exploration

“Run the effusive and explosive presets. How do their material pathways and resulting deposits differ?”

### Rough layout

```text
+---------------- VOLCANO ----------------+
|                ash . . .               |
|                    ^                   |
|                  /   \                 |
|                 / |   \___ lava        |
| _______________/  |    \________       |
|                   | conduit            |
|             [magma reservoir]          |
| [Preset] [Supply] [Time +] [Inspect]     |
+-----------------------------------------+
```

### Boundaries and acceptance

Volcanoes do not all follow a fixed schedule or erupt when one universal threshold is crossed. This model does not forecast a real eruption. Both presets must explain their distinct pathways, and material outflow cannot exceed available modeled magma.

## 11. SCI-09 — Water Cycle

### Concept and learning goals

Follow water among atmosphere, vegetation, soil, groundwater, rivers, and larger water bodies. Distinguish evaporation, transpiration, condensation, precipitation, infiltration, percolation, runoff, and groundwater discharge.

### First-version experience

Open a populated watershed with mountains, clouds, vegetation, a river, soil, and an aquifer. Follow one illustrative water tracer through a possible path. Change rainfall, surface cover, or soil permeability and observe the redistribution of water.

### Objects and controls

- Objects: atmospheric moisture/cloud store, vegetation, snow store where enabled, surface water, soil moisture, groundwater, river, and lake/ocean outlet.
- Controls: precipitation preset, relative sunlight setting, vegetation cover, soil permeability, paved-surface extent, follow tracer, and advance time.
- Inspection: current storage, incoming/outgoing pathways, and the selected tracer's history.
- Optional later scenario: snow accumulation and melt across seasons.

### Model and observations

Use an explicit water-budget model with finite stores and transfers. Evaporation and transpiration transfer water to the atmosphere; infiltration moves surface water into soil; percolation transfers soil water toward groundwater; runoff and discharge move water toward channels and outlets.

Specify whether the scene is a closed teaching system or an open watershed. In an open watershed, record precipitation and other boundary inputs, outlet discharge, and atmospheric exports so the water budget remains explainable. Tracers illustrate pathways and do not replace the authoritative store volumes.

Show water stored in each compartment, current transfer arrows, river response, and a tracer timeline. Compare a vegetated watershed with one containing more paved surfaces under identical precipitation.

### Example exploration

“Replace part of the vegetation with pavement. During the same rainfall event, where does more water go, and which pathways receive less?”

### Rough layout

```text
+-------------------- WATER CYCLE --------------------+
| sun *      evaporation ^       cloud [~~~]           |
|                             rain v v v              |
| mountain /\       trees T T       river ---> ocean  |
| ________/  \________|_____________________~~~~~~~~  |
|                    infiltration v                   |
| soil moisture       . . . . . .                     |
| groundwater         >>>>>>>>>>> discharge ^         |
| [Rain] [Vegetation] [Pavement] [Follow water]         |
+-----------------------------------------------------+
```

### Boundaries and acceptance

Water has many possible pathways; avoid implying that every drop completes the same loop. Clouds are condensed droplets or ice crystals, not simply visible water vapor. Groundwater primarily occupies pores and fractures rather than a universal underground river. Model transfers must conserve the water budget, respect nonnegative stores, and show boundary inputs/outputs explicitly.

## 12. Integration with the existing project

Follow the existing shared simulation architecture rather than building isolated pages for each topic.

| Responsibility | Proposed implementation approach |
| --- | --- |
| Configuration and state | Typed traits/contracts with explicit initial values, bounds, units where applicable, and reset behavior |
| Process logic | Trusted systems owning stages, events, transfers, and model updates |
| Authoring | Data-only public catalog definitions exposing supported configuration, actions, and outputs |
| Presentation | SVG/2D scenes for cells, genomes, and maps; optional Three.js cutaways for Earth and volcanoes |
| Interaction | Shared bound controls, selection/inspection, labels, and observation displays |
| Lessons | Ordinary recipes connecting a model, scene, controls, observations, and teaching prompts |
| Persistence | Existing versioned recipe/document loading and saving; new models require registered providers |
| AI composition | Catalog-grounded authoring of supported components; simulation stepping remains owned by trusted systems |

Reuse existing control, display, recipe, and runtime infrastructure where its contracts fit. Similar-looking existing models are not sufficient substitutes: invasive establishment needs its own spatial rules, pollination needs pollen provenance, and water flow needs compartment budgets.

Earth layers, plate boundaries, and volcanoes can share visual assets and terminology. Their first versions should run independently. A later linked lesson may connect declared outputs, but mantle motion must not silently control plate or volcanic models without explicit coupling.

## 13. Implementation and review criteria

For each simulation, complete the following before considering the lesson implemented:

1. Deliver a populated default scene and one complete learning scenario.
2. Implement typed state, bounded actions, inspectable outputs, and explicit reset semantics.
3. Verify the model's core invariant: chromosome provenance, recognition identity, pollen compatibility, dispersal rules, layer identity, geological scenario consistency, magma availability, or water balance as appropriate.
4. Verify pause/step/reset and seeded replay where randomness is used.
5. Confirm that changing a meaningful control produces a visible, explainable outcome.
6. Check labels, selected-object inspection, keyboard-accessible controls, reduced-motion behavior, and desktop/mobile layout.
7. Save and reopen the ordinary recipe without losing configuration or creating duplicate objects.
8. Review the scientific explanations and the stated teaching simplifications alongside the visuals.

These concepts define intended behavior and scope. They do not establish production readiness or scientific validation of an implemented model.
