# Doppler effect and passing sound sources

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-14

## Human prompt

> Why does an ambulance siren change pitch as it passes me?

## What the simulation does

Make the changing spacing of wavefronts from a moving source visible. A receiver records arrivals so perceived frequency is linked to the wave pattern rather than distance alone.

## Learner experience

Show an ambulance moving along a straight road and a stationary observer. Emit expanding wavefronts at fixed intervals. Compare compressed wavefronts ahead with stretched wavefronts behind, then plot arrival frequency as the source passes.

## Learning goals

- Separate emitted frequency from received frequency.
- Explain why approach and recession produce opposite shifts.

## Objects and controls

- Source frequency, subsonic source speed, and observer location.
- Stationary-source baseline and wavefront overlay.
- Play/pause, count arrivals, inspect frequency, and reset.

## Model and observations

Emit wavefront circles centred on the source position at their emission time; each expands at medium speed c. For directly collinear approach to a stationary observer, f_received = f_source c/(c − v_source); recession uses c + v_source. For a roadside observer, use the changing line-of-sight geometry or wavefront arrival times. [OpenStax — The Doppler Effect](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect).

## Example investigation

With c = 343 m/s, f_source = 700 Hz, and source speed 20 m/s, collinear approach gives about 743 Hz and recession about 661 Hz.

## Scope and limitations

Keep source speed below c; supersonic motion requires a shock-wave lesson. Near a roadside pass the line-of-sight component changes smoothly, so do not apply an instantaneous collinear frequency jump. Audio, if added, must match the arrival model.

## Relationship to the existing application

Existing sound superposition compares fixed sampled signals; it has no moving emitter, spatial wavefronts, or receiver-arrival model. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — The Doppler Effect](https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect) — Moving sources and observers in a wave-carrying medium.
