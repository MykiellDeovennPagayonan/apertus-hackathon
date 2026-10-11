# Shared fishing lake and overfishing

Date: 2026-10-10  
Status: Proposed simulation concept.

## Concept

Can five fishermen earn a living from the same lake without emptying it?

The lake starts with 2,000 fish. Each day, it produces one new fish for every 100 fish already present. Initially, that means 20 new fish per day, enough for each of five fishermen to catch four fish while keeping the population stable.

Each fisherman chooses how much to catch. Taking extra fish increases that person's catch immediately, but reduces the population that produces tomorrow's fish. If the lake falls to 1,500 fish, it produces only 15 new fish per day. Four fish each is no longer sustainable. Learners watch how individual choices change everyone's future opportunities.

The scene shows the lake, five fishermen, daily catches, and the remaining population. A shared timeline shows fish population, reproduction, and total catch. Each fisherman has an inspectable catch history and accumulated catch. Fish icons may represent groups of fish; the displayed population remains authoritative.

The central investigation is human cooperation: do people follow a shared limit when they can benefit from taking more, and what makes an agreement last? Fishermen can have different household needs, goals, and responses to other people's catches. These are explicit simulation assumptions, not predictions about real people.

## Daily rules and starting setup

- Starting stock: 2,000 fish; five fishermen; reproduction rate: 1% of the opening population per day.
- Reproduction happens first. New fish equal `floor(opening population / 100)`; fractional reproduction is discarded in the first version.
- Fishermen choose their requested catches using the same opening-day information. No fisherman sees another's current choice before submitting their own.
- Requested catches are resolved together after reproduction. Actual total catch cannot exceed the available fish. If requests exceed availability, allocate proportionally using whole fish, with remaining fish assigned by a recorded rotating tie-break order.
- Closing population equals opening population plus new fish minus actual total catch. It becomes the next day's opening population.
- Four fish each maintains the initial 2,000-fish stock exactly. This is a starting sustainable equal share, not a permanent quota or an established optimum.
- Zero fish produces zero new fish. Stocks below 100 also produce no new fish under this whole-fish rule; make that rounding consequence visible.

This is a deliberately simplified reproduction model. It excludes natural mortality, age structure, seasons, and carrying capacity. Without harvesting, the stock can grow without an ecological ceiling. Keep the initial teaching runs bounded, and treat a more realistic ecology as a separate extension rather than silently changing the user's reproduction rule.

## Human behavior and learner controls

Start with an editable four-fish target for every fisherman. Let learners introduce one fisherman requesting more, then explore responses from the others. A catch target is distinct from an enforced quota.

Useful behavior settings include following an agreement, seeking a larger immediate catch, matching others' previous catches, and reducing one's catch when the stock declines. Give each fisherman visible household needs so cooperation can have different personal costs. Do not treat higher need as automatically causing overfishing.

Compare three arrangements with the same starting stock and fisherman profiles:

1. **Private catches:** fishermen know the lake population and their own history, but not each other's individual catches.
2. **Public catches:** yesterday's individual catches are visible, allowing decisions based on past behavior.
3. **Shared agreement:** fishermen propose a catch limit and choose whether to follow it. An optional enforced quota can then show how an agreement differs from a binding rule.

Learners can adjust catch targets, needs, visibility, and agreement rules before a run; advance one day, autoplay, pause, and restart. Begin with explicit behavior rules so comparisons are reproducible. AI negotiation can be added later through the shared agent foundation, with the application enforcing legal catches and population updates.

## Observation and comparison

Show daily and cumulative catches per fisherman, population, daily reproduction, total harvest, and unmet household needs when configured. Highlight days when harvest exceeds reproduction. Compare individual gains with the town's cumulative catch and remaining stock over the same time horizon.

Useful experiments include everyone catching four, one fisherman catching eight while the others catch four, others responding by also taking more, and the town lowering catches to allow recovery. Preserve starting conditions and random seeds where randomness is used. Record interventions so learners can explain when and why outcomes diverged.

No outcome should be labeled the best solely because it maximizes catch. Maintaining the stock, meeting needs, distributing catches fairly, and enforcing agreements are different goals.

## Learning goals

- Explain how a shared renewable resource can be depleted by individually beneficial choices.
- Calculate the initial sustainable equal share and explain why it changes with population.
- Distinguish an agreed catch target from an enforced quota.
- Explore how trust, visibility, reciprocity, and unequal needs affect cooperation.
- Compare immediate personal gains with collective outcomes over time.
- Recognize the assumptions and rounding limits of the reproduction model.
