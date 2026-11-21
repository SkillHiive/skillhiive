# SkillHiive web: UI feel audit

**Status:** findings for discussion, 20 November 2026. Nothing here is built. **Scope:** `apps/web`. It complements [WEB_UX_OVERHAUL.md](WEB_UX_OVERHAUL.md): that plan covers structure and broken basics; this one covers how the app *feels* (motion, feedback, consistency, back navigation), plus defects the overhaul plan missed.

**Method:** five read-only code audits (shell and motion, Today/Focus/Project, social pages, rooms, profile/settings/entry) plus a look at the public pages on skillhiive.com. Paths are relative to `apps/web/src` unless they say otherwise.

---

## 1. Why it feels dull

The owner's reference is the navbar ([LinkNav.tsx](../apps/web/src/components/LinkNav.tsx)). It feels alive for three reasons:

1. **One object travels.** A single yellow pill slides its `left`/`width` to the tab under the pointer and returns to the active tab when the pointer leaves (`LinkNav.tsx:41-56, 83, 188-225`).
2. **Every target answers the pointer.** Hover scale 1.075, press scale 0.95, and text colour that changes as the pill passes (`:201-204`).
3. **One easing curve.** `.transition-ui` is 300 ms `cubic-bezier(0.2,0.8,0.2,1)` (`index.css:151`).

The rest of the app has none of the three:

- **Controls don't respond.** There are 1,035 inline `style={{}}` objects and 107 raw `<button>`s, but only 5 `onMouseEnter` handlers. Inline styles cannot express `:hover`. The shared `Button` only dims to 0.92 opacity when pressed (`packages/ui/src/components/Button.tsx:111-127`).
- **Things pop in instead of arriving.**
  - Loading uses spinners only: 18 separate inline `@keyframes spin` blocks and no skeletons.
  - Sections fetch on their own and push each other down. Fake zeros show before the data arrives (Home rail `:173`, profile stats `UserProfile.tsx:238`).
  - Page transitions animate the spinner, not the content: `AuthGate` renders `null`, then the page enters showing a spinner (`AuthGate.tsx:15`, `Layout.tsx:191`).
  - Only 9 pages use `SwipeLayout`. Home, Rooms, Room, Post, Project, UserProfile, Sign, Register and CueLink just pop in.
- **Nothing matches.**
  - Five back-button styles.
  - Three accent systems: the yellow nav, red/orange room cards, and a pre-join screen hard-coded dark.
  - Page tops of 80, 88 or 96 px, and widths of 480, 560, 640 or 800 px.
  - Two UI kits: dead copies in `components/ui/*` alongside `packages/ui`.
  - Three copies of `timeAgo`, and two duration formatters that disagree ("1.5h" vs "1h 30m").
- **Motion tokens exist and nobody uses them.** `packages/brand/src/tokens/motion.ts` defines durations of 80/140/200/300/460 ms, easings and springs. They are emitted as CSS variables but never read, and `useTokens()` doesn't expose them.

## 2. First rule: understood at a glance, with as little text as possible

From the owner: simplicity and instant understanding matter more than anything else, and the less text a thing needs to explain itself, the better. Every proposal below has to pass this test.

1. **If something needs a sentence to explain it, change the design before writing the sentence.** Explanatory captions are a sign the flow is unclear.
2. **Show state; don't describe it.** A lock or globe for visibility, a live dot for "in a room", a filled ring for time. No "Only you can see this…" lines.
3. **One number per fact, in one place,** labelled with a single word or an icon.
4. **Button labels are 1–2 words.** No helper paragraphs under controls; detail goes in a tooltip or behind "⋯".
5. **Empty states:** an icon, one short line and one action.
6. **Confirmations show, not tell.** Before making something public, show a small preview of what visitors will see, not a paragraph listing it.
7. **Progressive disclosure.** Advanced settings (sources, devices, trackers) sit behind one tap, not on the main surface.

Applied to existing UI, this cuts:

