# Pre-refactor compatibility fixtures

Captured on 2026-10-05 from the original builder sources before refactor 008. The fixture generator read the preserved source snapshot; these records are literal baseline data rather than outputs regenerated from the current constructors.

`documents.json` contains 16 original serialized inputs and their expected in-memory migration results: legacy recipes, version-1 line/town scenes, version-2 workspaces, detached drafts, multiple canvases, pair measurements, groups, saved positions, arbitrary shading, and permissions. Opening/validation must preserve each source; explicit migration must match the recorded result.

`town.json` contains an authored town's exact route results and timeline snapshots, including interrupted departures and building destinations. These compare canonical search/schedule execution with the original authored behavior. Existing simulation tests separately cover premade street routing and obstacle policies.
