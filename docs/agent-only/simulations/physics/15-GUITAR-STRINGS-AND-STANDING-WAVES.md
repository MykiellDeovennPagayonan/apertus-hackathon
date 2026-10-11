# Guitar strings and standing waves

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-15

## Human prompt

> Show me why pressing a guitar string at a different fret changes the note.

## What the simulation does

Compare the standing-wave patterns supported by strings with different vibrating lengths and tensions. Learners inspect stationary nodes and see why a shorter speaking length raises frequency.

## Learner experience

Start with an ideal string fixed at both ends. Choose a harmonic and play its displacement animation. Move a fret contact to shorten the vibrating section, then compare the fundamental frequency and spatial wave pattern before and after.

## Learning goals

- Identify nodes, antinodes, and harmonic modes.
- Connect length, tension, and linear density with frequency.

## Objects and controls

- Vibrating length, tension, linear mass density, and harmonic number.
- Fret position and mode overlay.
- Slow visual playback; optional correctly pitched audio; reset.

## Model and observations

Wave speed is c = sqrt(T/mu), and fixed-end frequencies are f_n = n c/(2L). A mode shape is proportional to sin(nπx/L), with time factor cos(2πf_n t). Keep both fixed endpoints at zero displacement and distinguish physical frequency from slowed display time. [OpenStax — Standing Waves and Resonance](https://openstax.org/books/university-physics-volume-1/pages/16-6-standing-waves-and-resonance).

## Example investigation

For L = 0.65 m, T = 65 N, and mu = 0.005 kg/m, the fundamental is approximately 87.7 Hz. Halving L doubles it to approximately 175.4 Hz.

## Scope and limitations

Use an ideal flexible string with constant tension. Real fretting can alter tension, and string stiffness and instrument bodies affect sound. A pure mode demonstration is not the full transient motion of a plucked string.

## Relationship to the existing application

The spring oscillator and sound-signal sum do not represent spatial string modes, endpoint constraints, or fret-controlled length. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Standing Waves and Resonance](https://openstax.org/books/university-physics-volume-1/pages/16-6-standing-waves-and-resonance) — Fixed-end string modes, nodes, and harmonic frequencies.
