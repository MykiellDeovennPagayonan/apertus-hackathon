# Natural selection and generation spawning

Date: 2026-10-10  
Status: Proposed simulation concept.

## Concept

How can a population change across generations when individual organisms do not choose to adapt?

Learners watch little dots representing fictional organisms. Each dot has an inherited camouflage trait, displayed as a shade from light to dark. Against a light habitat, lighter organisms have a higher probability of surviving a predation phase. Survivors produce offspring that inherit their shade, occasionally with a random mutation. The next generation visibly spawns, and the population's distribution of shades changes over repeated generations.

The learner can darken the habitat and investigate whether previously uncommon dark organisms leave more descendants. Individuals do not change shade to match the habitat. Evolution appears as a change in inherited trait frequencies across generations, through variation, inheritance, and differences in reproductive success.

This is a deliberately simplified teaching model, not a realistic predator or species forecast. Its scientific framing follows [OpenStax's explanation of natural selection](https://openstax.org/books/biology-2e/pages/18-1-understanding-evolution) and [MedlinePlus Genetics on inherited variation and evolution](https://medlineplus.gov/genetics/understanding/mutationsanddisorders/evolution/).

## Dot-based experience

Begin with 100 organisms spread across a habitat. Their shades range from light to dark. Use one dot per organism, and keep shade tied to the inherited trait rather than recoloring dots to indicate unrelated statuses.

Show the generation number and current phase: **living population, survival, reproduction, offspring spawning**. During survival, dots that die fade out with an optional death marker. During reproduction, survivors briefly show connections to their offspring. New dots appear near their parent, then spread into the habitat as a presentation animation. Movement does not affect survival in the first version.

After reproduction, retire the parent generation and retain only offspring. Do not silently count parents as newborn members of the next generation. Let learners pause on the parent-and-offspring view to compare inherited shades and spot mutations before advancing.

Selecting an organism reveals its ID, generation, parent ID, inherited shade, mutation status, survival outcome, and offspring admitted to the next generation. Provide a lineage view for following descendants across several generations. Use outlines and symbols to highlight selections and mutations without overwriting trait color. Numeric trait values and a labeled distribution chart supplement the shades.

## Starting rules

Use non-overlapping generations and single-parent reproduction for the first version. Sexual reproduction and multiple genes are later extensions.

1. **Initial variation:** create 100 organisms with a recorded random seed and trait values between 0 (light) and 1 (dark). Default to a broad uniform starting distribution.
2. **Habitat:** set a background value between 0 and 1, initially 0.1. Apply habitat changes at generation boundaries.
3. **Survival:** give each organism probability `0.2 + 0.6 * (1 - abs(trait - habitat))` of surviving. Sample once per organism per generation. This illustrative rule ranges from 20% to 80% survival and favors closer camouflage matches without guaranteeing any individual's outcome.
4. **Reproduction:** each survivor proposes two offspring. Each offspring normally copies its parent's trait exactly.
5. **Mutation:** independently give each offspring a 5% chance of a mutation. Add a uniformly sampled change between -0.1 and +0.1, clamped to the trait range. Mutation direction does not depend on what would improve camouflage.
6. **Population limit:** if proposed offspring exceed 200, select 200 uniformly at random without replacement. This represents a simple population limit, not a detailed food or habitat model. Record both proposed births and admitted offspring; do not silently discard births.
7. **Next generation:** replace the parent cohort with admitted offspring. If there are no offspring, record extinction and stop. Never automatically repopulate the habitat.

These probabilities and limits are teaching defaults, not measured biological parameters. Document the whole rule set with every run. The population limit can change reproductive outcomes through random sampling as well as selection.

## Learner controls

- Initial population size, trait distribution, and random seed.
- Habitat shade and a scheduled habitat change at a selected generation.
- Mutation probability and mutation size.
- Population limit and offspring per survivor.
- Selection enabled or disabled.
- Step phase, next generation, autoplay, pause, restart, and replay.

When selection is disabled, use the same survival probability of 50% for every trait while retaining inheritance, mutation, and reproduction. This supplies a comparison where random sampling can change trait frequencies without camouflage-based survival differences. Preserve initial organisms and seeds for paired comparisons, while recognizing that diverging populations prevent identical individual histories indefinitely.

## Core investigations

1. **Selection from existing variation:** disable mutation and run a varied population in a light habitat. Observe which inherited traits become more common.
2. **Environmental change:** switch the habitat from light to dark at a recorded generation boundary. Follow changes in the distribution without changing existing organisms' traits.
3. **No starting variation:** give everyone the same trait with mutation disabled. Selection cannot create new trait values, even if that trait poorly matches the habitat.
4. **Mutation and inheritance:** enable mutation in a uniform starting population. Inspect new variants and their descendants; not every mutation improves survival or persists.
5. **Selection versus drift:** compare trait-dependent survival with the selection-disabled setting. Repeat runs, especially with small populations, to observe chance-driven differences.

## Observation and learning goals

Show population size, births, deaths, surviving parents, admitted offspring, and a trait histogram for every generation. Track mean trait and variation, but preserve the full distribution so an average does not conceal distinct groups. Record reproductive success as offspring admitted per parent rather than assuming that survival alone measures it.

Learners should be able to explain that:

- Natural selection requires relevant variation, inheritance, and differences in reproductive success.
- Individuals survive and reproduce; populations evolve across generations.
- Mutation introduces variation without anticipating what the environment requires.
- A trait's advantage depends on the environment rather than being universally best.
- Chance can affect survival and inheritance even when selection is operating.
- A population can lose variation or become extinct; adaptation is not guaranteed.

Keep the biological model independent of animation speed and frame rate. Store generation events and lineage records so replay spawns the same recorded offspring without rerunning random decisions.
