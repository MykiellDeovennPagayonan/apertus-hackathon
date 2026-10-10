# The greenhouse effect

Date: 2026-10-10  
Status: Researched simulation proposal; not implemented.  
Recommended presentation: **2D surface–atmosphere energy-flow diagram.**

## Concept and learning goals

Why does changing atmospheric composition change Earth's temperature?

Learners distinguish incoming solar radiation from outgoing thermal infrared, explain absorption and emission by greenhouse gases, and compare a natural greenhouse effect with an enhanced one. This complements the Carbon Cycle concept by adding an explicit energy model.

## How it works

Some incoming sunlight is reflected; some is absorbed by the surface and atmosphere. The warmed surface emits thermal infrared radiation. Greenhouse gases absorb radiation in particular infrared bands and emit infrared in multiple directions, including toward the surface and toward space. This affects how energy escapes and helps maintain a warmer surface. They do not create energy or act as a perfectly reflecting lid. [UCAR — The Greenhouse Effect](https://scied.ucar.edu/learning-zone/how-climate-works/greenhouse-effect)

Increasing greenhouse gases can reduce outgoing energy at the previous temperature, producing an imbalance. The climate warms toward a new balance. Carbon dioxide, methane, water vapor, and nitrous oxide contribute to the greenhouse effect; water vapor commonly amplifies warming as a feedback. The natural effect supports habitable conditions, while human additions strengthen it. [NASA — What is the greenhouse effect?](https://science.nasa.gov/climate-change/faq/what-is-the-greenhouse-effect/)

## How we present it

1. Show three labeled regions: space, atmosphere, and surface.
2. Trace incoming sunlight, reflected sunlight, and energy absorbed at the surface using distinct arrow styles.
3. Introduce outgoing infrared arrows and an enlarged greenhouse-gas interaction inset.
4. Compare two runs with identical sunlight and reflectivity but different infrared absorption settings.
5. Pause immediately after the change to expose the energy imbalance, then advance until the simplified model approaches a new equilibrium.

Use a temperature trend and a small incoming-versus-outgoing energy display. Animation speed must not control warming. Radiation paths are schematic teaching symbols; the inset illustrates wavelength-selective interaction rather than actual atmospheric molecule spacing.

## Objects, controls, and observations

- Objects: surface reservoir, atmospheric reservoir, space boundary, solar and infrared arrows, and an energy-budget indicator.
- Controls: baseline/enhanced greenhouse preset; infrared absorption parameter; surface reflectivity; fixed-sunlight comparison; play/pause; reset. Put feedback extensions in later setup.
- Observations: surface temperature trend, absorbed solar energy, escaping infrared, and net energy imbalance.
- Investigation: “Increase infrared absorption while sunlight stays fixed. Does temperature jump instantly? When does incoming energy balance outgoing energy again?”

## First-version model and boundaries

Use a documented two-reservoir, one-atmospheric-layer energy-balance model with heat capacity. Let the atmosphere absorb a specified fraction of surface infrared and emit upward and downward. The no-infrared-absorption preset is an idealized comparison, not a realistic atmosphere with its composition removed.

The absorption parameter is a teaching control. Do not label it as measured CO2 concentration or claim a specific warming per ppm without a justified radiative treatment. A single-layer model omits vertical structure, spectral detail, circulation, and many feedbacks. A molecular inset must not imply that the same photon is simply reflected back unchanged.

Keep ozone depletion separate from enhanced greenhouse warming. Do not portray the atmosphere as a glass greenhouse roof or imply that additional greenhouse gases prevent all radiation escaping.

Acceptance: all displayed flows come from the budget; energy is conserved across reservoirs and boundaries; temperature responds over model time; both upward and downward atmospheric emission are shown; paired runs hold unrelated settings constant.

## Why 2D

The lesson depends on energy pathways and comparison, which are clearer in a flat diagram. A globe or realistic sky would make the arrows harder to follow without adding useful geometry.

## Research sources

- [UCAR — The Greenhouse Effect](https://scied.ucar.edu/learning-zone/how-climate-works/greenhouse-effect): infrared absorption and emission.
- [NASA — What is the greenhouse effect?](https://science.nasa.gov/climate-change/faq/what-is-the-greenhouse-effect/): natural and enhanced effects, gases, and water-vapor feedback.

Scientific explanations follow these sources; interactions, model rules, and the dimension recommendation are proposed design choices.