- the three explanatory paragraphs in the "From Cue" panel and the Cue settings card;
- "Coded (auto-tracked)" and similar captions on the profile;
- the "mic off" text on room tiles (a dimmed mic icon is enough);
- "Who can see this is set at the top of the page";
- the composer's form fields.

## 3. Proposed feel system (the foundation every page uses)

### Motion vocabulary

1. **One ease** (`--ease-ui: cubic-bezier(0.2,0.8,0.2,1)`) and the brand durations:
   - 80 ms: press-in
   - 140 ms: hover, colour changes and exits
   - 200 ms: moving highlights, dropdowns and page enter
   - 300 ms: sheets
2. **One spring for anything that travels:** stiffness 300, damping 26. It's already copied by hand at `Home.tsx:1853,2041` and `Rooms.tsx:72`; add it to the brand tokens as `spring.ui`.
3. **Small controls** (icon buttons, chips, tabs): hover scale 1.04, press scale 0.97.
4. **Cards and rows:** lift 1 px with a small shadow and a stronger border on hover, press scale 0.99. Large surfaces never scale.
5. **The sliding pill is the signature.** One `<Segmented>` component (framer `layoutId` plus the spring) for every set of tabs or filters: feed filters, profile sections, settings sections, focus ambience and the visibility switch. It follows hover and keyboard focus and settles on the active item.
6. **Pages:** drop `AnimatePresence mode="wait"`. Enter with opacity and an 8 px rise over 200 ms; exit with an opacity-only fade over 120 ms. Scroll to the top on new pages and restore scroll on Back.
7. **Content arrival:**
   - A skeleton shaped like the final layout cross-fades to the content over 140 ms.
   - List items fade in from y = 8 and stagger by 30 ms (at most 6 items).
   - A `layout` animation runs when items move, for example a task moving to Done or an ally card re-ordering.
8. **Focus is the twin of hover.** One `:focus-visible` ring for the whole app, replacing `outline: 0 !important` (`Layout.css:9`), and the nav pill follows keyboard focus.
9. **Reduced motion is respected:** `MotionConfig reducedMotion="user"`. Fades stay; scale and translate go to 0.
10. **Yellow means "primary" or "live" only.** It's never used for back buttons or secondary controls.

### Shared primitives (in `packages/ui`; delete `components/ui/*` duplicates)

- `Pressable` (button, card and row variants)
- `Segmented` (the sliding pill)
- `PageShell`: one header with a back link, title and action slots, one width, one top offset
- `BackLink`
- `Skeleton`
- `EmptyState` (explains the next step in the loop)
- `ErrorState` with Retry and a 10-second time limit
- `Toast` for every write
- `Sheet`, replacing `window.confirm` and `alert` (`Post.tsx:353,359`, `Room.tsx:666,717,755`)
- `Spinner`
- `Avatar` using real image URLs
- one `formatDuration` and one `timeAgo` in `lib/`

Also fix the latent theme bug: `packages/ui` reads `useWebTokens("system")` and ignores the stored theme.

### Back navigation (one pattern)

**Current inventory:**

| Where | Looks like | Does |
|---|---|---|
| `Post.tsx:591` | yellow circle | `navigate(-1)`. It sits inside the author row, whose click opens the profile, so one tap fires two navigations. |
| `Post.tsx:361`, `:416`; `UserProfile.tsx:112`; `PublicProfile.tsx:381`; `Project.tsx:94` | "Go back" text (not-found and after delete) | `navigate(-1)` |
| `UserProfile.tsx:144`, `Project.tsx:126`, `SettingsTrackers.tsx:178` | grey "← Back" | `navigate(-1)` |
| `PublicProfile.tsx:445` | dark glass pill over the banner | `navigate(-1)` |
| `SettingsProfile.tsx:120` | yellow circle plus centred title | `navigate(-1)`. After a username change it lands on `/p/oldname`, which says "not found". |
| `Home.tsx:~980`, `:1182` | "Exit focus" / "Back to plan" | state only, so the browser's Back button leaves `/home` and kills the timer |
| `Room.tsx:904-918` | "Back to rooms" / "Leave" | goes to `/`, then redirects to `/home` |
| `NotFound.tsx` | bare "404" | no way out |

