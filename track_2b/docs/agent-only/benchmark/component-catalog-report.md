# Components used by the final 40 experiments

## Scope and method

This report describes the local source snapshot, including the newly added Pendulum and Slope recipes. The experiment IDs and ordering match [the final benchmark list](final-benchmark-list.md). It is an inventory of authored recipes, not evidence of prompt-generation success or live deployment. The implemented catalog now contains the 110 used definitions plus the 25 retained extras (135 total); 222 entries from the former 357-entry catalog are excluded from discovery. All 458 registered definitions remain available for loading existing recipes.

“In the catalog” means returned by the builder’s `libraryChoices("all", "")`, with no search term and before any destination-specific compatibility filter. This is the component picker, not the experiments page. Registered definitions hidden by the picker are not counted as catalog entries. Compatibility with a particular destination is not implied.

Components are counted by exact registry definition ID. Instances come from both `document.nodes` and `document.resources`; repeated definitions count once in the unique inventory and multiple times in the instance total. All 40 recipes have no nested recipe references, so no recursive expansion is needed. Recipe dependencies are metadata and are not counted as additional instances. Ordinary layout tree containers, React view implementations, drawing primitives, runtime providers and connection ports are not separate authored component definitions.

The comparison covers built-in component definitions, including any preset/composite definitions returned by the picker. Saved account-specific assemblies and the separate built-in recipe/assembly choices are outside this component-definition inventory.

Source owners: [experiment selection](../../../src/web/src/app/experiments/_lib/premadeExperiments.ts), [premade recipe loader](../../../src/web/src/simulations/registry/recipes/premade.ts), [component picker rules](../../../src/web/src/simulations/builder/composition/libraryChoices.ts), [discovery exclusions](../../../src/web/src/simulations/registry/discovery.ts), and [public registry](../../../src/web/src/simulations/registry/index.ts).

## Summary

| Measure | Count |
| --- | ---: |
| Benchmark experiments | 40 |
| Authored node instances | 251 |
| Authored resource instances | 0 |
| Distinct components used | 110 |
| Used components in the catalog | 110 |
| Used components absent from the catalog | 0 |
| Catalog components unused by these 40 recipes | 25 |
| Former catalog entries now excluded | 222 |
| Total component definitions in the catalog | 135 |
| Total registered public definitions, including hidden entries | 458 |

All components used by these 40 recipes are listed in the component picker. “Unused” means absent from these exact premade recipes; it does not imply that a component is unnecessary, broken, or unused by generated experiments elsewhere.

### Used components by registry category

| Category | Unique definitions | Instances |
| --- | ---: | ---: |
| appearance | 47 | 48 |
| canvases | 1 | 1 |
| controls | 13 | 85 |
| displays | 6 | 47 |
| models | 43 | 70 |

## 1. Used components present in the catalog

Each row is one distinct component definition. Experiment references show where it is instantiated.

