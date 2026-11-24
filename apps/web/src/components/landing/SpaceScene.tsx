import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  FULL_LOGO_ASPECT,
  growRoundMark,
  logoAt,
  MARK_ASPECT,
  MARK_TILES,
  markAt,
  PICK_RELEASE_PX,
  pointerChose,
  sceneBoxes,
  sceneProgress,
  SPACE_ZONES,
  tileRect,
  timeline,
  zoneAtSticky,
  type SpaceZone,
  type ZoneOwner,
} from "@/lib/spaceScene";
import { LogoMark } from "./LogoMark";
import logoFull from "@/assets/landing/logo-full.webp";
import logoLetters from "@/assets/landing/logo-full-letters.webp";

/**
 * The noise everywhere else: where each card sits (percent of the stage) and how far it tilts.
 * Fourteen of them, one for each square of the mark they become.
 */
const NOISE: { x: number; y: number; r: number; kind?: "quote" | "ad" | "red"; head?: string; body: string; foot?: string }[] = [
  { x: 54, y: 24, r: -4, kind: "quote", body: "“Your only limit is your mindset.”", foot: "4,212 likes" },
  { x: 18, y: 30, r: 3, kind: "ad", head: "Sponsored", body: "Hire a coach for your personal brand." },
  { x: 72, y: 40, r: 3, head: "Jordan D. · Thought leader", body: "Thrilled to announce I'm humbled to be starting a new journey. Agree?", foot: "2,431 reactions · 318 comments" },
  { x: 88, y: 20, r: 6, kind: "red", body: "99+" },
  { x: 36, y: 46, r: -2, kind: "ad", head: "Sponsored", body: "10x your productivity with this one weird morning routine." },
  { x: 50, y: 56, r: -8, kind: "red", body: "212 day streak. Don't break it." },
  { x: 64, y: 70, r: -5, head: "Suggested for you", body: "People you may know: 48 new" },
  { x: 24, y: 64, r: 2, head: "Trending", body: "5 habits every millionaire has before 5am." },
  { x: 48, y: 90, r: 5, head: "Like if you agree", body: "Nobody talks about this but..." },
  { x: 84, y: 60, r: 4, head: "Who viewed your profile", body: "37 people this week. See who." },
  { x: 10, y: 46, r: -4, kind: "red", body: "You have 14 new notifications" },
  { x: 92, y: 80, r: -6, kind: "red", body: "3 new followers" },
  { x: 12, y: 84, r: 3, kind: "quote", body: "“Hustle in silence. Let success make the noise.”" },
  { x: 78, y: 88, r: -3, kind: "ad", head: "Promoted", body: "Become a top voice in 30 days." },
];

const ZONE_LABEL: Record<SpaceZone, string> = {
  rooms: "rooms",
  cubicle: "cubicle",
  break: "break room",
  desk: "your desk",
  wall: "your wall",
};