**Proposal:**

- **Behaviour:** `<BackLink fallback=… label=…>` goes back through history when there is in-app history (`location.key !== "default"`). Otherwise it navigates to the fallback with `replace`. Destructive actions and leaving a room always go to a fixed route.
- **Fallbacks:**

  | From | Back goes to |
  |---|---|
  | Post | Allies/Feed |
  | Profile | Today (`/` for guests) |
  | Project | Projects |
  | Settings section | Settings |
  | Room | Rooms |

- **Look:** a 16 px arrow plus the parent's name in secondary text. On hover the arrow nudges 2 px left and the text darkens. Never yellow.
- **Focus mode and opened posts become routes,** so the browser's Back button behaves.

## 3. Page findings

### Today (`pages/Home.tsx`)

- **The same fact shows as different numbers.**
  - Project rows show focus-only minutes (`:412`), so a linked project reads "0m". The From Cue row directly below shows "16h" (`CueProjectsPanel.tsx:147`).
  - The rail's "focus" stat and "Top project" count focus time only (`:139`, `:171`).
- **Project management lives on the daily page** (`:316-453`), and project rows aren't links.
- **Loading and errors:** fake zeros and pop-in while loading. Errors look the same as an empty state.
- **Bugs:**
  - `NewTaskRow` has `autoFocus`, so the phone keyboard opens on page load (`:1434`).
  - A task can't be marked done without entering focus.
  - Carried tasks disappear after one skipped day (`useToday.ts:83`).
  - The rail fetches 365 days but shows 13 weeks.
  - A `visibilitychange` listener is removed from `window` instead of `document` (`:473/476`).
- **Proposal:**
  ```
  Thu 20 Nov · This week 16h 10m · 2-day streak   [week strip ▮▮▯▮▮▯▯]
  What must happen today?
   ○ auth refactor            45m  ⋮
   + Add a task               ⏎
  [ ▶ Start focus · auth refactor     ▾ Solo / Room ]
  Done today (2) ▸   Captures (3) ▸
  Spotlight: skillhiive · 3h this week →
  ```
  - Use framer `Reorder` and `layout` for the task list.
  - The "Start focus" button grows into the focus card (shared `layoutId`).
  - Projects move to `/projects`.

### Focus (`FocusView`, `Home.tsx:846`)

- **The timer is a counter, not timestamps** (`:892`). Background tabs throttle `setInterval`, so a 50-minute session under-counts. `computePhase` in `hooks/sessionPhase.ts` already does this correctly with timestamps; only rooms use it.
- **Leaving throws the session away.** "Exit focus", the browser's Back button and swipe-back all unmount the component and drop the timer. Esc does nothing.
- **"Save & Break" leaves focus mode** (`:945`) instead of starting a break. The switch to break gives no signal beyond the ring's colour.
- **Fake controls:** DND (`:1251`) and every Constraints switch (`:1826`) do nothing.
- **At 375 px:**
  - the bottom bar needs about 550 px and has `overflow:hidden` (`:970,1236`);
  - the capture sheet's buttons need about 390 px (`:2192`).
- **Bugs:**
  - A saved ambience choice shows as active but stays silent (`useAmbience.ts:37`).
  - A capture saved before Start records a 1-minute session (`:933`).
  - Typing in the project field silently creates a new project (`:927`).
- **Proposal:**
  - Make focus a `/focus` route backed by a session provider. Esc and Back return to Today while the session keeps running, shown by a timer chip in the nav.
  - Ask for confirmation only on "End session".
  - Ease the ring's colour into the break over about 320 ms, with an optional chime.
  - Show a toast after a save, for example "Saved to skillhiive · 42m".

### Project (`pages/Project.tsx`, `components/CodingTime/*`)

