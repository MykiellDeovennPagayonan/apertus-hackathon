export function requireRecord<T>(value: T | undefined): T {
  if (value === undefined)
    throw new Error("The selected record is no longer available");
  return value;
}
