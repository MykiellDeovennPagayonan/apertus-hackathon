# How weather forms

Date: 2026-10-10  
Status: Researched simulation proposal; not implemented.  
Recommended presentation: **2D linked weather map and atmospheric cross-section.**

## Concept and learning goals

How do sunlight, moving air, and moisture combine to produce changing weather?

Learners connect uneven heating with circulation, follow moist air as it rises and cools, and compare several ways to lift air. This extends the existing Water Cycle concept from water pathways into atmospheric conditions and weather systems.

## How it works

Uneven solar heating drives atmospheric circulation. Pressure differences contribute to winds; Earth's rotation modifies large-scale flow. Air masses have different temperature and moisture characteristics, and fronts mark their boundaries. Winds and upper-level flow move and steer weather systems. Local weather reflects these processes together with terrain and surface conditions. [NOAA — Weather systems and patterns](https://www.noaa.gov/education/resource-collections/weather-atmosphere/weather-systems-patterns)

Rising air expands and cools. When conditions reach saturation, water vapor can condense on particles into cloud droplets, or ice can form. Surface heating, terrain, and frontal lifting can all help air rise. Cloud particles must grow sufficiently to produce precipitation that reaches the ground; a cloud does not automatically mean rain. [Met Office — Clouds](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/clouds)

## How we present it

Build one shared map-plus-section layout with three bounded scenario tabs:

1. **Sunny coast:** compare land and sea heating through the day. Follow a schematic sea-breeze circulation and inspect air temperature and moisture.
2. **Mountain lifting:** move moist air toward a ridge, trace ascent and cloud formation, and compare the leeward descent.
3. **Weather front:** advance a cold air mass toward warm, moist air. Show lifting in the section and the front's location on the map.

Begin with a ready-to-play scenario. Select an air parcel and keep its identity while it moves. On each transition, explain the cause in one sentence: heating, movement, expansion, saturation, particle growth, or precipitation. Use cloud extent and a small parcel-temperature panel rather than a dashboard of unrelated numbers.

## Objects, controls, and observations

- Objects: land, sea, ridge, air masses, parcel tracers, front boundary, wind arrows, clouds, and precipitation.
- Controls: scenario; solar-heating preset; initial moisture; wind direction where supported; terrain preset; parcel inspection; step/play/pause; reset paired run.
- Observations: parcel height, temperature, saturation state, cloud formation stage, wind direction, and precipitation occurrence. Use actual units only where the parcel model supports them.
- Investigation: “Keep the mountain and incoming wind identical, then lower initial moisture. Does the parcel reach saturation at the same altitude?”

## First-version model and boundaries

Use scenario-specific circulation presets coupled to a documented parcel temperature-and-moisture model. Condensation responds to saturation, not a decorative altitude trigger. Precipitation requires a separate simplified particle-growth stage or an explicitly scripted scenario outcome. Keep vapor, cloud water, and precipitation distinct, and record modeled water transfers.

The map and section read one scenario state and clock. Pressure and wind overlays are schematic unless a flow model computes them. State which winds are prescribed instead of implying that the parcel model solves global weather. A later regional-map extension can show Coriolis effects; do not apply a dramatic rotational deflection to every tiny local updraft.

Separate lesson scenarios from real forecasts. Warm conditions alone do not guarantee storms, fronts need not always rain, and humidity alone does not determine weather. Thunderstorm electricity belongs to the dedicated Lightning Formation lesson; tornadoes, tropical cyclones, and numerical forecasting are later topics.

Acceptance: map and section agree on front and parcel position; saturated and unsaturated parcel states differ; clouds do not automatically rain; moisture changes have explainable outcomes; changing playback speed never changes the model.

## Why 2D

The map exposes horizontal movement while the section exposes vertical lifting. Together they show the important dimensions with fewer hidden objects and simpler labels than a 3D sky. Consider 3D later for a focused cloud-structure or terrain-flow lesson.

## Research sources

- [NOAA — Weather systems and patterns](https://www.noaa.gov/education/resource-collections/weather-atmosphere/weather-systems-patterns): heating, circulation, air masses, and fronts.
- [Met Office — Clouds](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/clouds): cooling, condensation, and cloud-formation mechanisms.

Scientific explanations follow these sources; interactions, model rules, and the dimension recommendation are proposed design choices.