- **Up to four different time numbers on one page.**
- **Cue time is hidden from owners who have Wakatime connected** (`:187`).
- **Errors show as "Project not found."** (`:78`). The full-screen spinner has no time limit.
- **Pills:** the same inline pill style is copied in `CueProjectsPanel.tsx:91` and `ProjectCueSources.tsx:71`, with no hover state.
- **Emoji used as icons:** ⚡ and ⚠.
- **Proposal:**
  ```
  ← Projects        skillhiive        [Only you ▾]
  16h 10m coded · 3 sessions · 4 shipped
  ▁▃▅▂▇ 12-week strip   Languages ▬▬▬
  Shipped timeline (grouped by date)
  Sources: Cue on mbp, desktop  [Add from Cue ▾]
  ```

### Feed (`Feed.tsx`, `feed/PostCards.tsx`, `ActionRow.tsx`)

See also the feed decisions still open in the session: allies-only, activity vs posts, presence, likes, layout.

- **The person's words are the weakest thing on the card.** The caption is italic, tertiary-coloured and cut to 2 lines (`PostCards.tsx:251`). Badge pills carry the most visual weight (`:155,221`).
- **Nothing moves.**
  - New posts, publishing and changing a filter all swap the list for a spinner (`Feed.tsx:693,866`).
  - Cards are clickable `div`s with no hover state and no keyboard access.
- **Likes:**
  - No animation, and the button is disabled while the request runs.
  - 20 requests for 10 cards: each card runs its own `getUser` and likes query (`ActionRow.tsx:27-46`).
  - The count never updates (`useState(likes)`, `:21`).
- **The composer is a résumé form** (title, dates, Offer fields).
- **Share links fail for signed-out people:** `/post/:id` requires sign-in (`Layout.tsx:119`).
- **Author links go to `/profile/:uuid`,** not `/p/:username`.
- **Vanity numbers:** "N dispatches" and like counts.
- **Two directions** (details in the session):
  - **A:** a day-grouped timeline with a presence strip and a "2 new · Show" pill.
  - **B:** one card per ally, showing presence, a 7-day sparkline and their latest shipped note.
  - **Hybrid:** B as a header strip, A below it.

### Post (`Post.tsx`)

- **The back button fires two navigations** (`:583-593`).
- **The 8-second poll overwrites an edit in progress** (`:282-285, 302`).
- **The fixed nav covers the sticky header.** There's no `paddingTop`, so the back button is hidden on phones (`:459,465`).
- **Going back remounts Feed** (routes are keyed by path), which refetches and loses the scroll position. Post also has no page transition.
- **The author row is mirrored** compared with the feed cards.
- **Comments:** sending waits for a full refetch, deleting uses `window.confirm`, errors are dropped, and the Reply link is 11 px.
- **Proposal:** open a post as a sheet over the feed (background-location route). Add comments optimistically. Pause polling while editing. Make posts readable without signing in.

### Notifications (`Notifications.tsx`, `NotificationBell.tsx`, `NotificationList.tsx`, `useNotifications.ts`)

- **The list flashes to a spinner every 30 seconds:** each poll sets `loading=true` (`useNotifications.ts:51`, `NotificationList.tsx:46`).
- **Bell and page keep separate state.**
- **Only ally requests notify.** Replies and "accepted your request" never do.
- **Accept/Decline** has no error handling and no exit animation.
- **Rows are `div`s**, and the dropdown is off-screen on phones.
- **Proposal:** one shared context, background refresh, more notification kinds, and AnimatePresence for decided cards.

### Messages (`Messages.tsx`)

An unrouted "coming soon" placeholder. Delete it until DMs are planned.

### Rooms lobby (`Rooms.tsx`, `ui/WorkRoomCard.tsx`, `useActiveRooms.ts`, `RoomLobby.tsx`)

