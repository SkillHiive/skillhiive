import { useState } from "react";
import { Link } from "react-router";
import { BUILT_COMMITS, sinceLabel } from "@/lib/landing";
import { GITHUB_ORG_URL, LIVEKIT_REPO_URL, MIGRATIONS_URL, PLATFORM_REPO_URL, STATUS_URL } from "./links";

/** Meet, work together, hand off, sleep, wake up ahead: one day, each step shown as the thing itself. */
export function LoopSection() {
  return (
    <section id="loop" className="lp-section" aria-labelledby="loop-title">
      <div className="lp-wrap">
        <span className="lp-label">the loop</span>
        <h2 id="loop-title">
          Meet people. Work beside them.
          <br />
          Sleep. Wake up ahead.
        </h2>
        <ol className="lp-day" style={{ listStyle: "none", padding: 0 }}>
          <li className="lp-daybar" aria-hidden="true" />

          <li className="lp-card lp-step">
            <span className="lp-step-time lp-label">
              <span>09:00</span>
              <span>floor</span>
            </span>
            <h3>Meet</h3>
            <p>Topics about real work. Projects, not quotes.</p>
            <div className="lp-ui" aria-hidden="true">
              <span className="lp-row">
                <span className="lp-av" />
                <b style={{ color: "var(--lp-t1)" }}>ana</b>
                <span style={{ marginLeft: "auto", color: "var(--lp-t3)" }}>2h</span>
              </span>
              <span>Shipped offline sync for the field app. Notes on the conflict rules inside.</span>
              <span className="lp-label">#local-first · 14 replies</span>
            </div>
          </li>

          <li className="lp-card lp-step">
            <span className="lp-step-time lp-label">
              <span>10:00</span>
              <span>rooms</span>
            </span>
            <h3>Work together</h3>
            <p>Live rooms on a 50 and 10 clock. Never recorded.</p>
            <div className="lp-ui" aria-hidden="true">
              <span className="lp-tiles">
                <span className="lp-tile" />
                <span className="lp-tile" />
                <span className="lp-tile" />
                <span className="lp-tile" />
              </span>
              <span className="lp-row" style={{ fontFamily: "var(--lp-mono)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="6.5" fill="none" stroke="#2a2a2a" strokeWidth="2.5" />
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    fill="none"
                    stroke="var(--lp-green)"
                    strokeWidth="2.5"
                    strokeDasharray="40.8"
                    strokeDashoffset="14"
                    transform="rotate(-90 8 8)"
                  />
                </svg>
                deep-work · 38:12
              </span>
            </div>
          </li>

          <li className="lp-card lp-step">
            <span className="lp-step-time lp-label">
              <span>18:00</span>
              <span>workspace</span>
            </span>
            <h3>Hand off</h3>
            <p>What is left goes to your workspace, with everything you were doing.</p>
            <div className="lp-ui mono" aria-hidden="true">
              <span style={{ color: "var(--lp-t1)" }}>thread · offline sync</span>
              <span>✓ conflict rules</span>
              <span>○ retry queue</span>
              <span>○ tests for merge</span>
            </div>
          </li>

          <li className="lp-card lp-step night">
            <span className="lp-step-time lp-label">
              <span>23:00</span>
              <span>night shift</span>
            </span>
            <h3>Sleep</h3>
            <p>Your models plan, do and review the work. On their own branches.</p>
            <div className="lp-ui mono" aria-hidden="true" style={{ color: "var(--lp-t3)" }}>
              <span>02:14 plan retry queue</span>
              <span>03:40 done night/retry-queue</span>
              <span>04:05 review 2 notes</span>
            </div>
          </li>

          <li className="lp-card lp-step">
            <span className="lp-step-time lp-label">
              <span>08:00</span>
              <span>stager</span>
            </span>
            <h3>Wake up ahead</h3>
            <p>See what got done and what waits for you. Then back to people.</p>
            <div className="lp-ui" aria-hidden="true">
              <span className="lp-row">
                <span className="lp-dot" />
                <span style={{ color: "var(--lp-t1)" }}>2 branches ready</span>
              </span>
              <span className="lp-row">
                <span className="lp-dot off" />1 question for you
              </span>
              <span className="lp-row">
                <span className="lp-dot off" />
                4h 10m worked yesterday
              </span>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

/** Stager: the Floor and the workspace, side by side, as one place. */
export function SidesSection() {
  return (
    <section id="stager" className="lp-section" aria-labelledby="stager-title">
      <div className="lp-wrap">
        <span className="lp-label">stager</span>
        <h2 id="stager-title">One app. Two sides of the same work.</h2>
        <p className="lp-lede">The Floor is open on the web today. The desktop app with the workspace is in the works.</p>
        <div className="lp-sides">
          <div className="lp-card lp-side">
            <span className="lp-label">the floor</span>
            <h3>People</h3>
            <ul>
              <li>
                <span className="k">topics</span>Small, focused spaces for real discussion.
              </li>
              <li>
                <span className="k">posts</span>Projects, media from real work, offer letters.
              </li>
              <li>
                <span className="k">rooms</span>Work beside people on live video.
              </li>
              <li>
                <span className="k">cubicles</span>Two people, one quiet corner.
              </li>
            </ul>
          </div>
          <div className="lp-joint lp-label" aria-hidden="true">
            <span>⟷ one place</span>
          </div>
          <div className="lp-card lp-side">
            <span className="lp-label">the workspace</span>
            <h3>Work</h3>
            <ul>
              <li>
                <span className="k">threads</span>Your git and coding sessions, saved as you go.
              </li>
              <li>
                <span className="k">night shift</span>Models that keep the work moving overnight.
              </li>
              <li>
                <span className="k">backstage</span>Your own server for storage, sync and local models.
              </li>
              <li>
                <span className="k">any model</span>Bring an API key, or run local only.
              </li>
            </ul>
          </div>
        </div>
        <div className="lp-actions" style={{ marginTop: 28 }}>
          <Link to="/register" className="lp-btn primary ui-press">
            Open in the browser
          </Link>
          <span className="lp-label">desktop app: in progress</span>
        </div>
      </div>
    </section>
  );
}

/** The Floor rules, as two lists. */
export function FloorSection() {
  return (
    <section className="lp-section" aria-labelledby="floor-title">
      <div className="lp-wrap">
        <span className="lp-label">the floor</span>
        <h2 id="floor-title">A floor, not a stage.</h2>
        <p className="lp-lede">
          The shop floor is where work happens. The stage is where it is performed. The Floor is kept for the first one.
        </p>
        <div className="lp-rules">
          <div className="lp-card">
            <span className="lp-label">belongs</span>
            <ul>
              <li>Real projects and what you learned</li>
              <li>Media from real work</li>
              <li>Offer letters and showcases, checked</li>
              <li>Questions with something to discuss</li>
            </ul>
          </div>
          <div className="lp-card no">
            <span className="lp-label">does not</span>
            <ul>
              <li>Inspirational quotes</li>
              <li>Self promotion with nothing to discuss</li>
              <li>Posts written by bots</li>
              <li>Streaks, points and leaderboards</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROMISES = [
  {
    title: "No trackers",
    body: "No analytics and no ads. The only thing kept in your browser is your session.",
    link: "read the code",
    href: PLATFORM_REPO_URL,
  },
  {
    title: "Rooms are never recorded",
    body: "The video servers run with logging off, and their config is public.",
    link: "livekit config",
    href: LIVEKIT_REPO_URL,
  },
  {
    title: "Private stays private",
    body: "Nothing from your workspace reaches the Floor unless you post it yourself.",
    link: "privacy policy",
    to: "/privacy",
  },
  {
    title: "Delete means delete",
    body: "Deleting your account removes everything tied to it. Nothing is kept.",
    link: "the schema",
    href: MIGRATIONS_URL,
  },
] as const;

/** Each promise links to the thing that proves it, then the latest public commits. */
export function PromisesSection() {
  const [now] = useState(() => Date.now());
  return (
    <section id="open" className="lp-section" aria-labelledby="open-title">
      <div className="lp-wrap">
        <span className="lp-label">open source · AGPL 3.0</span>
        <h2 id="open-title">Promises you can check.</h2>
        <ul className="lp-promises" style={{ listStyle: "none", padding: 0 }}>
          {PROMISES.map((p) => (
            <li key={p.title} className="lp-card lp-promise">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              {"to" in p ? (
                <Link className="lp-link" to={p.to}>
                  {p.link} →
                </Link>
              ) : (
                <a className="lp-link" href={p.href}>
                  {p.link} →
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="lp-card lp-log">
          {BUILT_COMMITS.map((c) => {
            const row = (
              <>
                <span className="repo">{c.repo}</span>
                <span className="kind">{c.kind === "commit" ? "" : c.kind}</span>
                <span className="msg">{c.message}</span>
                <span className="age">{sinceLabel(c.at, now)}</span>
              </>
            );
            return c.url ? (
              <a key={`${c.repo}${c.at}`} href={c.url} className="lp-log-row">
                {row}
              </a>
            ) : (
              <div key={`${c.repo}${c.at}`} className="lp-log-row">
                {row}
              </div>
            );
          })}
          <div className="lp-log-row foot">
            <a className="lp-link" href={GITHUB_ORG_URL}>
              github.com/SkillHiive →
            </a>
            <a className="lp-link" href={STATUS_URL}>
              status.skillhiive.com →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The four parts of SkillHiive. Works and Crew wait until there is proof to show. */
export function DoorsSection() {
  return (
    <section className="lp-section" aria-labelledby="doors-title">
      <div className="lp-wrap">
        <span className="lp-label">skillhiive</span>
        <h2 id="doors-title">Four doors. One idea: work.</h2>
        <div className="lp-doors">
          <Link to="/register" className="lp-card lp-door ui-press">
            <span className="lp-label">work together</span>
            <span className="name">Floor</span>
            <p>Meet people around real work, and work beside them.</p>
            <span className="go">
              <span>join</span>
              <span aria-hidden="true">→</span>
            </span>
          </Link>
          <a href="#stager" className="lp-card lp-door ui-press">
            <span className="lp-label">work focused</span>
            <span className="name">Stager</span>
            <p>Your workspace and the night shift, in the same app.</p>
            <span className="go">
              <span>desktop in progress</span>
              <span aria-hidden="true">→</span>
            </span>
          </a>
          <div className="lp-card lp-door later">
            <span className="lp-label">get work done</span>
            <span className="name">Works</span>
            <p>Sites, apps, brand and DevOps in one plan.</p>
            <span className="go">soon</span>
          </div>
          <div className="lp-card lp-door later">
            <span className="lp-label">grow through work</span>
            <span className="name">Crew</span>
            <p>Mentorships and internships on real projects.</p>
            <span className="go">soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CloseSection() {
  return (
    <section className="lp-section lp-close" aria-labelledby="close-title">
      <div className="lp-wrap">
        <h2 id="close-title">
          Work, but don't
          <br />
          forget to be human.
        </h2>
        <p className="lp-lede">Free to belong. No ads, no trackers, no feed built to hold you.</p>
        <div className="lp-actions">
          <Link to="/register" className="lp-btn primary ui-press">
            Join the Floor <span aria-hidden="true">→</span>
          </Link>
          <a href={PLATFORM_REPO_URL} className="lp-btn ghost ui-press">
            Read the code
          </a>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap">
        <span>SkillHiive™ · open source · built in India</span>
        <nav aria-label="Footer">
          <Link to="/privacy">privacy</Link>
          <Link to="/terms">terms</Link>
          <a href={STATUS_URL}>status</a>
          <a href={PLATFORM_REPO_URL}>github</a>
        </nav>
      </div>
    </footer>
  );
}
