/**
 * What shows while a page's code or the session is still loading. The spinner fades
 * in after a short delay, so fast loads don't flash anything at all.
 */
export default function PageFallback() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <span aria-hidden="true" className="delayed-fade">
        <span className="block size-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-text-primary)]" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