- **Card clocks are wrong.** The cards read `timerSeconds`/`breakSeconds`, but Rooms passes `phaseStartedAt`/`phaseDurationMs` (`Rooms.tsx:290-305`, `WorkRoomCard.tsx:166,202`). Every card counts down from 25:00 or 5:00, and the progress bar starts full.
- **Rooms that haven't started look empty**, with no Join button, even when people are inside. `EmptyCard` ignores `onStart`.
- **Avatars are initials on hard-coded colours**, although avatar URLs exist.
- **The count shows twice, and there's no "full 12/12".** You only find out a room is full after the camera preview.
- **Creating a room with an existing name silently joins it** (`Rooms.tsx:174`).
- **Pre-join copy is wrong:** "Mic locked until session starts", but the mic actually unlocks at the break (`RoomLobby.tsx:135,166`). The pre-join screen ignores the light theme.
- **Proposal:**
  - Cards use the server phase through `computePhase` and show a real ring.
  - Real avatars and a full state.
  - The whole card is pressable.
  - The list animates with AnimatePresence and `layout`.
  - Pre-join becomes a sheet over the lobby showing who's inside and when the break is.

### Live room (`Room.tsx`, ~3000 lines)

- **The 50/10 clock, the core of the product, is a tiny 11 px badge** (`:1599-1619`).
- **Calm states look like errors.** Red "MIC OFF" chips on every tile during focus, a red mic button, and "MUTED / In meeting" in the sidebar (`:2181-2198, 2871, 2742, 2790`).
- **People with the camera off probably don't appear:** `useTracks([Camera])` has no placeholders (`:1677`). Tiles show raw usernames.
- **Controls that don't work:**
  - the speaker picker never switches the output device (`:148`);
  - "Rear Cam" shows on desktop;
  - End leaves instantly;
  - buttons are square boxes, unlike the rounded nav.
- **Native dialogs and invites:**
  - cubicle invites use `window.confirm`;
  - double-tapping a tile sends an invite with no confirmation;
  - "Requesting" has no UI, no cancel and no time limit, so you can get stuck.
- **The global nav floats over the room's top bar.**
- **Presence is written when the page mounts, before Join** (`:209` vs `:762`). A camera preview adds you to the room and starts its clock, and a room-full rejection leaves your row behind.
- **The token fetch can take about 15 seconds with no progress** (`:291-338`). A dropped connection sends you home with no message (`:651-659`), and LiveKit's Reconnecting events aren't used.
- **Duplication:** two copies of the spinner screen, about 7 avatar renderings, hand-drawn SVG icons and duplicated listener teardown.
- **Proposal** (as in overhaul §3.7):
  - **Focus:** a large centred ring, small tiles, and "mic resting · 12m to break".
  - **Break:** tiles grow, a "Mic open" pill slides up, and an optional chime plays.
  - **Room UI:** the nav is hidden inside a room; one rounded control pill with the sliding highlight; avatar tiles for people with the camera off; an invite sheet with a countdown.
  - **Leaving:** a "52 min with 4 people · what did you ship?" summary that leads into the capture sheet.
  - **Connection:** a "Reconnecting…" banner over the frozen room.
  - **Room full:** "Notify me when a seat opens".

### Profile (`UserProfile.tsx`, `PublicProfile.tsx`, `CodingTimeProfileCard.tsx`)

Seen on the live site:

- **Contradicting numbers:** "0m focus · 0 sessions · 0d streak" appears above "20h 32m coded · 1d coding streak".
- **Two heatmaps that look empty.**
- **Language bars total about 30 minutes against 20 hours coded.** Only some activity carries a language.
- **At 375 px:** the username overflows and the heatmap gets its own horizontal scrollbar.

From the code:

- **Avatar and banner can't be changed anywhere.** The upload and crop flow lives only in the unrouted `Profile.tsx:154-180`.
- **No ally button on `/p/:username`.**
- **Network errors look like "@x not found."** (`lib/todayData.ts:343`).
- **Wrong labels and counts:**
  - the coding heatmap's tooltip says "focus" (`Heatmap.tsx:98`);
  - "Posts" counts only the loaded page;
  - "View on Wakatime" shows for Cue users.
- **The owner gets no empty states;** sections are simply hidden.
- **Ally actions:** they fail silently, can't be undone, and use "FORM ALLIANCE" with a swords icon.
- **The heatmap's `onDayClick` exists but nothing uses it.**
- **Proposal:** one profile at `/p/:username`.
  - Skeletons shaped like the final layout, and stats that count up once.
  - Clicking a heatmap day opens a popover with that day's sessions, coding time and what shipped.
  - Section tabs use the sliding pill.
  - The owner edits in place and gets "View as visitor".

