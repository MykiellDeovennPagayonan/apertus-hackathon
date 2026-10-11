# How rainbows form

Date: 2026-10-10  
Status: Research brief; first-version lesson implemented. See the [implementation and verification report](../../implementation/027-validation/REPORT.md) for shipped scope and actual checks.
Recommended presentation: **3D Sun–rain–observer geometry with a 2D droplet ray-path inset.**

## Concept and learning goals

Why do we see an arc of color only from certain positions?

Learners follow light through a droplet, distinguish refraction from internal reflection, and connect many droplets to an observer-dependent rainbow. They should explain why a rainbow has no fixed physical endpoint.

## How it works

Sunlight bends as it enters water. Different wavelengths bend by different amounts, spreading the spectrum. Some light reflects inside a droplet, then bends again as it exits. For the primary bow, the relevant path has one internal reflection. Sunlight must reach droplets in front of the observer while the Sun is behind them. [Met Office — Rainbows: optical wonders](https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/rainbows)

Many droplets send different wavelengths toward the eye at appropriate viewing angles. The visible bow therefore depends on observer position and solar elevation; it is not a colored object suspended at one location. The horizon commonly hides part of the circle, while elevated viewpoints can reveal more. A secondary bow comes from two internal reflections and has reversed color order. The spectrum is continuous rather than seven sharply separated stripes. [Met Office — Rainbows: optical wonders](https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/rainbows)

## How we present it

Start in an observer view with a low Sun behind the viewer and a rain region ahead. Toggle an external explanatory view showing the Sun direction, observer, droplets, and viewing cone around the direction opposite the Sun. Highlight only droplets that contribute light toward the selected observer.

Select one droplet to open a 2D circular cross-section. Step through entry refraction, internal reflection, and exit refraction. Show several labeled wavelengths and fade rays that miss the eye. Return to the wide view and assemble the visible arc from many contributing paths.

Move the observer or change solar elevation and update the contributing droplets and visible arc. An optional elevated viewpoint demonstrates the circular geometry when droplets and unobstructed sightlines permit it. Add the secondary bow only after the primary is understood.

## Objects, controls, and observations

- Objects: Sun direction, observer and eye, rain volume, droplets, light paths, viewing cone, and horizon.
- Controls: observer position; solar elevation; observer/external view; droplet inspection; ray-stage step; primary/secondary bow; labels; reset.
- Observations: selected light path, number of internal reflections, contributing droplet locations, color ordering, and arc visibility.
- Investigation: “Move the observer sideways. Does the same group of droplets still send the rainbow light to their eye?”

## First-version model and boundaries

Use geometric optics with spherical droplets, Snell's law, and wavelength-dependent refractive indices. A small documented set of wavelengths is a sampling of the continuous spectrum. Compute or precompute outgoing directions from the ray paths; connect wide-scene contributions to the observer's line of sight.

Keep the simulation's observer separate from the explanatory camera. Orbiting the explanatory camera must not silently move the eye or change which rainbow the learner is inspecting. Droplets and ray widths are exaggerated for visibility. This model omits wave-optical effects such as supernumerary bows and does not reproduce every real droplet shape or brightness distribution.

Avoid total internal reflection as a blanket explanation: the primary-rainbow path uses partial internal reflection. Do not show one droplet sending the complete visible color sequence along a single ray into the eye, or a colored tube anchored to the landscape.

Acceptance: ray paths obey the configured refraction rules; the primary and secondary use one and two internal reflections respectively; their color orders differ; moving the observer changes contributing paths; exterior camera movement preserves the selected observer.

## Why 3D

The geometry between Sun, rain, observer, and horizon is central to the lesson. A flat droplet diagram explains refraction but cannot fully show why the bow follows the viewer. This is the second recommended 3D project, with the 2D inset providing the detailed mechanism. A budget-first version can begin with linked plan and side views.

## Research sources

- [Met Office — Rainbows: optical wonders](https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/rainbows): refraction, internal reflection, observer geometry, continuous spectrum, and secondary bow.
- [Met Office — Understanding weather](https://weather.metoffice.gov.uk/learn-about/met-office-for-schools/other-content/other-resources/understanding-weather): observer-dependent rainbow visibility.

Scientific explanations follow these sources; interactions, model rules, and the dimension recommendation are proposed design choices.
