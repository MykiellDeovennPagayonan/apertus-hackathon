export function fixtureRun(modelSlug = 'apertus-1.5-8b', id = 'fixture-apertus') {
  return {
    protocolVersion: 1, id, modelSlug, complete: true,
    startedAt: '2026-10-14T01:00:00.000Z', endedAt: '2026-10-14T02:00:00.000Z',
    promptHash: 'a'.repeat(64), configuration: { llm: { model: modelSlug }, capture: { width: 1440, height: 1000 } },
    rows: Array.from({ length: 40 }, (_, index) => ({
      number: index + 1, id: `question-${index + 1}`, prompt: index === 0 ? 'Show me two projectiles and compare their distances at different angles.' : `Experiment question ${index + 1}`,
      status: index === 2 ? 'TIMEOUT' : 'PASS', generationMs: index === 2 ? null : 1000 + index * 100,
      observedMs: index === 2 ? 300000 : 1000 + index * 100,
      screenshot: index === 2 ? null : `/benchmarks/${modelSlug}/${id}/images/question-${index + 1}.png`,
      screenshotAvailable: index !== 2,
      measurements: index === 2 ? null : { terminal: 'created', firstPass: index !== 1, validationReached: true,
        schemaRepairs: 0, composerFeedback: index === 1 ? 1 : 0, deterministicRepairs: 0 },
    })),
  };
}
