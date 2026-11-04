import { z } from "zod";

/** Branded type helper for IDs */
export const branded = <T extends string>(name: string) =>
  z.string().uuid().brand(name);

/** ISO timestamp string */
export const isoTimestamp = z.string().datetime({ offset: true });

/** ISO date string (YYYY-MM-DD) */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Non-empty string */
export const nonEmptyString = z.string().min(1);

/** Optional non-empty string */
export const optionalNonEmptyString = z.string().min(1).optional().nullable();

/** Positive integer */
export const positiveInt = z.number().int().positive();

/** Non-negative integer */
export const nonNegativeInt = z.number().int().nonnegative();

/** Email */
export const email = z.string().email();

/** URL */
export const url = z.string().url();

/** JSON value - using type annotation to avoid circular reference */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ])
);