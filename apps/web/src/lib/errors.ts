/** The `message` of anything that was thrown, or undefined. Supabase errors are plain objects, not Error instances. */
export function errorMessage(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}
