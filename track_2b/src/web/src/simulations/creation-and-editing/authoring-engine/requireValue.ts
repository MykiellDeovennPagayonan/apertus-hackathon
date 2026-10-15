export function requireValue<T>(
  value: T | null | undefined,
  message = "Missing validated reference",
): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}
