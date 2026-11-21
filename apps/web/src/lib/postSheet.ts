import { useState } from "react";
import { useLocation, type Location } from "react-router";

/**
 * Opening a post from the feed shows it in a sheet over the feed (the "background
 * location" pattern): the feed's location rides along in history state, the app keeps
 * rendering the feed at that location, and the post renders on top. The URL is still
 * /post/:id, so it can be copied; a refresh or a shared link shows the full page.
 */
export interface PostSheetState {
  backgroundLocation: Location;
  /** Focus the reply box once the post is open (the feed card's comment button). */
  focusComment?: boolean;
}

/** The state to navigate with to open a post as a sheet over `from`. */
export function postSheetState(from: Location, extra?: { focusComment?: boolean }): PostSheetState {
  return { backgroundLocation: from, ...(extra?.focusComment ? { focusComment: true } : {}) };
}

function isLocation(value: unknown): value is Location {
  return !!value && typeof value === "object" && typeof (value as Location).pathname === "string";
}

/** The location the sheet sits over, if the state carries one. */
export function backgroundFrom(state: unknown): Location | null {
  const bg = (state as { backgroundLocation?: unknown } | null)?.backgroundLocation;
  return isLocation(bg) ? bg : null;
}

/**
 * Whether to honour a background location. History state survives a refresh, so the
 * location the app first loaded at never opens as a sheet: there is no feed underneath
 * yet, and a refresh should show the full page. Once the visitor has moved around, it may.
 */
export function honourBackground(locationKey: string, firstKey: string, moved: boolean): boolean {
  return moved || locationKey !== firstKey;
}

/**
 * The page a post sheet sits over, or null. The first location of a visit never counts
 * (see honourBackground), so a refreshed post shows as a full page.
 */
export function useBackgroundLocation(): Location | null {
  const location = useLocation();
  const [firstKey] = useState(location.key);
  const [moved, setMoved] = useState(false);
  if (!moved && location.key !== firstKey) setMoved(true);
  const background = backgroundFrom(location.state);
  return background && honourBackground(location.key, firstKey, moved) ? background : null;
}
