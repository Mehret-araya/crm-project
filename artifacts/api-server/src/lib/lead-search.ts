export function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isDecimalIntegerString(value: unknown): boolean {
  return typeof value === "string" && /^\d+$/.test(value);
}

export function isOptionalDecimalInteger(value: unknown): boolean {
  return value === undefined || isDecimalIntegerString(value);
}