/** One line and a piece of the real app for each area of the space. */
const DETAIL: Record<SpaceZone, { title: string; line: string; ui: ReactNode }> = {
  rooms: {
    title: "Work beside people.",
    line: "Live rooms, camera on or off. Quiet while everyone focuses. Never recorded.",
    ui: (
      <>
        <span className="lp-row lp-mono">
          <b>deep-work</b>
          <span>focus · 38:12</span>
          <span className="end">4 of 12</span>
        </span>
        <span className="lp-tiles">
          <span className="lp-tile cam" />
          <span className="lp-tile" />
          <span className="lp-tile cam" />
          <span className="lp-tile cam" />
          <span className="lp-tile" />
          <span className="lp-tile open" />
        </span>
      </>
    ),
  },
  cubicle: {
    title: "Talk to one person.",
    line: "Pull someone aside for a few minutes, even mid focus. The room stays quiet.",
    ui: (
      <>
        <span className="lp-row lp-mono">
          <b>cubicle</b>
          <span className="end">04:12</span>
        </span>
        <span className="lp-tiles two">
          <span className="lp-tile cam" />
          <span className="lp-tile" />
        </span>
      </>
    ),
  },
  break: {
    title: "Talk at the break.",
    line: "Every hour at :50 the mics open. That is where you meet people.",
    ui: (
      <>
        <span className="lp-row lp-mono">
          <span className="lp-dot" aria-hidden="true" />
          <b>break · mics open</b>
          <span className="end">08:40 left</span>
        </span>
        <span className="lp-tiles">
          <span className="lp-tile cam talk" />
          <span className="lp-tile" />
          <span className="lp-tile cam talk" />
        </span>
      </>
    ),
  },
  desk: {
    title: "Focus on today.",
    line: "Plan what matters today, then work it through. Alone or in a room.",
    ui: (
      <>
        <span className="lp-row lp-mono">
          <b>today</b>
        </span>
        <span className="lp-row">✓ conflict rules</span>
        <span className="lp-row now">
          ▸ retry queue <span className="end lp-mono">22:14</span>
        </span>
        <span className="lp-row">○ tests for merge</span>
      </>
    ),
  },
  wall: {
    title: "Proof of what you made.",
    line: "Your projects, the real time behind them, and what you shipped. Kept, organised, yours.",
    ui: (
      <>
        <span className="lp-row lp-mono">
          <b>field-app</b>
          <span className="end">14h 20m this week</span>
        </span>
        <span className="lp-row now">Offline sync for the field app</span>
        <span className="lp-tag">52m in deep-work</span>
      </>
    ),
  },
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/** A seat in the plan: filled when someone is working there. Counts only, never who. */
function Seats({ x, y, cols, rows = 2, filled }: { x: number; y: number; cols: number; rows?: number; filled: number }) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      seats.push(<rect key={i} className={i < filled ? "seat in" : "seat"} x={x + c * 48} y={y + r * 46} width={34} height={24} rx={4} />);
    }
  }
  return <>{seats}</>;
}

/**
 * An area of the plan. A tap or the keyboard picks it outright; the pointer is read by the wrap,
 * which can tell a pointer that moved onto an area from one the page scrolled underneath.
 */
function Zone({ id, active, onPick, children }: { id: SpaceZone; active: boolean; onPick: (z: SpaceZone) => void; children: ReactNode }) {
  return (
    <g
      className={active ? "zone on" : "zone"}
      data-zone={id}
      role="button"
      tabIndex={0}
      aria-label={ZONE_LABEL[id]}
      aria-pressed={active}
      onClick={() => onPick(id)}
      onFocus={() => onPick(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(id);
        }
      }}
    >
      {children}
    </g>
  );
}

function FloorPlan({ zone, onPick }: { zone: SpaceZone; onPick: (z: SpaceZone) => void }) {
  return (
    <svg className="lp-plan" viewBox="0 0 1000 600" role="group" aria-label="Floor plan of your space">
      <path className="wall" d="M 20 20 H 980 V 580 H 560 M 440 580 H 20 Z" />
      <text x="470" y="598">entrance</text>

      <Zone id="rooms" active={zone === "rooms"} onPick={onPick}>
        <rect className="area" x="40" y="40" width="230" height="190" rx="6" />
        <rect className="area" x="290" y="40" width="230" height="190" rx="6" />
        <rect className="area" x="540" y="40" width="190" height="190" rx="6" />
        <text className="big" x="60" y="70">deep-work</text>
        <text x="60" y="92">4 working</text>
        <text className="big" x="310" y="70">writing</text>
        <text x="310" y="92">2 working</text>
        <text className="big" x="560" y="70">design</text>
        <text x="560" y="92">quiet</text>
        <Seats x={70} y={130} cols={4} filled={4} />
        <Seats x={320} y={130} cols={4} filled={2} />
        <Seats x={570} y={130} cols={3} filled={0} />
      </Zone>

      <Zone id="cubicle" active={zone === "cubicle"} onPick={onPick}>
        <rect className="area" x="750" y="40" width="210" height="110" rx="6" />
        <text className="big" x="770" y="70">cubicle</text>
        <text x="770" y="92">two people</text>
        <rect className="seat in" x="800" y="110" width="34" height="24" rx="4" />
        <rect className="seat in" x="876" y="110" width="34" height="24" rx="4" />
      </Zone>

      <Zone id="break" active={zone === "break"} onPick={onPick}>
        <rect className="area" x="750" y="170" width="210" height="390" rx="6" />
        <text className="big" x="770" y="200">break room</text>
        <text x="770" y="222">opens at :50</text>
        <circle className="thin" cx="855" cy="380" r="62" />
        <circle className="seat" cx="855" cy="300" r="13" />
        <circle className="seat" cx="935" cy="380" r="13" />
        <circle className="seat" cx="855" cy="460" r="13" />
        <circle className="seat" cx="775" cy="380" r="13" />
      </Zone>

      <Zone id="wall" active={zone === "wall"} onPick={onPick}>
        <rect className="area" x="40" y="260" width="230" height="300" rx="6" />
        <text className="big" x="60" y="290">your wall</text>
        <text x="60" y="312">what you made</text>
        <rect className="frame" x="60" y="340" width="90" height="64" rx="3" />
        <rect className="frame" x="160" y="340" width="90" height="64" rx="3" />
        <rect className="frame" x="60" y="416" width="190" height="56" rx="3" />
        <rect className="frame" x="60" y="484" width="90" height="56" rx="3" />
        <rect className="frame" x="160" y="484" width="90" height="56" rx="3" />
      </Zone>

      <Zone id="desk" active={zone === "desk"} onPick={onPick}>
        <rect className="area" x="290" y="260" width="440" height="230" rx="6" />
        <text className="big" x="310" y="290">your desk</text>
        <text x="310" y="312">today, in focus</text>
        <rect className="thin" x="410" y="350" width="200" height="80" rx="6" />
        <rect className="screen" x="440" y="368" width="80" height="44" rx="3" />
        <circle className="timer" cx="572" cy="390" r="16" />
        <rect className="seat in" x="492" y="444" width="36" height="26" rx="5" />
      </Zone>
    </svg>
  );
}

