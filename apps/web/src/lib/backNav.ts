/**
 * Where a back link goes (plans/UI_FEEL_AUDIT.md §3, "Back navigation").
 *
 * React Router gives the first page of a visit the location key "default". If
 * there is no earlier page inside the app (a shared link, a new tab), going back
 * in history would leave the site, so the link goes to its parent page instead.
 */
export type BackTarget = { kind: "history" } | { kind: "route"; to: string };

export function backTarget(locationKey: string | undefined, fallback: string): BackTarget {
  if (locationKey !== undefined && locationKey !== "default") return { kind: "history" };
  return { kind: "route", to: fallback };
}
