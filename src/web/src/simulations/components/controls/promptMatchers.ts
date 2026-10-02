export function matchesAny(prompt: string, keywords: string[]): boolean {
  const p = prompt.toLowerCase();
  return keywords.some((k) => p.includes(k));
}

export function matchRules<T extends { pattern: RegExp }>(
  prompt: string,
  rules: T[],
): T | null {
  return rules.find((r) => r.pattern.test(prompt)) ?? null;
}