function Detail({ zone, onPick }: { zone: SpaceZone; onPick: (z: SpaceZone) => void }) {
  const d = DETAIL[zone];
  return (
    <div className="lp-detail">
      {/* Phones can't hover: the areas as buttons. Wider screens use the plan itself. */}
      <div className="lp-zone-chips" role="group" aria-label="Areas">
        {SPACE_ZONES.map((z) => (
          <button key={z} type="button" className={z === zone ? "on" : undefined} aria-pressed={z === zone} onClick={() => onPick(z)}>
            {ZONE_LABEL[z]}
          </button>
        ))}
      </div>
      <span className="lp-detail-key" aria-live="polite">
        {ZONE_LABEL[zone]}
      </span>
      {/* Keyed on the area so the words replay their arrival each time it changes. The key above
          is left alone: remounting a live region stops it announcing. */}
      <h3 key={`t-${zone}`} className="lp-detail-swap">
        {d.title}
      </h3>
      <p key={`l-${zone}`} className="lp-detail-swap">
        {d.line}
      </p>
      <div className="lp-ui" aria-hidden="true">
        {d.ui}
      </div>
    </div>
  );
}

function NoiseCard({ n, tile }: { n: (typeof NOISE)[number]; tile: string }) {
  return (
    <div className={`lp-noise-card${n.kind ? ` ${n.kind}` : ""}`} style={{ "--tile": tile } as CSSProperties}>
      <span className="c">
        {n.head && <span className="h">{n.head}</span>}
        {n.body}
        {n.foot && <span className="f">{n.foot}</span>}
      </span>
      {/* The square of the mark this card turns into. */}
      <span className="t" />
    </div>
  );
}

/**
 * One scroll timeline: the feed's noise ("They want you to stay."), the noise flying together
 * into the SkillHiive mark, the big mark shrinking into its place over the i in the full logo as
 * the letters appear round it, the full logo docking at the top left over "This is a space.",
 * then the space itself as a floor plan (rooms, cubicle, break room, desk, wall). The letters are
 * logo_full.png with the mark cut out, so the one mark on screen is the one that flew there.
 * With reduced motion it is a still page: both lines, the full logo, then the plan.
 */