| Component ID | Catalog title | Category | Instances | Experiments |
| --- | --- | --- | ---: | --- |
| `appearance/area-perimeter` | Rectangle metrics appearance | appearance | 1 | [area-perimeter](https://apertus-hackathon.vercel.app/experiments?experiment=area-perimeter) |
| `appearance/arithmetic` | Arithmetic appearance | appearance | 1 | [arithmetic](https://apertus-hackathon.vercel.app/experiments?experiment=arithmetic) |
| `appearance/Beam` | Truss beams | appearance | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `appearance/Bridge` | Bridge scene | appearance | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `appearance/BridgeSupport` | Bridge supports | appearance | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `appearance/chemistry-beer-lambert` | Beer-Lambert law and spectrophotometry appearance | appearance | 1 | [beer-lambert](https://apertus-hackathon.vercel.app/experiments?experiment=beer-lambert) |
| `appearance/chemistry-galvanic-cell` | Galvanic cell and Nernst equation appearance | appearance | 1 | [galvanic-cell](https://apertus-hackathon.vercel.app/experiments?experiment=galvanic-cell) |
| `appearance/chemistry-gas-equilibrium` | Gas equilibrium and Le Chatelier's principle appearance | appearance | 1 | [gas-equilibrium](https://apertus-hackathon.vercel.app/experiments?experiment=gas-equilibrium) |
| `appearance/chemistry-phase-change` | Phases of matter and supercritical fluids appearance | appearance | 1 | [phase-change](https://apertus-hackathon.vercel.app/experiments?experiment=phase-change) |
| `appearance/chemistry-titration` | Acid-base titration and pH neutralization appearance | appearance | 1 | [acid-base-titration](https://apertus-hackathon.vercel.app/experiments?experiment=acid-base-titration) |
| `appearance/collective-fishing` | Shared fishing lake appearance | appearance | 1 | [shared-fishing-lake](https://apertus-hackathon.vercel.app/experiments?experiment=shared-fishing-lake) |
| `appearance/collective-voting` | Alternate voting systems appearance | appearance | 1 | [voting-systems](https://apertus-hackathon.vercel.app/experiments?experiment=voting-systems) |
| `appearance/coordinates` | Coordinates appearance | appearance | 1 | [coordinates](https://apertus-hackathon.vercel.app/experiments?experiment=coordinates) |
| `appearance/counting` | Counting appearance | appearance | 1 | [counting](https://apertus-hackathon.vercel.app/experiments?experiment=counting) |
| `appearance/ecology-wildfire` | Wildfire & fuel treatment appearance | appearance | 1 | [wildfire](https://apertus-hackathon.vercel.app/experiments?experiment=wildfire) |
| `appearance/economics-cost-and-profit` | Firm production costs and profit maximization appearance | appearance | 1 | [cost-and-profit](https://apertus-hackathon.vercel.app/experiments?experiment=cost-and-profit) |
| `appearance/economics-price-elasticity` | Price elasticity of demand and total revenue appearance | appearance | 1 | [price-elasticity](https://apertus-hackathon.vercel.app/experiments?experiment=price-elasticity) |
| `appearance/equal-groups` | Equal groups appearance | appearance | 1 | [equal-groups](https://apertus-hackathon.vercel.app/experiments?experiment=equal-groups) |
| `appearance/fraction-number-line` | Fraction number line appearance | appearance | 1 | [fraction-number-line](https://apertus-hackathon.vercel.app/experiments?experiment=fraction-number-line) |
| `appearance/Joint` | Truss joints | appearance | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `appearance/Launcher` | Launcher | appearance | 1 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `appearance/LoadTruck` | Load truck | appearance | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `appearance/math-analysis-survey-sampling` | Survey size and uncertainty appearance | appearance | 1 | [survey-sampling](https://apertus-hackathon.vercel.app/experiments?experiment=survey-sampling) |
| `appearance/math-can` | Can shape and the least metal appearance | appearance | 1 | [can-material](https://apertus-hackathon.vercel.app/experiments?experiment=can-material) |
| `appearance/math-pythagorean` | Ladder length and the Pythagorean theorem appearance | appearance | 1 | [pythagorean](https://apertus-hackathon.vercel.app/experiments?experiment=pythagorean) |
| `appearance/math-tiling` | Which regular tiles fit around a corner appearance | appearance | 1 | [tile-patterns](https://apertus-hackathon.vercel.app/experiments?experiment=tile-patterns) |
| `appearance/math-tree-height` | Measuring a tree's height with an angle appearance | appearance | 1 | [tree-height](https://apertus-hackathon.vercel.app/experiments?experiment=tree-height) |
| `appearance/physical-pendulum` | Compare pendulum lengths appearance | appearance | 1 | [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum) |
| `appearance/physics-buoyancy` | Steel hull and block appearance | appearance | 1 | [buoyancy](https://apertus-hackathon.vercel.app/experiments?experiment=buoyancy) |
| `appearance/physics-capacitor` | Charging and discharging appearance | appearance | 1 | [rc-circuit](https://apertus-hackathon.vercel.app/experiments?experiment=rc-circuit) |
| `appearance/physics-collision` | Two-cart collision appearance | appearance | 1 | [collisions](https://apertus-hackathon.vercel.app/experiments?experiment=collisions) |
| `appearance/physics-cooling` | Cooling a hot drink appearance | appearance | 2 | [cooling-drinks](https://apertus-hackathon.vercel.app/experiments?experiment=cooling-drinks) |
| `appearance/physics-doppler` | Passing ambulance siren appearance | appearance | 1 | [doppler-siren](https://apertus-hackathon.vercel.app/experiments?experiment=doppler-siren) |
| `appearance/physics-gears` | Bicycle chain drive appearance | appearance | 1 | [bicycle-gears](https://apertus-hackathon.vercel.app/experiments?experiment=bicycle-gears) |
| `appearance/physics-hydraulics` | Two-piston hydraulic lift appearance | appearance | 1 | [hydraulics](https://apertus-hackathon.vercel.app/experiments?experiment=hydraulics) |
| `appearance/physics-induction` | Moving magnet and coil appearance | appearance | 1 | [magnet-induction](https://apertus-hackathon.vercel.app/experiments?experiment=magnet-induction) |
| `appearance/physics-lever` | Crowbar and pivot appearance | appearance | 1 | [levers](https://apertus-hackathon.vercel.app/experiments?experiment=levers) |
| `appearance/physics-pressure` | Bottle outlet appearance | appearance | 1 | [water-pressure](https://apertus-hackathon.vercel.app/experiments?experiment=water-pressure) |
| `appearance/physics-pulley` | Supporting rope strands appearance | appearance | 1 | [pulleys](https://apertus-hackathon.vercel.app/experiments?experiment=pulleys) |
| `appearance/physics-string` | Guitar string modes appearance | appearance | 1 | [guitar-string](https://apertus-hackathon.vercel.app/experiments?experiment=guitar-string) |
| `appearance/physics-tipping` | Cabinet stability appearance | appearance | 1 | [tipping](https://apertus-hackathon.vercel.app/experiments?experiment=tipping) |
| `appearance/Projectile` | Projectile scene | appearance | 1 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `appearance/ProjectileBody` | Projectile body | appearance | 1 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `appearance/science-cell` | Cell division appearance | appearance | 1 | [cell-division](https://apertus-hackathon.vercel.app/experiments?experiment=cell-division) |
| `appearance/social-production` | Craft or assembly line? appearance | appearance | 1 | [craft-production](https://apertus-hackathon.vercel.app/experiments?experiment=craft-production) |
| `appearance/Trajectory` | Trajectory | appearance | 1 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `appearance/VelocityArrow` | Velocity arrows | appearance | 1 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `canvases/cartesian` | Cartesian plane | canvases | 1 | [slope](https://apertus-hackathon.vercel.app/experiments?experiment=slope) |
| `controls/ArithmeticActivity` | Arithmetic controls | controls | 1 | [arithmetic](https://apertus-hackathon.vercel.app/experiments?experiment=arithmetic) |
| `controls/Button` | Action button | controls | 12 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile), [survey-sampling](https://apertus-hackathon.vercel.app/experiments?experiment=survey-sampling), [levers](https://apertus-hackathon.vercel.app/experiments?experiment=levers), [bicycle-gears](https://apertus-hackathon.vercel.app/experiments?experiment=bicycle-gears), [collisions](https://apertus-hackathon.vercel.app/experiments?experiment=collisions), [buoyancy](https://apertus-hackathon.vercel.app/experiments?experiment=buoyancy), [magnet-induction](https://apertus-hackathon.vercel.app/experiments?experiment=magnet-induction), [rc-circuit](https://apertus-hackathon.vercel.app/experiments?experiment=rc-circuit), [counting](https://apertus-hackathon.vercel.app/experiments?experiment=counting), [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum), [slope](https://apertus-hackathon.vercel.app/experiments?experiment=slope) |
| `controls/collective-fishing-action` | Shared fishing lake action | controls | 1 | [shared-fishing-lake](https://apertus-hackathon.vercel.app/experiments?experiment=shared-fishing-lake) |
| `controls/collective-fishing-choice` | Shared fishing lake choice | controls | 1 | [shared-fishing-lake](https://apertus-hackathon.vercel.app/experiments?experiment=shared-fishing-lake) |
| `controls/collective-voting-action` | Alternate voting systems action | controls | 1 | [voting-systems](https://apertus-hackathon.vercel.app/experiments?experiment=voting-systems) |
| `controls/collective-voting-choice` | Alternate voting systems choice | controls | 1 | [voting-systems](https://apertus-hackathon.vercel.app/experiments?experiment=voting-systems) |
| `controls/CountingActivity` | Counting controls | controls | 1 | [counting](https://apertus-hackathon.vercel.app/experiments?experiment=counting) |
| `controls/GroupingActivity` | Equal groups controls | controls | 1 | [equal-groups](https://apertus-hackathon.vercel.app/experiments?experiment=equal-groups) |
| `controls/NumberLineActivity` | Fraction number line controls | controls | 1 | [fraction-number-line](https://apertus-hackathon.vercel.app/experiments?experiment=fraction-number-line) |
| `controls/science-cell` | Cell division exploration | controls | 2 | [cell-division](https://apertus-hackathon.vercel.app/experiments?experiment=cell-division) |
| `controls/Select` | Select | controls | 4 | [pulleys](https://apertus-hackathon.vercel.app/experiments?experiment=pulleys), [guitar-string](https://apertus-hackathon.vercel.app/experiments?experiment=guitar-string), [rc-circuit](https://apertus-hackathon.vercel.app/experiments?experiment=rc-circuit), [phase-change](https://apertus-hackathon.vercel.app/experiments?experiment=phase-change) |
| `controls/Slider` | Slider | controls | 58 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile), [price-elasticity](https://apertus-hackathon.vercel.app/experiments?experiment=price-elasticity), [pythagorean](https://apertus-hackathon.vercel.app/experiments?experiment=pythagorean), [acid-base-titration](https://apertus-hackathon.vercel.app/experiments?experiment=acid-base-titration), [cost-and-profit](https://apertus-hackathon.vercel.app/experiments?experiment=cost-and-profit), [tree-height](https://apertus-hackathon.vercel.app/experiments?experiment=tree-height), [galvanic-cell](https://apertus-hackathon.vercel.app/experiments?experiment=galvanic-cell), [craft-production](https://apertus-hackathon.vercel.app/experiments?experiment=craft-production), [tile-patterns](https://apertus-hackathon.vercel.app/experiments?experiment=tile-patterns), [wildfire](https://apertus-hackathon.vercel.app/experiments?experiment=wildfire), [can-material](https://apertus-hackathon.vercel.app/experiments?experiment=can-material), [survey-sampling](https://apertus-hackathon.vercel.app/experiments?experiment=survey-sampling), [levers](https://apertus-hackathon.vercel.app/experiments?experiment=levers), [pulleys](https://apertus-hackathon.vercel.app/experiments?experiment=pulleys), [bicycle-gears](https://apertus-hackathon.vercel.app/experiments?experiment=bicycle-gears), [tipping](https://apertus-hackathon.vercel.app/experiments?experiment=tipping), [collisions](https://apertus-hackathon.vercel.app/experiments?experiment=collisions), [hydraulics](https://apertus-hackathon.vercel.app/experiments?experiment=hydraulics), [buoyancy](https://apertus-hackathon.vercel.app/experiments?experiment=buoyancy), [doppler-siren](https://apertus-hackathon.vercel.app/experiments?experiment=doppler-siren), [guitar-string](https://apertus-hackathon.vercel.app/experiments?experiment=guitar-string), [cooling-drinks](https://apertus-hackathon.vercel.app/experiments?experiment=cooling-drinks), [magnet-induction](https://apertus-hackathon.vercel.app/experiments?experiment=magnet-induction), [area-perimeter](https://apertus-hackathon.vercel.app/experiments?experiment=area-perimeter), [beer-lambert](https://apertus-hackathon.vercel.app/experiments?experiment=beer-lambert), [gas-equilibrium](https://apertus-hackathon.vercel.app/experiments?experiment=gas-equilibrium), [phase-change](https://apertus-hackathon.vercel.app/experiments?experiment=phase-change), [coordinates](https://apertus-hackathon.vercel.app/experiments?experiment=coordinates), [water-pressure](https://apertus-hackathon.vercel.app/experiments?experiment=water-pressure), [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum), [slope](https://apertus-hackathon.vercel.app/experiments?experiment=slope), [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `controls/Toggle` | Toggle | controls | 1 | [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum) |
| `displays/collective-fishing-caption` | Shared fishing lake caption | displays | 1 | [shared-fishing-lake](https://apertus-hackathon.vercel.app/experiments?experiment=shared-fishing-lake) |
| `displays/collective-voting-caption` | Alternate voting systems caption | displays | 1 | [voting-systems](https://apertus-hackathon.vercel.app/experiments?experiment=voting-systems) |
| `displays/Inspector` | Inspector | displays | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `displays/Readout` | Readout | displays | 37 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile), [price-elasticity](https://apertus-hackathon.vercel.app/experiments?experiment=price-elasticity), [acid-base-titration](https://apertus-hackathon.vercel.app/experiments?experiment=acid-base-titration), [cost-and-profit](https://apertus-hackathon.vercel.app/experiments?experiment=cost-and-profit), [galvanic-cell](https://apertus-hackathon.vercel.app/experiments?experiment=galvanic-cell), [craft-production](https://apertus-hackathon.vercel.app/experiments?experiment=craft-production), [wildfire](https://apertus-hackathon.vercel.app/experiments?experiment=wildfire), [fraction-number-line](https://apertus-hackathon.vercel.app/experiments?experiment=fraction-number-line), [area-perimeter](https://apertus-hackathon.vercel.app/experiments?experiment=area-perimeter), [beer-lambert](https://apertus-hackathon.vercel.app/experiments?experiment=beer-lambert), [arithmetic](https://apertus-hackathon.vercel.app/experiments?experiment=arithmetic), [gas-equilibrium](https://apertus-hackathon.vercel.app/experiments?experiment=gas-equilibrium), [phase-change](https://apertus-hackathon.vercel.app/experiments?experiment=phase-change), [counting](https://apertus-hackathon.vercel.app/experiments?experiment=counting), [equal-groups](https://apertus-hackathon.vercel.app/experiments?experiment=equal-groups), [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum), [slope](https://apertus-hackathon.vercel.app/experiments?experiment=slope) |
| `displays/ScienceObservations` | Science observations | displays | 1 | [cell-division](https://apertus-hackathon.vercel.app/experiments?experiment=cell-division) |
| `displays/StatusMessage` | Status Message | displays | 6 | [craft-production](https://apertus-hackathon.vercel.app/experiments?experiment=craft-production), [wildfire](https://apertus-hackathon.vercel.app/experiments?experiment=wildfire) |
| `models/area-perimeter` | Rectangle metrics | models | 1 | [area-perimeter](https://apertus-hackathon.vercel.app/experiments?experiment=area-perimeter) |
| `models/arithmetic` | Arithmetic | models | 1 | [arithmetic](https://apertus-hackathon.vercel.app/experiments?experiment=arithmetic) |
| `models/BridgeLoad` | Bridge load | models | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `models/BridgeResponse` | Bridge response | models | 1 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `models/coordinates` | Coordinates | models | 1 | [coordinates](https://apertus-hackathon.vercel.app/experiments?experiment=coordinates) |
| `models/counting` | Counting | models | 1 | [counting](https://apertus-hackathon.vercel.app/experiments?experiment=counting) |
| `models/equal-groups` | Equal groups | models | 1 | [equal-groups](https://apertus-hackathon.vercel.app/experiments?experiment=equal-groups) |
| `models/fraction-number-line` | Fraction number line | models | 1 | [fraction-number-line](https://apertus-hackathon.vercel.app/experiments?experiment=fraction-number-line) |
| `models/Projectile` | Projectile | models | 2 | [projectile](https://apertus-hackathon.vercel.app/experiments?experiment=projectile) |
| `models/TrussJoint` | Truss joint | models | 10 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `models/TrussMember` | Truss member | models | 17 | [bridge](https://apertus-hackathon.vercel.app/experiments?experiment=bridge) |
| `prefabs/AuthoredLine` | Line | models | 1 | [slope](https://apertus-hackathon.vercel.app/experiments?experiment=slope) |
| `prefabs/chemistry/AcidBaseTitration` | Acid-base titration and pH neutralization | models | 1 | [acid-base-titration](https://apertus-hackathon.vercel.app/experiments?experiment=acid-base-titration) |
| `prefabs/chemistry/BeerLambert` | Beer-Lambert law and spectrophotometry | models | 1 | [beer-lambert](https://apertus-hackathon.vercel.app/experiments?experiment=beer-lambert) |
| `prefabs/chemistry/GalvanicCell` | Galvanic cell and Nernst equation | models | 1 | [galvanic-cell](https://apertus-hackathon.vercel.app/experiments?experiment=galvanic-cell) |
| `prefabs/chemistry/GasEquilibrium` | Gas equilibrium and Le Chatelier's principle | models | 1 | [gas-equilibrium](https://apertus-hackathon.vercel.app/experiments?experiment=gas-equilibrium) |
| `prefabs/chemistry/PhaseChange` | Phases of matter and supercritical fluids | models | 1 | [phase-change](https://apertus-hackathon.vercel.app/experiments?experiment=phase-change) |
| `prefabs/collective/fishing` | Shared fishing lake | models | 1 | [shared-fishing-lake](https://apertus-hackathon.vercel.app/experiments?experiment=shared-fishing-lake) |
| `prefabs/collective/voting` | Alternate voting systems | models | 1 | [voting-systems](https://apertus-hackathon.vercel.app/experiments?experiment=voting-systems) |
| `prefabs/ecology/Wildfire` | Wildfire & fuel treatment | models | 1 | [wildfire](https://apertus-hackathon.vercel.app/experiments?experiment=wildfire) |
| `prefabs/economics/CostAndProfit` | Firm production costs and profit maximization | models | 1 | [cost-and-profit](https://apertus-hackathon.vercel.app/experiments?experiment=cost-and-profit) |
| `prefabs/economics/PriceElasticity` | Price elasticity of demand and total revenue | models | 1 | [price-elasticity](https://apertus-hackathon.vercel.app/experiments?experiment=price-elasticity) |
| `prefabs/math-analysis/survey-sampling` | Survey size and uncertainty | models | 1 | [survey-sampling](https://apertus-hackathon.vercel.app/experiments?experiment=survey-sampling) |
| `prefabs/math-geometry/CanPackaging` | Can shape and the least metal | models | 1 | [can-material](https://apertus-hackathon.vercel.app/experiments?experiment=can-material) |
| `prefabs/math-geometry/Pythagorean` | Ladder length and the Pythagorean theorem | models | 1 | [pythagorean](https://apertus-hackathon.vercel.app/experiments?experiment=pythagorean) |
| `prefabs/math-geometry/RegularTiling` | Which regular tiles fit around a corner | models | 1 | [tile-patterns](https://apertus-hackathon.vercel.app/experiments?experiment=tile-patterns) |
| `prefabs/math-geometry/TreeHeight` | Measuring a tree's height with an angle | models | 1 | [tree-height](https://apertus-hackathon.vercel.app/experiments?experiment=tree-height) |
| `prefabs/physical-systems/Pendulum` | Compare pendulum lengths | models | 1 | [pendulum](https://apertus-hackathon.vercel.app/experiments?experiment=pendulum) |
| `prefabs/physics/BicycleGears` | Bicycle chain drive | models | 1 | [bicycle-gears](https://apertus-hackathon.vercel.app/experiments?experiment=bicycle-gears) |
| `prefabs/physics/Buoyancy` | Steel hull and block | models | 1 | [buoyancy](https://apertus-hackathon.vercel.app/experiments?experiment=buoyancy) |
| `prefabs/physics/Capacitor` | Charging and discharging | models | 1 | [rc-circuit](https://apertus-hackathon.vercel.app/experiments?experiment=rc-circuit) |
| `prefabs/physics/Collision` | Two-cart collision | models | 1 | [collisions](https://apertus-hackathon.vercel.app/experiments?experiment=collisions) |
| `prefabs/physics/Cooling` | Cooling a hot drink | models | 2 | [cooling-drinks](https://apertus-hackathon.vercel.app/experiments?experiment=cooling-drinks) |
| `prefabs/physics/Doppler` | Passing ambulance siren | models | 1 | [doppler-siren](https://apertus-hackathon.vercel.app/experiments?experiment=doppler-siren) |
| `prefabs/physics/HydraulicLift` | Two-piston hydraulic lift | models | 1 | [hydraulics](https://apertus-hackathon.vercel.app/experiments?experiment=hydraulics) |
| `prefabs/physics/Induction` | Moving magnet and coil | models | 1 | [magnet-induction](https://apertus-hackathon.vercel.app/experiments?experiment=magnet-induction) |
| `prefabs/physics/Lever` | Crowbar and pivot | models | 1 | [levers](https://apertus-hackathon.vercel.app/experiments?experiment=levers) |
| `prefabs/physics/Pulley` | Supporting rope strands | models | 1 | [pulleys](https://apertus-hackathon.vercel.app/experiments?experiment=pulleys) |
| `prefabs/physics/String` | Guitar string modes | models | 1 | [guitar-string](https://apertus-hackathon.vercel.app/experiments?experiment=guitar-string) |
| `prefabs/physics/Tipping` | Cabinet stability | models | 1 | [tipping](https://apertus-hackathon.vercel.app/experiments?experiment=tipping) |
| `prefabs/physics/WaterPressure` | Bottle outlet | models | 1 | [water-pressure](https://apertus-hackathon.vercel.app/experiments?experiment=water-pressure) |
| `prefabs/science/CellDivision` | Cell division | models | 1 | [cell-division](https://apertus-hackathon.vercel.app/experiments?experiment=cell-division) |
| `prefabs/social-systems/Production` | Craft or assembly line? | models | 1 | [craft-production](https://apertus-hackathon.vercel.app/experiments?experiment=craft-production) |

## 2. Used components absent from the catalog

**None.** All 110 used component definitions appear in the unfiltered builder component catalog.

## 3. Former catalog components unused by the 40 experiments

These 247 entries occurred in the previous unrestricted component picker and are unused by the 40 recipe documents. Of these, 25 remain in the current catalog and 222 are excluded. “Current catalog” reflects the implemented scope; “Discovery kind” uses the registry’s own metadata.

### appearance (72)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `appearance/balance` | Solve an equation appearance | component | No |
| `appearance/chemistry-conservation` | Balancing chemical equations appearance | component | No |
| `appearance/chemistry-dilution` | Diluting salt water appearance | component | No |
| `appearance/chemistry-rate` | Temperature and reaction rate appearance | component | No |
| `appearance/circle` | Why π stays constant appearance | component | No |
| `appearance/collective-crowd` | Crowd flow and obstacles appearance | component | No |
| `appearance/collective-selection` | Natural selection appearance | component | No |
| `appearance/cycle-carbon` | Carbon cycle appearance | component | No |
| `appearance/cycle-nitrogen` | Nitrogen cycle appearance | component | No |
| `appearance/cycle-oxygen` | Oxygen cycle appearance | component | No |
| `appearance/dynamic-growth` | Compound and simple interest appearance | component | No |
| `appearance/dynamic-queue` | One or two checkout cashiers appearance | component | No |
| `appearance/dynamic-traffic` | Stop-and-go traffic on a closed road appearance | component | No |
| `appearance/earth-atmosphere-atmosphere` | Atmosphere layers and ozone appearance | component | No |
| `appearance/earth-atmosphere-earthquake` | How earthquakes form appearance | component | No |
| `appearance/earth-atmosphere-greenhouse` | The greenhouse effect appearance | component | No |
| `appearance/earth-atmosphere-lightning` | How lightning forms appearance | component | No |
| `appearance/earth-atmosphere-rainbow` | How rainbows form appearance | component | No |
| `appearance/earth-atmosphere-tsunami` | How tsunamis form appearance | component | No |
| `appearance/earth-atmosphere-weather` | How weather forms appearance | component | No |
| `appearance/EclipseGeometry` | Solar and lunar eclipse geometry appearance | component | No |
| `appearance/ecology-food-web` | Food-web connections appearance | component | No |
| `appearance/ecology-nutrients` | Nutrients & plant growth appearance | component | No |
| `appearance/economics-market-equilibrium` | Market equilibrium and price controls appearance | component | No |
| `appearance/economics-monopoly-pricing` | Monopoly pricing and deadweight loss appearance | component | No |
| `appearance/economics-trade-and-tariffs` | Trade, tariffs and import quotas appearance | component | No |
| `appearance/EnvironmentLighting` | Environment lighting | component | No |
| `appearance/fraction-builder` | Fraction comparison appearance | component | No |
| `appearance/line` | Explore line slope appearance | component | No |
| `appearance/Market` | Market appearance | component | No |
| `appearance/math-analysis-accumulated-water` | Water accumulated from changing flow appearance | component | No |
| `appearance/math-analysis-conditional-bags` | Blue marbles and hidden origins appearance | component | No |
| `appearance/math-analysis-feasible-choices` | Affordable notebooks and pens appearance | component | No |
| `appearance/math-analysis-house-prices` | Average house price: mean, median and outliers appearance | component | No |
| `appearance/math-analysis-instantaneous-velocity` | Average and instantaneous velocity appearance | component | No |
| `appearance/math-analysis-loan-payments` | Where each loan payment goes appearance | component | No |
| `appearance/math-analysis-score-spread` | Same average, different spread appearance | component | No |
| `appearance/math-analysis-study-regression` | Study hours, scores and outliers appearance | component | No |
| `appearance/math-analysis-teams-and-podiums` | Teams versus podiums appearance | component | No |
| `appearance/math-box-packing` | Packing boxes into a bin appearance | component | No |
| `appearance/math-cube-net` | Which nets fold into a cube appearance | component | No |
| `appearance/math-fencing` | Fixed fence, largest garden appearance | component | No |
| `appearance/math-place-value` | Decimal place value with base-ten blocks appearance | component | No |
| `appearance/math-rigid-motion` | Flip, turn and slide a shape appearance | component | No |
| `appearance/math-scale-drawing` | Scaling a floor plan appearance | component | No |
| `appearance/natural-diffusion` | Dye diffusion in water appearance | component | No |
| `appearance/natural-plant-growth` | Plant limiting resources appearance | component | No |
| `appearance/natural-predator-prey` | Fox and rabbit populations appearance | component | No |
| `appearance/physical-circuit` | Bulbs in a circuit appearance | component | No |
| `appearance/physical-track` | Smooth and rough floors appearance | component | No |
| `appearance/physics-conduction` | Heat through a spoon appearance | component | No |
| `appearance/physics-fibre` | Light in a fibre appearance | component | No |
| `appearance/physics-flow` | Water pipe constriction appearance | component | No |
| `appearance/physics-latent` | Heating ice and water appearance | component | No |
| `appearance/physics-lens` | Magnifying glass images appearance | component | No |
| `appearance/physics-parachute` | Parachute descent appearance | component | No |
| `appearance/physics-turning` | Speed and sharp turns appearance | component | No |
| `appearance/probability` | Random trials appearance | component | No |
| `appearance/ratio` | Ratio appearance | component | No |
| `appearance/science-earth` | Inside Earth appearance | component | No |
| `appearance/science-genome` | Genome to organism appearance | component | No |
| `appearance/science-immune` | Immune defense appearance | component | No |
| `appearance/science-invasive` | Invasive species spread appearance | component | No |
| `appearance/science-plates` | Plate boundaries appearance | component | No |
| `appearance/science-pollination` | Pollination network appearance | component | No |
| `appearance/science-volcano` | Volcano’s life cycle appearance | component | No |
| `appearance/science-water` | Water cycle appearance | component | No |
| `appearance/SignalSuperposition` | Sound wave superposition appearance | component | No |
| `appearance/SpringMass` | Spring and mass appearance | component | No |
| `appearance/TownBuilding` | Building appearance | component | No |
| `appearance/TownCitizen` | Citizen appearance | component | No |
| `appearance/TownScenery` | Town scenery | component | No |

### behaviors (16)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `data/CelsiusDifferenceToKelvin` | Celsius difference to kelvin difference | component | No |
| `data/CelsiusToKelvin` | Celsius to kelvin (absolute) | component | No |
| `data/CentimetresToMetres` | Centimetres to metres | component | Yes |
| `data/Expression` | Expression | component | Yes |
| `data/FieldSelector` | Field selector | component | Yes |
| `data/KelvinToCelsius` | Kelvin to Celsius (absolute) | component | No |
| `data/Literal` | Literal (number) | component | Yes |
| `data/Literal-boolean` | Literal (boolean) | component | No |
| `data/Literal-list` | Literal (list) | component | Yes |
| `data/Literal-record` | Literal (record) | component | Yes |
| `data/Literal-text` | Literal (text) | component | No |
| `data/MinutesToSeconds` | Minutes to seconds | component | No |
| `data/SecondsToMinutes` | Seconds to minutes | component | No |
| `data/UnitConversion` | Unit conversion · metres to centimetres | component | Yes |
| `operations/FractionComparison` | Fraction comparison | component | No |
| `operations/LineIntersection` | Line intersection | component | No |

### canvases (4)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `canvases/diagram` | 2D diagram | component | No |
| `canvases/physical` | 2D physical canvas | component | No |
| `canvases/town` | 3D spatial scene | component | No |
| `canvases/World` | World canvas | component | No |

### controls (32)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `controls/AgentActions` | Agent actions | component | No |
| `controls/collective-crowd-action` | Crowd flow and obstacles action | component | No |
| `controls/collective-selection-action` | Natural selection action | component | No |
| `controls/collective-selection-choice` | Natural selection choice | component | No |
| `controls/cycle-carbon-action` | Carbon cycle action | component | No |
| `controls/cycle-carbon-activity` | Carbon cycle activity | component | No |
| `controls/cycle-nitrogen-action` | Nitrogen cycle action | component | No |
| `controls/cycle-nitrogen-activity` | Nitrogen cycle activity | component | No |
| `controls/cycle-oxygen-action` | Oxygen cycle action | component | No |
| `controls/cycle-oxygen-activity` | Oxygen cycle activity | component | No |
| `controls/earth-atmosphere-atmosphere-action` | Atmosphere layers and ozone action | component | No |
| `controls/earth-atmosphere-earthquake-action` | How earthquakes form action | component | No |
| `controls/earth-atmosphere-greenhouse-action` | The greenhouse effect action | component | No |
| `controls/earth-atmosphere-lightning-action` | How lightning forms action | component | No |
| `controls/earth-atmosphere-rainbow-action` | How rainbows form action | component | No |
| `controls/earth-atmosphere-tsunami-action` | How tsunamis form action | component | No |
| `controls/earth-atmosphere-weather-action` | How weather forms action | component | No |
| `controls/EntityPicker` | Entity picker | component | No |
| `controls/FoodWebPopulation` | Food-web exploration | component | No |
| `controls/Form` | Control group | component | Yes |
| `controls/FractionComparisonActivity` | Fraction comparison controls | component | No |
| `controls/NumberInput` | Number input | component | Yes |
| `controls/science-earth` | Inside Earth exploration | component | No |
| `controls/science-genome` | Genome to organism exploration | component | No |
| `controls/science-immune` | Immune defense exploration | component | No |
| `controls/science-invasive` | Invasive species spread exploration | component | No |
| `controls/science-plates` | Plate boundaries exploration | component | No |
| `controls/science-pollination` | Pollination network exploration | component | No |
| `controls/science-volcano` | Volcano’s life cycle exploration | component | No |
| `controls/science-water` | Water cycle exploration | component | No |
| `controls/TextInput` | Text input | component | Yes |
| `controls/TrialsActivity` | Random trial controls | component | No |

### displays (21)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `displays/AgentProfile` | Agent profile | component | No |
| `displays/AgentTranscript` | Agent conversation | component | No |
| `displays/Chart` | Chart | component | Yes |
| `displays/collective-crowd-caption` | Crowd flow and obstacles caption | component | No |
| `displays/collective-selection-caption` | Natural selection caption | component | No |
| `displays/cycle-carbon-caption` | Carbon cycle caption | component | No |
| `displays/cycle-nitrogen-caption` | Nitrogen cycle caption | component | No |
| `displays/cycle-oxygen-caption` | Oxygen cycle caption | component | No |
| `displays/DataTable` | Data Table | component | Yes |
| `displays/earth-atmosphere-atmosphere-caption` | Atmosphere layers and ozone caption | component | No |
| `displays/earth-atmosphere-earthquake-caption` | How earthquakes form caption | component | No |
| `displays/earth-atmosphere-greenhouse-caption` | The greenhouse effect caption | component | No |
| `displays/earth-atmosphere-lightning-caption` | How lightning forms caption | component | No |
| `displays/earth-atmosphere-rainbow-caption` | How rainbows form caption | component | No |
| `displays/earth-atmosphere-tsunami-caption` | How tsunamis form caption | component | No |
| `displays/earth-atmosphere-weather-caption` | How weather forms caption | component | No |
| `displays/Formula` | Formula display | component | Yes |
| `displays/Heatmap` | Heatmap | component | Yes |
| `displays/Histogram` | Histogram | component | Yes |
| `displays/Legend` | Legend | component | Yes |
| `displays/TrialSummary` | Trial Summary | component | No |

### layout (8)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `layout/Disclosure` | Disclosure | component | Yes |
| `layout/Grid` | Grid | component | Yes |
| `layout/Panel` | Panel | component | Yes |
| `layout/Repeater` | Repeater | component | No |
| `layout/Row` | Row | component | Yes |
| `layout/Split` | Split | component | Yes |
| `layout/Stack` | Stack | component | Yes |
| `layout/Tabs` | Tabs | component | No |

### models (83)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `data/SignalSuperposition` | Sound wave superposition | model | No |
| `models/AgentSession` | Agent environment | model | No |
| `models/AIAgent` | AI agent | model | No |
| `models/DailyRoutine` | Daily routine | model | No |
| `models/DebateSession` | AI debate session | model | No |
| `models/EclipseGeometry` | Solar and lunar eclipse geometry | model | No |
| `models/fraction-builder` | Fraction comparison | model | No |
| `models/Market` | Market | model | No |
| `models/probability` | Random trials | model | No |
| `models/ratio` | Ratio | model | No |
| `models/ScheduledTrip` | Scheduled trip clock | model | No |
| `models/SinusoidalSignal` | Sinusoidal sound signal | model | No |
| `models/SpringMass` | Spring and mass | model | No |
| `models/TownBuilding` | Town building | model | No |
| `models/TownNavigation` | Town navigation and clock | model | No |
| `prefabs/AuthoredBuilding` | House | object | No |
| `prefabs/AuthoredFractionBar` | Fraction bar | object | Yes |
| `prefabs/AuthoredGasContainer` | Gas container | object | No |
| `prefabs/AuthoredGround` | Ground | object | No |
| `prefabs/AuthoredPerson` | Person | object | No |
| `prefabs/AuthoredRoad` | Road | object | No |
| `prefabs/AuthoredSquare` | Square | object | Yes |
| `prefabs/biogeochemistry/CarbonCycle` | Carbon cycle | model | No |
| `prefabs/biogeochemistry/NitrogenCycle` | Nitrogen cycle | model | No |
| `prefabs/biogeochemistry/OxygenCycle` | Oxygen cycle | model | No |
| `prefabs/chemistry/Conservation` | Balancing chemical equations | model | No |
| `prefabs/chemistry/Dilution` | Diluting salt water | model | No |
| `prefabs/chemistry/ReactionRate` | Temperature and reaction rate | model | No |
| `prefabs/collective/crowd` | Crowd flow and obstacles | model | No |
| `prefabs/collective/selection` | Natural selection | model | No |
| `prefabs/dynamic-systems/CheckoutQueue` | One or two checkout cashiers | model | No |
| `prefabs/dynamic-systems/CompoundGrowth` | Compound and simple interest | model | No |
| `prefabs/dynamic-systems/RingTraffic` | Stop-and-go traffic on a closed road | model | No |
| `prefabs/earth-atmosphere/atmosphere` | Atmosphere layers and ozone | model | No |
| `prefabs/earth-atmosphere/earthquake` | How earthquakes form | model | No |
| `prefabs/earth-atmosphere/greenhouse` | The greenhouse effect | model | No |
| `prefabs/earth-atmosphere/lightning` | How lightning forms | model | No |
| `prefabs/earth-atmosphere/rainbow` | How rainbows form | model | No |
| `prefabs/earth-atmosphere/tsunami` | How tsunamis form | model | No |
| `prefabs/earth-atmosphere/weather` | How weather forms | model | No |
| `prefabs/ecology/FoodWeb` | Food-web connections | model | No |
| `prefabs/ecology/Nutrients` | Nutrients & plant growth | model | No |
| `prefabs/economics/MarketEquilibrium` | Market equilibrium and price controls | model | No |
| `prefabs/economics/MonopolyPricing` | Monopoly pricing and deadweight loss | model | No |
| `prefabs/economics/TradeAndTariffs` | Trade, tariffs and import quotas | model | No |
| `prefabs/math-analysis/accumulated-water` | Water accumulated from changing flow | model | No |
| `prefabs/math-analysis/conditional-bags` | Blue marbles and hidden origins | model | No |
| `prefabs/math-analysis/feasible-choices` | Affordable notebooks and pens | model | No |
| `prefabs/math-analysis/house-prices` | Average house price: mean, median and outliers | model | No |
| `prefabs/math-analysis/instantaneous-velocity` | Average and instantaneous velocity | model | No |
| `prefabs/math-analysis/loan-payments` | Where each loan payment goes | model | No |
| `prefabs/math-analysis/score-spread` | Same average, different spread | model | No |
| `prefabs/math-analysis/study-regression` | Study hours, scores and outliers | model | No |
| `prefabs/math-analysis/teams-and-podiums` | Teams versus podiums | model | No |
| `prefabs/math-foundations/Circle` | Why π stays constant | model | No |
| `prefabs/math-foundations/Equation` | Solve an equation | model | No |
| `prefabs/math-foundations/Line` | Explore line slope | model | No |
| `prefabs/math-geometry/BoxPacking` | Packing boxes into a bin | model | No |
| `prefabs/math-geometry/CubeNet` | Which nets fold into a cube | model | No |
| `prefabs/math-geometry/FencedGarden` | Fixed fence, largest garden | model | No |
| `prefabs/math-geometry/PlaceValue` | Decimal place value with base-ten blocks | model | No |
| `prefabs/math-geometry/RigidMotion` | Flip, turn and slide a shape | model | No |
| `prefabs/math-geometry/ScaleDrawing` | Scaling a floor plan | model | No |
| `prefabs/natural-systems/DiffusionField` | Dye diffusion in water | model | No |
| `prefabs/natural-systems/PlantGrowth` | Plant limiting resources | model | No |
| `prefabs/natural-systems/PredatorPrey` | Fox and rabbit populations | model | No |
| `prefabs/physical-systems/ResistiveCircuit` | Bulbs in a circuit | model | No |
| `prefabs/physical-systems/RollingTrack` | Smooth and rough floors | model | No |
| `prefabs/physics/Conduction` | Heat through a spoon | model | No |
| `prefabs/physics/Fibre` | Light in a fibre | model | No |
| `prefabs/physics/LatentHeat` | Heating ice and water | model | No |
| `prefabs/physics/Lens` | Magnifying glass images | model | No |
| `prefabs/physics/Parachute` | Parachute descent | model | No |
| `prefabs/physics/PipeFlow` | Water pipe constriction | model | No |
| `prefabs/physics/Turning` | Speed and sharp turns | model | No |
| `prefabs/science/GenomeOrganism` | Genome to organism | model | No |
| `prefabs/science/ImmuneDefense` | Immune defense | model | No |
| `prefabs/science/InsideEarth` | Inside Earth | model | No |
| `prefabs/science/InvasiveSpread` | Invasive species spread | model | No |
| `prefabs/science/PlateBoundaries` | Plate boundaries | model | No |
| `prefabs/science/PollinationNetwork` | Pollination network | model | No |
| `prefabs/science/VolcanoCycle` | Volcano’s life cycle | model | No |
| `prefabs/science/WaterCycle` | Water cycle | model | No |

### resources (11)

| Component ID | Catalog title | Discovery kind | Current catalog |
| --- | --- | --- | --- |
| `resources/area-perimeter-preset` | Rectangle metrics preset | preset | No |
| `resources/arithmetic-preset` | Arithmetic preset | preset | No |
| `resources/coordinates-preset` | Coordinates preset | preset | No |
| `resources/counting-preset` | Counting preset | preset | No |
| `resources/Dataset` | Dataset | component | Yes |
| `resources/equal-groups-preset` | Equal groups preset | preset | No |
| `resources/fraction-builder-preset` | Fraction comparison preset | preset | No |
| `resources/fraction-number-line-preset` | Fraction number line preset | preset | No |
| `resources/probability-preset` | Random trials preset | preset | No |
| `resources/ratio-preset` | Ratio preset | preset | No |
| `resources/Theme` | Theme | component | No |

## 4. Complete component breakdown by experiment

Every authored node/resource is listed below, including repeated instances and instance IDs. Node labels are recipe-specific; the registry definition ID identifies the reusable component.

### 1. Projectile motion (`projectile`)

Recipe: [projectile/recipe.json](../../../src/web/src/simulations/pre-made/projectile/recipe.json). Instances: **14**; distinct definitions: **9**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `projectile/primary` | Projectile | `models/Projectile` | models | Yes | node |
| `projectile/primary/appearance` | Projectile scene | `appearance/Projectile` | appearance | Yes | node |
| `projectile/primary/appearance/Launcher` | Launcher | `appearance/Launcher` | appearance | Yes | node |
| `projectile/primary/appearance/Trajectory` | Trajectory | `appearance/Trajectory` | appearance | Yes | node |
| `projectile/primary/appearance/VelocityArrow` | Velocity arrows | `appearance/VelocityArrow` | appearance | Yes | node |
| `projectile/primary/appearance/ProjectileBody` | Projectile body | `appearance/ProjectileBody` | appearance | Yes | node |
| `projectile/primary/control/set:angle` | Ball 1 angle | `controls/Slider` | controls | Yes | node |
| `projectile/primary/display/range` | Ball 1 distance | `displays/Readout` | displays | Yes | node |
| `projectile/primary/display/maxHeight` | Ball 1 height | `displays/Readout` | displays | Yes | node |
| `projectile/secondary` | Projectile | `models/Projectile` | models | Yes | node |
| `projectile/secondary/control/set:angle` | Ball 2 angle | `controls/Slider` | controls | Yes | node |
| `projectile/secondary/display/range` | Ball 2 distance | `displays/Readout` | displays | Yes | node |
| `projectile/secondary/display/maxHeight` | Ball 2 height | `displays/Readout` | displays | Yes | node |
| `launch` | Launch both | `controls/Button` | controls | Yes | node |

### 2. Price elasticity of demand (`price-elasticity`)

Recipe: [price-elasticity/recipe.json](../../../src/web/src/simulations/pre-made/price-elasticity/recipe.json). Instances: **6**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Price elasticity | `prefabs/economics/PriceElasticity` | models | Yes | node |
| `appearance` | Price elasticity scene | `appearance/economics-price-elasticity` | appearance | Yes | node |
| `input/price` | Price ($) | `controls/Slider` | controls | Yes | node |
| `result/elasticity` | Point elasticity \|Ed\| | `displays/Readout` | displays | Yes | node |
| `result/revenue` | Total revenue ($) | `displays/Readout` | displays | Yes | node |
| `result/quantity` | Quantity demanded | `displays/Readout` | displays | Yes | node |

### 3. How long must the ladder be? (`pythagorean`)

Recipe: [pythagorean/recipe.json](../../../src/web/src/simulations/pre-made/pythagorean/recipe.json). Instances: **4**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Ladder geometry | `prefabs/math-geometry/Pythagorean` | models | Yes | node |
| `scene` | Ladder and worked calculation | `appearance/math-pythagorean` | appearance | Yes | node |
| `input/distance` | Foot distance | `controls/Slider` | controls | Yes | node |
| `input/height` | Wall contact height | `controls/Slider` | controls | Yes | node |

### 4. Acid-base titration & pH neutralization (`acid-base-titration`)

Recipe: [acid-base-titration/recipe.json](../../../src/web/src/simulations/pre-made/acid-base-titration/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Acid-base titration | `prefabs/chemistry/AcidBaseTitration` | models | Yes | node |
| `appearance` | Acid-base titration scene | `appearance/chemistry-titration` | appearance | Yes | node |
| `input/titrantVolume` | Titrant added (mL) | `controls/Slider` | controls | Yes | node |
| `result/ph` | Solution pH | `displays/Readout` | displays | Yes | node |
| `result/veq` | Equivalence volume (mL) | `displays/Readout` | displays | Yes | node |

### 5. Cost and profit maximization (`cost-and-profit`)

Recipe: [cost-and-profit/recipe.json](../../../src/web/src/simulations/pre-made/cost-and-profit/recipe.json). Instances: **8**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Cost and profit model | `prefabs/economics/CostAndProfit` | models | Yes | node |
| `appearance` | Cost and profit curves scene | `appearance/economics-cost-and-profit` | appearance | Yes | node |
| `input/marketPrice` | Market price ($/unit) | `controls/Slider` | controls | Yes | node |
| `input/fixedCost` | Fixed overhead cost ($) | `controls/Slider` | controls | Yes | node |
| `result/quantity` | Optimal output (units) | `displays/Readout` | displays | Yes | node |
| `result/profit` | Economic profit ($) | `displays/Readout` | displays | Yes | node |
| `result/mc` | Marginal cost ($/unit) | `displays/Readout` | displays | Yes | node |
| `result/atc` | Average total cost ($/unit) | `displays/Readout` | displays | Yes | node |

### 6. How tall is the tree? (`tree-height`)

Recipe: [tree-height/recipe.json](../../../src/web/src/simulations/pre-made/tree-height/recipe.json). Instances: **4**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Tree measurement | `prefabs/math-geometry/TreeHeight` | models | Yes | node |
| `scene` | Observer, sight line and tree | `appearance/math-tree-height` | appearance | Yes | node |
| `control/1` | Aim: sight angle (°) | `controls/Slider` | controls | Yes | node |
| `control/2` | Distance from the tree (m) | `controls/Slider` | controls | Yes | node |

### 7. Galvanic cell & Nernst potential (`galvanic-cell`)

Recipe: [galvanic-cell/recipe.json](../../../src/web/src/simulations/pre-made/galvanic-cell/recipe.json). Instances: **6**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Galvanic cell model | `prefabs/chemistry/GalvanicCell` | models | Yes | node |
| `appearance` | Galvanic cell scene | `appearance/chemistry-galvanic-cell` | appearance | Yes | node |
| `input/znConcentration` | [Zn²⁺] (M) | `controls/Slider` | controls | Yes | node |
| `input/cuConcentration` | [Cu²⁺] (M) | `controls/Slider` | controls | Yes | node |
| `result/cellPotential` | Cell potential (V) | `displays/Readout` | displays | Yes | node |
| `result/reactionQuotient` | Reaction quotient Q | `displays/Readout` | displays | Yes | node |

### 8. Craft or assembly line? (`craft-production`)

Recipe: [craft-production/recipe.json](../../../src/web/src/simulations/pre-made/craft-production/recipe.json). Instances: **11**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Craft or assembly line? | `prefabs/social-systems/Production` | models | Yes | node |
| `appearance` | Visual comparison | `appearance/social-production` | appearance | Yes | node |
| `input/specialization` | Division of work | `controls/Slider` | controls | Yes | node |
| `input/delay` | Slowest-stage delay | `controls/Slider` | controls | Yes | node |
| `input/disruption` | Temporary disruption | `controls/Slider` | controls | Yes | node |
| `result/craftCompleted` | Craft completed | `displays/Readout` | displays | Yes | node |
| `result/assemblyCompleted` | Assembly completed | `displays/Readout` | displays | Yes | node |
| `result/unfinished` | Unfinished · craft / line | `displays/StatusMessage` | displays | Yes | node |
| `result/idle` | Idle time · craft / line | `displays/StatusMessage` | displays | Yes | node |
| `result/defects` | Defect rate · craft / line | `displays/StatusMessage` | displays | Yes | node |
| `conclusion` | What this shows | `displays/StatusMessage` | displays | Yes | node |

### 9. Why do hexagons tile but pentagons don't? (`tile-patterns`)

Recipe: [tile-patterns/recipe.json](../../../src/web/src/simulations/pre-made/tile-patterns/recipe.json). Instances: **3**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Regular tiles | `prefabs/math-geometry/RegularTiling` | models | Yes | node |
| `scene` | Tiles around one corner | `appearance/math-tiling` | appearance | Yes | node |
| `control/1` | Sides on each tile | `controls/Slider` | controls | Yes | node |

### 10. Wildfire & fuel treatment (`wildfire`)

Recipe: [wildfire/recipe.json](../../../src/web/src/simulations/pre-made/wildfire/recipe.json). Instances: **10**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Wildfire & fuel treatment | `prefabs/ecology/Wildfire` | models | Yes | node |
| `appearance` | Visual comparison | `appearance/ecology-wildfire` | appearance | Yes | node |
| `input/coverage` | Treatment width | `controls/Slider` | controls | Yes | node |
| `input/wind` | Wind severity | `controls/Slider` | controls | Yes | node |
| `input/moisture` | Fuel moisture | `controls/Slider` | controls | Yes | node |
| `result/untreatedArea` | Untreated area burned | `displays/Readout` | displays | Yes | node |
| `result/treatedArea` | Treated area burned | `displays/Readout` | displays | Yes | node |
| `result/reduction` | Area reduction | `displays/Readout` | displays | Yes | node |
| `result/community` | Community · untreated / treated | `displays/StatusMessage` | displays | Yes | node |
| `conclusion` | What this shows | `displays/StatusMessage` | displays | Yes | node |

### 11. Which can uses the least metal? (`can-material`)

Recipe: [can-material/recipe.json](../../../src/web/src/simulations/pre-made/can-material/recipe.json). Instances: **3**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | 500 cm³ can | `prefabs/math-geometry/CanPackaging` | models | Yes | node |
| `scene` | Can, metal used and area curve | `appearance/math-can` | appearance | Yes | node |
| `control/1` | Can radius (cm) | `controls/Slider` | controls | Yes | node |

### 12. Survey size and uncertainty (`survey-sampling`)

Recipe: [survey-sampling/recipe.json](../../../src/web/src/simulations/pre-made/survey-sampling/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Survey size and uncertainty | `prefabs/math-analysis/survey-sampling` | models | Yes | node |
| `scene` | Survey size and uncertainty | `appearance/math-analysis-survey-sampling` | appearance | Yes | node |
| `input/0` | Draw 20 surveys | `controls/Button` | controls | Yes | node |
| `input/1` | Survey size | `controls/Slider` | controls | Yes | node |

### 13. Crowbar and pivot (`levers`)

Recipe: [levers/recipe.json](../../../src/web/src/simulations/pre-made/levers/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Crowbar | `prefabs/physics/Lever` | models | Yes | node |
| `appearance` | Crowbar scene | `appearance/physics-lever` | appearance | Yes | node |
| `pivot` | Pivot position | `controls/Slider` | controls | Yes | node |
| `lift` | Lift the load | `controls/Button` | controls | Yes | node |

### 14. Supporting rope strands (`pulleys`)

Recipe: [pulleys/recipe.json](../../../src/web/src/simulations/pre-made/pulleys/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Supporting rope strands | `prefabs/physics/Pulley` | models | Yes | node |
| `appearance` | Supporting rope strands scene | `appearance/physics-pulley` | appearance | Yes | node |
| `control/strands` | Supporting strands | `controls/Select` | controls | Yes | node |
| `control/pull` | Rope pulled | `controls/Slider` | controls | Yes | node |

### 15. Bicycle chain drive (`bicycle-gears`)

Recipe: [bicycle-gears/recipe.json](../../../src/web/src/simulations/pre-made/bicycle-gears/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Bicycle chain drive | `prefabs/physics/BicycleGears` | models | Yes | node |
| `appearance` | Bicycle chain drive scene | `appearance/physics-gears` | appearance | Yes | node |
| `control/rear` | Rear sprocket teeth | `controls/Slider` | controls | Yes | node |
| `control/front` | Front chainring teeth | `controls/Slider` | controls | Yes | node |
| `control/turns` | Turn pedals / start again | `controls/Button` | controls | Yes | node |

### 16. Cabinet stability (`tipping`)

Recipe: [tipping/recipe.json](../../../src/web/src/simulations/pre-made/tipping/recipe.json). Instances: **5**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Cabinet stability | `prefabs/physics/Tipping` | models | Yes | node |
| `appearance` | Cabinet stability scene | `appearance/physics-tipping` | appearance | Yes | node |
| `control/tilt` | Tilt cabinet | `controls/Slider` | controls | Yes | node |
| `control/loadHeight` | Load shelf height | `controls/Slider` | controls | Yes | node |
| `control/height` | Cabinet height | `controls/Slider` | controls | Yes | node |

### 17. Two-cart collision (`collisions`)

Recipe: [collisions/recipe.json](../../../src/web/src/simulations/pre-made/collisions/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Two-cart collision | `prefabs/physics/Collision` | models | Yes | node |
| `appearance` | Two-cart collision scene | `appearance/physics-collision` | appearance | Yes | node |
| `control/speed1` | Left cart starting speed | `controls/Slider` | controls | Yes | node |
| `control/speed2` | Right cart starting speed | `controls/Slider` | controls | Yes | node |
| `control/collided` | Collide / return to start | `controls/Button` | controls | Yes | node |

### 18. Two-piston hydraulic lift (`hydraulics`)

Recipe: [hydraulics/recipe.json](../../../src/web/src/simulations/pre-made/hydraulics/recipe.json). Instances: **5**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Two-piston hydraulic lift | `prefabs/physics/HydraulicLift` | models | Yes | node |
| `appearance` | Two-piston hydraulic lift scene | `appearance/physics-hydraulics` | appearance | Yes | node |
| `control/outputArea` | Output piston area | `controls/Slider` | controls | Yes | node |
| `control/inputForce` | Available input force | `controls/Slider` | controls | Yes | node |
| `control/stroke` | Requested input stroke | `controls/Slider` | controls | Yes | node |

### 19. Steel hull and block (`buoyancy`)

Recipe: [buoyancy/recipe.json](../../../src/web/src/simulations/pre-made/buoyancy/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Steel hull and block | `prefabs/physics/Buoyancy` | models | Yes | node |
| `appearance` | Steel hull and block scene | `appearance/physics-buoyancy` | appearance | Yes | node |
| `control/cargo` | Cargo added | `controls/Slider` | controls | Yes | node |
| `control/flooded` | Flood / seal the hull | `controls/Button` | controls | Yes | node |

### 20. Passing ambulance siren (`doppler-siren`)

Recipe: [doppler-siren/recipe.json](../../../src/web/src/simulations/pre-made/doppler-siren/recipe.json). Instances: **4**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model0` | Passing ambulance siren | `prefabs/physics/Doppler` | models | Yes | node |
| `appearance0` | Passing ambulance siren scene | `appearance/physics-doppler` | appearance | Yes | node |
| `control/time` | Seconds relative to closest pass | `controls/Slider` | controls | Yes | node |
| `control/speed` | Ambulance speed | `controls/Slider` | controls | Yes | node |

### 21. Guitar string modes (`guitar-string`)

Recipe: [guitar-string/recipe.json](../../../src/web/src/simulations/pre-made/guitar-string/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model0` | Guitar string modes | `prefabs/physics/String` | models | Yes | node |
| `appearance0` | Guitar string modes scene | `appearance/physics-string` | appearance | Yes | node |
| `control/length` | Vibrating length | `controls/Slider` | controls | Yes | node |
| `control/phase` | Explore one wave cycle | `controls/Slider` | controls | Yes | node |
| `control/harmonic` | Harmonic | `controls/Select` | controls | Yes | node |

### 22. Cooling a hot drink (`cooling-drinks`)

Recipe: [cooling-drinks/recipe.json](../../../src/web/src/simulations/pre-made/cooling-drinks/recipe.json). Instances: **5**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model0` | Cold room · 20°C | `prefabs/physics/Cooling` | models | Yes | node |
| `appearance0` | Cold room · 20°C scene | `appearance/physics-cooling` | appearance | Yes | node |
| `model1` | Warm room · 30°C | `prefabs/physics/Cooling` | models | Yes | node |
| `appearance1` | Warm room · 30°C scene | `appearance/physics-cooling` | appearance | Yes | node |
| `control/time` | Minutes elapsed | `controls/Slider` | controls | Yes | node |

### 23. Moving magnet and coil (`magnet-induction`)

Recipe: [magnet-induction/recipe.json](../../../src/web/src/simulations/pre-made/magnet-induction/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model0` | Moving magnet and coil | `prefabs/physics/Induction` | models | Yes | node |
| `appearance0` | Moving magnet and coil scene | `appearance/physics-induction` | appearance | Yes | node |
| `control/position` | Magnet position | `controls/Slider` | controls | Yes | node |
| `control/speed` | Signed magnet speed | `controls/Slider` | controls | Yes | node |
| `control/advance` | Move magnet 0.1 second | `controls/Button` | controls | Yes | node |

### 24. Charging and discharging (`rc-circuit`)

Recipe: [rc-circuit/recipe.json](../../../src/web/src/simulations/pre-made/rc-circuit/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model0` | Charging and discharging | `prefabs/physics/Capacitor` | models | Yes | node |
| `appearance0` | Charging and discharging scene | `appearance/physics-capacitor` | appearance | Yes | node |
| `control/mode` | Circuit connection | `controls/Select` | controls | Yes | node |
| `control/advance` | Advance one second | `controls/Button` | controls | Yes | node |
| `control/restart` | Start uncharged | `controls/Button` | controls | Yes | node |

### 25. Fraction number line (`fraction-number-line`)

Recipe: [fraction-number-line/recipe.json](../../../src/web/src/simulations/pre-made/fraction-number-line/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Fraction number line | `models/fraction-number-line` | models | Yes | node |
| `appearance` | Fraction number line scene | `appearance/fraction-number-line` | appearance | Yes | node |
| `task` | Fraction number line controls | `controls/NumberLineActivity` | controls | Yes | node |
| `result` | Your fraction | `displays/Readout` | displays | Yes | node |

### 26. Cell division (`cell-division`)

Recipe: [cell-division/recipe.json](../../../src/web/src/simulations/pre-made/cell-division/recipe.json). Instances: **5**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Cell division | `prefabs/science/CellDivision` | models | Yes | node |
| `appearance` | Explore the scene | `appearance/science-cell` | appearance | Yes | node |
| `playback` | Next action | `controls/science-cell` | controls | Yes | node |
| `observations` | What you can see | `displays/ScienceObservations` | displays | Yes | node |
| `conditions` | Investigate a condition | `controls/science-cell` | controls | Yes | node |

### 27. Area & perimeter (`area-perimeter`)

Recipe: [area-perimeter/recipe.json](../../../src/web/src/simulations/pre-made/area-perimeter/recipe.json). Instances: **6**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Area & perimeter | `models/area-perimeter` | models | Yes | node |
| `appearance` | Area & perimeter scene | `appearance/area-perimeter` | appearance | Yes | node |
| `input/width` | Width · m | `controls/Slider` | controls | Yes | node |
| `input/height` | Height · m | `controls/Slider` | controls | Yes | node |
| `result/area` | Area inside · m² | `displays/Readout` | displays | Yes | node |
| `result/perimeter` | Perimeter around · m | `displays/Readout` | displays | Yes | node |

### 28. Beer-Lambert law & spectrophotometry (`beer-lambert`)

Recipe: [beer-lambert/recipe.json](../../../src/web/src/simulations/pre-made/beer-lambert/recipe.json). Instances: **6**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Beer-Lambert model | `prefabs/chemistry/BeerLambert` | models | Yes | node |
| `appearance` | Beer-Lambert spectrophotometer scene | `appearance/chemistry-beer-lambert` | appearance | Yes | node |
| `input/concentration` | Concentration (mM) | `controls/Slider` | controls | Yes | node |
| `input/pathLength` | Path length (cm) | `controls/Slider` | controls | Yes | node |
| `result/absorbance` | Absorbance (A) | `displays/Readout` | displays | Yes | node |
| `result/transmittance` | Transmittance (%T) | `displays/Readout` | displays | Yes | node |

### 29. Addition & subtraction (`arithmetic`)

Recipe: [arithmetic/recipe.json](../../../src/web/src/simulations/pre-made/arithmetic/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Arithmetic | `models/arithmetic` | models | Yes | node |
| `appearance` | Arithmetic appearance | `appearance/arithmetic` | appearance | Yes | node |
| `control/SET_ARITHMETIC_TASK` | Arithmetic controls | `controls/ArithmeticActivity` | controls | Yes | node |
| `result` | Your calculation | `displays/Readout` | displays | Yes | node |

### 30. Gas equilibrium & Le Chatelier (`gas-equilibrium`)

Recipe: [gas-equilibrium/recipe.json](../../../src/web/src/simulations/pre-made/gas-equilibrium/recipe.json). Instances: **7**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Gas equilibrium | `prefabs/chemistry/GasEquilibrium` | models | Yes | node |
| `appearance` | Gas equilibrium scene | `appearance/chemistry-gas-equilibrium` | appearance | Yes | node |
| `input/temp` | Temperature (K) | `controls/Slider` | controls | Yes | node |
| `input/vol` | Volume (L) | `controls/Slider` | controls | Yes | node |
| `result/pressure` | Pressure (atm) | `displays/Readout` | displays | Yes | node |
| `result/kc` | Equilibrium constant Kc | `displays/Readout` | displays | Yes | node |
| `result/no2` | [NO₂] (mol/L) | `displays/Readout` | displays | Yes | node |

### 31. Phases of matter & supercritical fluid (`phase-change`)

Recipe: [phase-change/recipe.json](../../../src/web/src/simulations/pre-made/phase-change/recipe.json). Instances: **8**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Phase change | `prefabs/chemistry/PhaseChange` | models | Yes | node |
| `appearance` | Phase change scene | `appearance/chemistry-phase-change` | appearance | Yes | node |
| `input/material` | Material substance | `controls/Select` | controls | Yes | node |
| `input/temp` | Temperature (K) | `controls/Slider` | controls | Yes | node |
| `input/pressure` | Chamber pressure (atm) | `controls/Slider` | controls | Yes | node |
| `result/phase` | Physical phase | `displays/Readout` | displays | Yes | node |
| `result/density` | Density (g/cm³) | `displays/Readout` | displays | Yes | node |
| `result/supercritical` | Thermodynamic state | `displays/Readout` | displays | Yes | node |

### 32. Coordinate plotting (`coordinates`)

Recipe: [coordinates/recipe.json](../../../src/web/src/simulations/pre-made/coordinates/recipe.json). Instances: **4**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Coordinate plotting | `models/coordinates` | models | Yes | node |
| `appearance` | Coordinate plotting scene | `appearance/coordinates` | appearance | Yes | node |
| `input/x` | X · horizontal | `controls/Slider` | controls | Yes | node |
| `input/y` | Y · vertical | `controls/Slider` | controls | Yes | node |

### 33. Bottle outlet (`water-pressure`)

Recipe: [water-pressure/recipe.json](../../../src/web/src/simulations/pre-made/water-pressure/recipe.json). Instances: **3**; distinct definitions: **3**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Bottle outlet | `prefabs/physics/WaterPressure` | models | Yes | node |
| `appearance` | Bottle outlet scene | `appearance/physics-pressure` | appearance | Yes | node |
| `control/holeHeight` | Hole height above floor | `controls/Slider` | controls | Yes | node |

### 34. Alternate voting systems (`voting-systems`)

Recipe: [voting-systems/recipe.json](../../../src/web/src/simulations/pre-made/voting-systems/recipe.json). Instances: **5**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Alternate voting systems | `prefabs/collective/voting` | models | Yes | node |
| `scene` | Teaching scene | `appearance/collective-voting` | appearance | Yes | node |
| `action` | action | `controls/collective-voting-action` | controls | Yes | node |
| `choice` | choice | `controls/collective-voting-choice` | controls | Yes | node |
| `caption` | caption | `displays/collective-voting-caption` | displays | Yes | node |

### 35. Counting circles (`counting`)

Recipe: [counting/recipe.json](../../../src/web/src/simulations/pre-made/counting/recipe.json). Instances: **5**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Counting | `models/counting` | models | Yes | node |
| `appearance` | Counting appearance | `appearance/counting` | appearance | Yes | node |
| `control/REPLAY` | Count again | `controls/Button` | controls | Yes | node |
| `display/count` | Circles counted | `displays/Readout` | displays | Yes | node |
| `task` | Counting controls | `controls/CountingActivity` | controls | Yes | node |

### 36. Equal groups (`equal-groups`)

Recipe: [equal-groups/recipe.json](../../../src/web/src/simulations/pre-made/equal-groups/recipe.json). Instances: **4**; distinct definitions: **4**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Equal groups | `models/equal-groups` | models | Yes | node |
| `appearance` | Equal groups scene | `appearance/equal-groups` | appearance | Yes | node |
| `task` | Equal groups controls | `controls/GroupingActivity` | controls | Yes | node |
| `result` | Your sharing | `displays/Readout` | displays | Yes | node |

### 37. Pendulum swing (`pendulum`)

Recipe: [pendulum/recipe.json](../../../src/web/src/simulations/pre-made/pendulum/recipe.json). Instances: **7**; distinct definitions: **6**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Compare pendulum lengths | `prefabs/physical-systems/Pendulum` | models | Yes | node |
| `appearance` | Compare pendulum lengths appearance | `appearance/physical-pendulum` | appearance | Yes | node |
| `control/PHYS_PLAY` | Toggle | `controls/Toggle` | controls | Yes | node |
| `control/PHYS_RESTART` | Action button | `controls/Button` | controls | Yes | node |
| `control/PEND_SET_LENGTH` | Slider | `controls/Slider` | controls | Yes | node |
| `control/PEND_SET_AMPLITUDE` | Slider | `controls/Slider` | controls | Yes | node |
| `display/period` | Readout | `displays/Readout` | displays | Yes | node |

### 38. Slope and intercept (`slope`)

Recipe: [slope/recipe.json](../../../src/web/src/simulations/pre-made/slope/recipe.json). Instances: **7**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Line | `prefabs/AuthoredLine` | models | Yes | node |
| `canvas` | Cartesian plane | `canvases/cartesian` | canvases | Yes | node |
| `control/set:slope` | Slope slider | `controls/Slider` | controls | Yes | node |
| `control/set:intercept` | Intercept slider | `controls/Slider` | controls | Yes | node |
| `control/reset` | Reset line | `controls/Button` | controls | Yes | node |
| `display/equation` | Equation | `displays/Readout` | displays | Yes | node |
| `display/slope` | Slope result | `displays/Readout` | displays | Yes | node |

### 39. Truss bridge (`bridge`)

Recipe: [bridge/recipe.json](../../../src/web/src/simulations/pre-made/bridge/recipe.json). Instances: **37**; distinct definitions: **11**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Bridge response | `models/BridgeResponse` | models | Yes | node |
| `appearance` | Bridge scene | `appearance/Bridge` | appearance | Yes | node |
| `appearance/Beam` | Truss beams | `appearance/Beam` | appearance | Yes | node |
| `appearance/Joint` | Truss joints | `appearance/Joint` | appearance | Yes | node |
| `appearance/BridgeSupport` | Bridge supports | `appearance/BridgeSupport` | appearance | Yes | node |
| `appearance/LoadTruck` | Load truck | `appearance/LoadTruck` | appearance | Yes | node |
| `display/selected` | Readout | `displays/Inspector` | displays | Yes | node |
| `generated/b0` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/b1` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/t1` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/b2` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/t2` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/b3` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/t3` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/b4` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/t4` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/b5` | Truss joint | `models/TrussJoint` | models | Yes | node |
| `generated/deck0` | deck0 | `models/TrussMember` | models | Yes | node |
| `generated/deck1` | deck1 | `models/TrussMember` | models | Yes | node |
| `generated/deck2` | deck2 | `models/TrussMember` | models | Yes | node |
| `generated/deck3` | deck3 | `models/TrussMember` | models | Yes | node |
| `generated/deck4` | deck4 | `models/TrussMember` | models | Yes | node |
| `generated/top1` | top1 | `models/TrussMember` | models | Yes | node |
| `generated/top2` | top2 | `models/TrussMember` | models | Yes | node |
| `generated/top3` | top3 | `models/TrussMember` | models | Yes | node |
| `generated/vert1` | vert1 | `models/TrussMember` | models | Yes | node |
| `generated/vert2` | vert2 | `models/TrussMember` | models | Yes | node |
| `generated/vert3` | vert3 | `models/TrussMember` | models | Yes | node |
| `generated/vert4` | vert4 | `models/TrussMember` | models | Yes | node |
| `generated/endL` | endL | `models/TrussMember` | models | Yes | node |
| `generated/endR` | endR | `models/TrussMember` | models | Yes | node |
| `generated/diag1` | diag1 | `models/TrussMember` | models | Yes | node |
| `generated/diag2` | diag2 | `models/TrussMember` | models | Yes | node |
| `generated/diag3` | diag3 | `models/TrussMember` | models | Yes | node |
| `load` | Bridge load | `models/BridgeLoad` | models | Yes | node |
| `control/MOVE_LOAD` | Slider | `controls/Slider` | controls | Yes | node |
| `control/SET_LOAD` | Slider | `controls/Slider` | controls | Yes | node |

### 40. Shared fishing lake (`shared-fishing-lake`)

Recipe: [shared-fishing-lake/recipe.json](../../../src/web/src/simulations/pre-made/shared-fishing-lake/recipe.json). Instances: **5**; distinct definitions: **5**.

| Instance ID | Instance label | Component definition | Category | Catalog | Storage |
| --- | --- | --- | --- | --- | --- |
| `model` | Shared fishing lake | `prefabs/collective/fishing` | models | Yes | node |
| `scene` | Teaching scene | `appearance/collective-fishing` | appearance | Yes | node |
| `action` | action | `controls/collective-fishing-action` | controls | Yes | node |
| `choice` | choice | `controls/collective-fishing-choice` | controls | Yes | node |
| `caption` | caption | `displays/collective-fishing-caption` | displays | Yes | node |

## 5. Recommended keep list: catalog components unused by the 40 recipes

**25 definitions unused by the benchmark recipes are retained in the implemented catalog.** Together with the 110 used definitions, they form the current pool of **135 distinct definitions**. Section 3 preserves the former unused inventory and marks current membership. The scope is shared by the experiment list, builder discovery, and AI component/assembly retrieval.

This is a compact selection of general-purpose inputs, feedback, layouts, binding helpers and two relevant alternative objects. Domain-specific adjacent models, presets, themes, and less essential layout/conversion options have been removed from the earlier 61-entry recommendation to meet the limit.

The 25-entry cap is a scope tradeoff, not proof that the omitted components can never support a valid prompt interpretation. It favors the existing 40 recipe mechanisms over wider assembly flexibility.

### Alternative inputs (3)

Allow numeric entry and grouped changes instead of forcing the reference recipe’s input widget.

| Component ID | Catalog title | Category |
| --- | --- | --- |
| `controls/NumberInput` | Number input | controls |
| `controls/Form` | Control group | controls |
| `controls/TextInput` | Text input | controls |

### Feedback and data presentation (6)

Keep reusable ways to show trajectories, equations, tabular results and distributions.

| Component ID | Catalog title | Category |
| --- | --- | --- |
| `displays/Chart` | Chart | displays |
| `displays/DataTable` | Data Table | displays |
| `displays/Formula` | Formula display | displays |
| `displays/Histogram` | Histogram | displays |
| `displays/Heatmap` | Heatmap | displays |
| `displays/Legend` | Legend | displays |

### Core layouts (6)

Keep straightforward arrangements, grouping and expandable secondary content.

| Component ID | Catalog title | Category |
| --- | --- | --- |
| `layout/Stack` | Stack | layout |
| `layout/Row` | Row | layout |
| `layout/Grid` | Grid | layout |
| `layout/Panel` | Panel | layout |
| `layout/Split` | Split | layout |
| `layout/Disclosure` | Disclosure | layout |

### Data and binding helpers (8)

Support reusable values, field extraction, expressions and common length conversions. Omitting other conversion definitions does not authorize connecting incompatible units.

| Component ID | Catalog title | Category |
| --- | --- | --- |
| `data/Expression` | Expression | behaviors |
| `data/FieldSelector` | Field selector | behaviors |
| `data/Literal` | Literal (number) | behaviors |
| `data/Literal-record` | Literal (record) | behaviors |
| `data/Literal-list` | Literal (list) | behaviors |
| `data/CentimetresToMetres` | Centimetres to metres | behaviors |
| `data/UnitConversion` | Unit conversion · metres to centimetres | behaviors |
| `resources/Dataset` | Dataset | resources |

### Relevant alternative objects (2)

Keep reusable square and fraction-bar objects for alternative geometry and fraction assemblies. They still require a compatible canvas and valid connections.

| Component ID | Catalog title | Category |
| --- | --- | --- |
| `prefabs/AuthoredSquare` | Square | models |
| `prefabs/AuthoredFractionBar` | Fraction bar | models |

The other 222 formerly visible unused definitions are excluded from the component picker and new AI assembly candidates. Assemblies containing excluded definitions are also hidden from catalog discovery. Registry resolution, recipe import and loading, and edits to existing components retain the full definitions.

## Verification and limitations

The inventory was checked against the 40 IDs in the benchmark document, every referenced definition/version was resolved through the registry, nested references were checked, and unique counts and instance totals were reconciled. Catalog membership comes from executing the actual picker selection function. The later catalog restriction was checked with `scripts/recipes/verify-catalog-scope.cjs`: exact membership, all 40 recipe coverage, excluded components and assemblies, AI retrieval scope, and preservation of the full registry.

No browser interaction, destination-specific insertion checks, live inference, account library inspection, or scientific correctness evaluation was performed. This snapshot should be regenerated if recipe contents or catalog visibility rules change.
