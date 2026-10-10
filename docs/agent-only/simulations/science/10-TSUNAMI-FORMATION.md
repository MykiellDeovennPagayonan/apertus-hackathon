# How tsunamis form

Date: 2026-10-10  
Status: Researched simulation proposal; not implemented.  
Recommended presentation: **2D ocean cross-section with a synchronized overhead map.**

## Concept and learning goals

How can movement beneath the sea affect a distant coast?

Learners connect water displacement, wave travel, ocean depth, and coastal flooding. They should explain why an offshore earthquake does not automatically produce a tsunami and why an apparently small offshore wave can become dangerous near land.

## How it works

A tsunami is a series of long waves produced by a large, rapid displacement of water. Earthquakes that deform the seabed are a common source; landslides and volcanic activity can also produce tsunamis. The disturbance spreads through the ocean, involving the water column rather than only the surface. [NOAA — Tsunamis](https://www.noaa.gov/education/resource-collections/ocean-coasts/tsunamis)

Tsunamis travel faster in deeper water. Approaching shallow water, they slow, their wavelength shortens, and their height can increase. Coastal shape and seabed geometry affect the result. Arrival can resemble a rapidly rising flood or turbulent surge. Water may retreat first, but that is not required, and the first wave need not be the largest. [NOAA — Tsunamis](https://www.noaa.gov/education/resource-collections/ocean-coasts/tsunamis)

## How we present it

1. Start with a deep ocean, continental shelf, coast, and a fault under the seabed.
2. Move the seabed upward or downward in a prescribed source region and highlight displaced water.
3. Follow a labeled wave crest across the section; show an overhead wavefront at the same time.
4. Pause as the wave reaches the shelf. Compare speed, spacing, and height before and after.
5. Continue into a clearly labeled illustrative coastal surge, then show later waves.

Keep source generation, offshore propagation, and coastal arrival as selectable chapters. Include a wind-wave comparison using the same display scale where practical. Avoid making the default scene a giant curling surf wave.

## Objects, controls, and observations

- Objects: seabed profile, displacement zone, water surface, crest markers, depth gauge, coastal marker, and offshore sensor.
- Controls: seabed-displacement preset; deep-ocean depth; shelf profile; source direction; pause/step; restart paired comparison.
- Observations: depth, relative wave height, crest spacing, propagation speed, and arrival sequence. Any exaggerated height gets a visible scale label.
- Investigation: “Keep the source identical and change ocean depth. Which wave reaches the shelf sooner? What changes near shore?”

## First-version model and boundaries

Use a one-dimensional long-wave teaching model or precomputed scenarios with explicitly documented inputs. Where the long-wave approximation applies, propagation speed is approximately `c = sqrt(g * h)`, with gravity `g` and water depth `h`; this does not by itself determine coastal run-up. The overhead map is schematic if derived from a one-dimensional section rather than a two-dimensional propagation model. [NOAA — Tsunami Propagation](https://www.noaa.gov/jetstream/tsunamis/tsunami-propagation)

Treat shoreline inundation as a separate prescribed teaching stage unless a suitable wetting-and-drying solver is implemented. Do not use an animation's flood outline as an evacuation map. A mainly horizontal fault-motion comparison should explain why direct water displacement is often much smaller; it must not claim such earthquakes can never trigger a tsunami by another mechanism.

Acceptance: deeper-water travel is faster for the selected approximation; map and section use the same event clock; later waves remain visible; vertical exaggeration is disclosed; coastal outcomes are labeled schematic.

## Why 2D

The cross-section exposes the crucial hidden relationship between seabed depth and the wave. An overhead map adds spread and coastline context without a free camera. Consider 3D later only for a lesson specifically comparing bays, channels, and coastal geometry with an appropriate model.

## Research sources

- [NOAA — Tsunamis](https://www.noaa.gov/education/resource-collections/ocean-coasts/tsunamis): sources, propagation, coastal arrival, and wave sequence.
- [NOAA — Tsunami Propagation](https://www.noaa.gov/jetstream/tsunamis/tsunami-propagation): long-wave behavior and depth-dependent travel.

Scientific explanations follow these sources; interactions, model rules, and the dimension recommendation are proposed design choices.
