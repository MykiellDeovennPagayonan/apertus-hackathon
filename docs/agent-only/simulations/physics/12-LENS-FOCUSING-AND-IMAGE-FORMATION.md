# Lens focusing and image formation

Date: 2026-10-11  
Status: Researched proposal; not implemented by this document.  
ID: PHYS-12

## Human prompt

> Why does a magnifying glass sometimes make things look bigger and sometimes turn them upside down?

## What the simulation does

Use a converging lens to connect object position with image position, orientation, and size. Distinguish a real image that can appear on a screen from a virtual image located by ray extensions.

## Learner experience

Place an upright object to the left of a thin lens. Drag it toward and through the focal-distance boundary. Trace principal rays, show their extensions when needed, and place a movable screen only where a real image can form.

## Learning goals

- Distinguish real and virtual images.
- Relate focal length and object distance to magnification and orientation.

## Objects and controls

- Positive object distance and lens focal length.
- Object height and screen position.
- Principal rays, virtual-ray extensions, image labels, and reset.

## Model and observations

Use 1/f = 1/d_object + 1/d_image and magnification m = −d_image/d_object. Choose f > 0 for the initial converging lens; negative d_image denotes a virtual image. At d_object = f, outgoing rays are parallel and there is no finite image location. [OpenStax — Thin Lenses](https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses).

## Example investigation

For f = 10 cm and object distance 30 cm, the image is real at 15 cm and half-size inverted. At object distance 5 cm, the image is virtual at −10 cm and twice-size upright.

## Scope and limitations

Use paraxial thin-lens optics, excluding aberrations and finite-thickness effects. Avoid drawing an image at a clipped arbitrary position near the focal singularity. A magnifying glass's perceived angular size also depends on the viewer; label the scene as lens image geometry.

## Relationship to the existing application

Rainbow ray refraction exists, but the app has no lens imaging, screen focus, or image-distance model. This gap was checked against the current premade registry, public component catalogs, and domain models; it is a source-level inventory, not a live prompt-acceptance test.

## Research sources

Reviewed on 2026-10-11. The sources support the subject matter; the proposed scene, controls, and lesson sequence are design recommendations.

- [OpenStax — Thin Lenses](https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses) — Thin-lens image distance, magnification, and ray construction.
