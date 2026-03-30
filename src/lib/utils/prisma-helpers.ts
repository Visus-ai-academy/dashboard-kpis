import { Prisma } from "@prisma/client";

/**
 * Converts a Prisma Decimal to a plain JavaScript number.
 * Use this in all API responses to ensure JSON serialization works correctly.
 */
export function toNumber(
  value: Prisma.Decimal | number | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}