export function SpaceScene() {
  const [reduce] = useState(prefersReducedMotion);
  const [zone, setZone] = useState<SpaceZone>("rooms");
  /** The walk follows the scroll until the pointer takes it, and the next scroll takes it back. */
  const owner = useRef<ZoneOwner>("timeline");
  const progress = useRef(0);
  const lastScrollAt = useRef(0);
  const pointer = useRef({ x: -1, y: -1 });
  const pickedAtY = useRef(0);
  const sceneRef = useRef<HTMLElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLImageElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const finishRef = useRef<HTMLParagraphElement>(null);
  const planRef = useRef<HTMLDivElement>(null);

  /** A tap, a click or the keyboard: a choice, held until the page has moved a little. */
  const pick = (z: SpaceZone) => {
    owner.current = "pick";
    pickedAtY.current = window.scrollY;
    setZone(z);
  };

  /**
   * The pointer over the plan. Only a pointer that moved itself, clear of the last scroll, decides
   * anything: scrolling drags fresh areas under a still cursor and the browser reports those moves
   * too, which is how a cursor left lying on the plan used to end the walk before it started.
   */
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const moved = e.clientX !== pointer.current.x || e.clientY !== pointer.current.y;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!moved || !pointerChose(true, performance.now() - lastScrollAt.current)) return;
    const z = (e.target as Element).closest?.("[data-zone]")?.getAttribute("data-zone");
    if (!z) return;
    owner.current = "pointer";
    setZone(z as SpaceZone);
  };

  /** The pointer leaving hands the walk back, carrying on from wherever the scroll has reached. */
  const onPointerLeave = () => {
    if (reduce || owner.current !== "pointer") return;
    owner.current = "timeline";
    setZone((prev) => zoneAtSticky(progress.current, prev));
  };

  useEffect(() => {
    if (reduce) return;
    const scene = sceneRef.current;
    if (!scene) return;
    let frame = 0;
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const draw = () => {
      frame = 0;
      const rect = scene.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      const p = sceneProgress(rect.top, rect.height, h);
      progress.current = p;
      const t = timeline(p);
      const boxes = sceneBoxes(w, h);

      if (feedRef.current) {
        feedRef.current.style.opacity = String(1 - t.feedOut);
        feedRef.current.style.transform = `translateY(${-t.feedOut * 12}px)`;
      }

      // Each card flies from its place in the feed to its square of the big mark.
      const cards = noiseRef.current?.children ?? [];
      for (let i = 0; i < cards.length; i++) {
        const el = cards[i] as HTMLElement;
        const n = NOISE[i]!;
        const ow = el.offsetWidth;
        const oh = el.offsetHeight;
        const sq = tileRect(boxes.big, i);
        const m = t.merge;
        const cx = lerp((n.x / 100) * w, sq.x + sq.size / 2, m);
        // The feed lives below the headline's clear band, drifting up into place from below.
        const band = w < 900 ? 190 : 212;
        const frac = Math.max(0, (n.y - 18) / 74);
        const home = band + frac * Math.max(0, h - band - 50) + (1 - Math.min(1, p * 4)) * 20 * ((i % 3) + 1);
        const cy = lerp(home, sq.y + sq.size / 2, m);
        const sx = lerp(1, sq.size / ow, m);
        const sy = lerp(1, sq.size / oh, m);
        el.style.transform = `translate(${cx - ow / 2}px, ${cy - oh / 2}px) rotate(${n.r * (1 - m)}deg) scale(${sx}, ${sy})`;
        el.style.opacity = String(1 - t.markIn);
        (el.firstElementChild as HTMLElement).style.opacity = String(Math.max(0, 1 - m * 1.8));
        (el.lastElementChild as HTMLElement).style.opacity = String(Math.min(1, Math.max(0, (m - 0.35) / 0.65)));
      }

      // The crisp mark takes over, settles into the full logo, and rides along with it.
      const box = markAt(boxes, t);
      if (markRef.current) {
        markRef.current.style.width = `${boxes.big.h * MARK_ASPECT}px`;
        markRef.current.style.height = `${boxes.big.h}px`;
        markRef.current.style.transform = `translate(${box.x}px, ${box.y}px) scale(${box.h / boxes.big.h})`;
        markRef.current.style.opacity = String(t.markIn);
      }
      // The letters appear round the mark as it lands, a touch large and settling to size.
      const logo = logoAt(boxes, t);
      if (lettersRef.current) {
        const drawn = growRoundMark(logo, 1 + (1 - t.letters) * 0.04);
        lettersRef.current.style.width = `${boxes.center.w}px`;
        lettersRef.current.style.height = `${boxes.center.w / FULL_LOGO_ASPECT}px`;
        lettersRef.current.style.transform = `translate(${drawn.x}px, ${drawn.y}px) scale(${drawn.w / boxes.center.w})`;
        lettersRef.current.style.opacity = String(t.letters);
      }
      // The answer rises under the big mark and is gone before the mark starts to shrink.
      if (finishRef.current) {
        finishRef.current.style.top = `${boxes.big.y + boxes.big.h + (w < 900 ? 28 : 40)}px`;
        finishRef.current.style.opacity = String(t.finish);
        finishRef.current.style.transform = `translateY(${(1 - t.finish) * 14}px)`;
      }
      if (headRef.current) {
        headRef.current.style.left = `${boxes.dock.x}px`;
        headRef.current.style.top = `${boxes.dock.y + boxes.dock.w / FULL_LOGO_ASPECT + (w < 900 ? 10 : 18)}px`;
        headRef.current.style.opacity = String(t.spaceIn);
        headRef.current.style.transform = `translateY(${(1 - t.spaceIn) * 10}px)`;
      }

      if (planRef.current) {
        planRef.current.style.opacity = String(t.plan);
        planRef.current.style.transform = `translateY(${(1 - t.plan) * 30}px)`;
        planRef.current.style.pointerEvents = t.plan > 0.5 ? "auto" : "none";
        planRef.current.style.visibility = t.plan === 0 ? "hidden" : "visible";
      }

      if (owner.current === "timeline") {
        setZone((prev) => {
          const next = zoneAtSticky(p, prev);
          return prev === next ? prev : next;
        });
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    /** Scrolling is the stronger signal, so it takes the walk back from the pointer. */
    const onScroll = () => {
      lastScrollAt.current = performance.now();
      if (owner.current === "pointer") owner.current = "timeline";
      // A picked area is a firmer choice: it holds until the page has actually moved on.
      else if (owner.current === "pick" && Math.abs(window.scrollY - pickedAtY.current) > PICK_RELEASE_PX) {
        owner.current = "timeline";
      }
      schedule();
    };

    // A cursor already lying on the plan when the page loads has chosen nothing.
    lastScrollAt.current = performance.now();
    schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    };
  }, [reduce]);

  if (reduce) {
    return (
      <section id="space" className="lp-scene still" aria-labelledby="space-title">
        <div className="lp-wrap">
          <p className="lp-still-feed">They want you to stay.</p>
          <p className="lp-still-feed finish">We want you to finish.</p>
          <div className="lp-still-head">
            <img src={logoFull} alt="SkillHiive" className="lp-still-logo" />
            <h2 id="space-title" className="lp-space-title">
              This is a space.
            </h2>
          </div>
          <div className="lp-plan-wrap" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
            <FloorPlan zone={zone} onPick={pick} />
            <Detail zone={zone} onPick={pick} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sceneRef} id="space" className="lp-scene" aria-labelledby="space-title">
      <div className="lp-stage">
        <div className="lp-feed-line" ref={feedRef}>
          <span className="lp-label">elsewhere</span>
          <p>They want you to stay.</p>
        </div>
        <div className="lp-noise" ref={noiseRef} aria-hidden="true">
          {NOISE.map((n, i) => (
            <NoiseCard key={i} n={n} tile={MARK_TILES[i]!.color} />
          ))}
        </div>
        <div className="lp-mark-fly" ref={markRef}>
          <LogoMark className="lp-mark-svg" />
        </div>
        <p className="lp-finish" ref={finishRef}>
          We want you to finish.
        </p>
        <img className="lp-letters" ref={lettersRef} src={logoLetters} alt="" aria-hidden="true" />
        <h2 id="space-title" className="lp-space-title pinned" ref={headRef}>
          This is a space.
        </h2>
        <div className="lp-plan-wrap pinned" ref={planRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <FloorPlan zone={zone} onPick={pick} />
          <Detail zone={zone} onPick={pick} />
        </div>
      </div>
    </section>
  );
}
