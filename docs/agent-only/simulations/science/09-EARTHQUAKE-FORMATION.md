# How earthquakes form

Date: 2026-10-10  
Status: Researched simulation proposal; not implemented.  
Recommended presentation: **3D fault block with a synchronized 2D cross-section.**

## Concept and learning goals

Why can slowly moving tectonic plates produce sudden shaking?

Learners follow a fault from loading through rupture and seismic-wave propagation. They should distinguish slow plate movement from rapid slip, locate the hypocenter and epicenter, and separate earthquake magnitude from shaking at a particular place. This extends the existing Plate Boundaries concept with an event-scale lesson.

## How it works

Tectonic motion can load a fault while friction holds parts of it in place. Surrounding rock deforms and stores elastic energy. When a patch fails, rapid slip can spread across the fault and release energy as seismic waves. The hypocenter is where rupture begins underground; the epicenter is directly above it at the surface. Rupture occupies an area rather than remaining a single point. Most earthquakes occur near plate boundaries, but earthquakes also occur within plates. [USGS — The Science of Earthquakes](https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes)

P waves generally arrive before S waves. Magnitude describes event size, while local shaking depends on factors including distance and ground conditions. An earthquake does not require plates to collide: sliding and extension can also generate fault slip. [USGS — The Science of Earthquakes](https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes)

## How we present it

1. Start with two rock blocks, a visible fault plane, and a line crossing the surface as a displacement marker.
2. Animate slow loading while the fault remains locked. Highlight deformation with an exaggerated grid and a labeled stored-energy indicator.
3. Slow down rupture. Mark its starting point and show a highlighted patch spreading along the fault.
4. Show wavefronts traveling outward. Select a surface station to reveal arrivals and a small schematic seismogram.
5. Compare pre-event and post-event positions, then replay with one changed condition.

Use a constrained orbit camera plus top, side, and cutaway presets. Keep the cross-section and event timeline visible so learners can understand the process without manipulating the camera. Label waves as overlays, not literal colored shells inside rock.

## Objects, controls, and observations

- Objects: rock blocks, fault plane, deformation grid, rupture patches, hypocenter, epicenter, and surface stations.
- Controls: strike-slip, normal, or reverse-fault preset; loading rate; simplified locking strength; station position; next stage; play/pause; reset.
- Observations: loading state, accumulated deformation, slip, rupture extent, and station arrival order. Use relative indicators unless calibrated units are supported.
- Investigation: “Rotate the strike-slip fault, then compare it with a reverse fault. What moves differently, and what produces shaking in both?”

## First-version model and boundaries

Use a documented spring-and-slider teaching rule for loading and failure, with preset rupture propagation and separate wave travel times. Treat loading years and rupture seconds as distinct, explicitly compressed timelines. Rendering reads the same fault displacement and rupture state as the cross-section.

The failure threshold is an illustrative rule, not a method for predicting real earthquakes. Do not generate a numerical magnitude from a decorative stress bar. Do not imply that all faults rupture regularly or that an event releases every nearby stress. Building collapse and real hazard forecasts are outside this version.

Acceptance: surface and underground motion agree; the epicenter stays above the hypocenter; deformation precedes slip; P arrivals precede S arrivals in the selected homogeneous-medium preset; camera changes never change the model.

## Why 3D

Fault orientation and horizontal versus vertical displacement are spatial ideas. A rotatable block helps learners see relationships a single section can hide. This is the strongest first 3D choice among the seven. A fixed 2D section remains the accessible fallback and explanation view.

## Research sources

- [USGS — The Science of Earthquakes](https://www.usgs.gov/programs/earthquake-hazards/science-earthquakes): fault slip, waves, event location, magnitude, and prediction limits.
- [USGS — Finite Faults](https://earthquake.usgs.gov/data/finitefault/): rupture area and slip history.

Scientific explanations follow these sources; interactions, model rules, and the dimension recommendation are proposed design choices.