### Settings (`SettingsProfile.tsx`, `SettingsTrackers.tsx`, `CueCard.tsx`)

- **Cue-only users can't make their coding time public.** The switch renders only in the Wakatime branch (`SettingsTrackers.tsx:214,309-331`), yet the profile card points to it.
- **Failed saves are silent** (`profileContext.tsx:111`). Status messages show a green check even for errors (`SettingsTrackers.tsx:442`).
- **Disconnect** has no confirmation and no accessible label.
- **Accessibility:**
  - clickable `div` rows;
  - the modal has no `role="dialog"`, no Esc and no focus trap;
  - inputs have no labels.
- **Proposal:** one `/settings` page with a section list (sliding pill), inline editing with "Saved ✓", and a coding-visibility switch that works for any source.

### Sign-in, Register and CueLink

- **A new Cue user loses their link code.** CueLink offers only "Sign in", the Register link drops `?next`, and the confirmation email doesn't come back to `/link`.
- **Register:**
  - there's no `<form>`, so Enter does nothing, and the labels are empty;
  - the username is lowercased in the auth metadata but not in the profile row;
  - a failed profile insert only warns.
- **Sign-in:**
  - no heading;
  - the error box floats over the video;
  - raw Supabase errors are shown, and the "enter email" error disappears after 5 seconds;
  - no `autoComplete`.
- **CueLink:**
  - a network error reads as "code isn't valid";
  - there's no way to enter a new code;
  - there's no "Not me" option;
  - the done step leads only to the devices list.
- **"Check your inbox" is a dead end:** 10 px text, no resend.
- **Proposal:** one card-based auth shell shared by Sign, Register, Reset and CueLink (CueLink is the best page today). Carry `next` all the way through. Separate "Couldn't reach SkillHiive · Retry" errors from real ones.

### Landing and small pages

- **The landing never shows the proof:** no sample heatmap. The Footer has no links. Hero ignores reduced motion. The easter-egg overlay can't open.
- **NotFound** is a bare "404".
- **Leftovers:**
  - `/learn` is still routed though the nav hides it;
  - `components/User.tsx` is unused and hard-codes a username;
  - signed-out visitors see a nav "Profile" link that goes to the login page.
- **Cursor:**
  - `cursor:none` fights 90 inline `cursor:"pointer"` styles, so the hand appears next to the yellow dot on some buttons only;
  - the glow eases per frame and its loop runs forever, even on touch screens.

## 4. Defects that need no design decision

These can be fixed before the redesign; each one is independent of it:

1. Rooms lobby clocks and progress bars (`Rooms.tsx:290`, `WorkRoomCard.tsx:166,202`).
2. Room presence written before Join, and left behind after a room-full rejection (`Room.tsx:209,762`).
3. Room cubicle "requesting" gets stuck, with no cancel or time limit (`Room.tsx:389,393`).
4. Post back button fires two navigations; the poll overwrites edits; the header sits under the nav (`Post.tsx:282-302,459-593`).
5. Notifications flash every 30 seconds (`useNotifications.ts:51`).
6. Focus timer under-counts in background tabs, using a counter instead of timestamps (`Home.tsx:892`).
7. Today `autoFocus` on phones; carried tasks lost; the `visibilitychange` listener leak (`Home.tsx:1434,473`; `useToday.ts:83`).
8. Cue-only coding-visibility switch missing (`SettingsTrackers.tsx:214`).
9. Silent failed saves in Settings (`profileContext.tsx:111`).
10. Register: Enter does nothing, empty labels, username lowercasing mismatch (`Register.tsx:136-148,447-461`).
11. CueLink: network error shown as an invalid code; `next` lost through Register (`lib/cue.ts:145`, `Sign.tsx:284`).
12. Like counts never update; 20 requests per 10 cards (`ActionRow.tsx:21,27-46`).
13. Pre-join mic copy (`RoomLobby.tsx:135,166`).
14. Coding heatmap tooltip says "focus" (`Heatmap.tsx:98`).
