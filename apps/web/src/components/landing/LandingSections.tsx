import { useState } from "react";
import { Link } from "react-router";
import shVid from "@/assets/sh.mp4";
import heroPoster from "@/assets/hero-poster.webp";
import { LIVEKIT_REPO_URL, PLATFORM_REPO_URL, STATUS_URL } from "./links";

/** What never comes into your space. Where there is something to check, it links there. */
const KEPT_OUT: { text: string; proof?: { label: string; href: string } }[] = [
  { text: "algorithm feed" },
  { text: "streaks" },
  { text: "ads and trackers", proof: { label: "code", href: PLATFORM_REPO_URL } },
  { text: "quote posts" },
  { text: "recording", proof: { label: "config", href: LIVEKIT_REPO_URL } },
];

export function KeptOutSection() {
  return (
    <section id="out" className="lp-section" aria-labelledby="out-title">
      <div className="lp-wrap">
        <h2 id="out-title" className="lp-label lp-out-title">
          kept out of your space · check it yourself
        </h2>
        <ul className="lp-out">
          {KEPT_OUT.map((k) => (
            <li key={k.text}>
              <s>{k.text}</s>
              {k.proof && (
                <a className="lp-link" href={k.proof.href}>
                  {k.proof.label} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** What isn't live yet, clearly marked: the night shift first, then Works and Crew. */
export function ComingSection() {
  // The poppies play here too, dimmed, unless less motion or less data was asked for.
  const [playVideo] = useState(
    () =>
      typeof window !== "undefined" &&
      !(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) &&
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData !== true,
  );
  return (
    <section id="coming" className="lp-section" aria-labelledby="coming-title">
      <div className="lp-wrap">
        <span className="lp-label">coming</span>
        <h2 id="coming-title">Your space keeps working while you sleep.</h2>
        <div className="lp-coming">
          <div className="lp-night">
            {playVideo ? (
              <video src={shVid} poster={heroPoster} autoPlay muted loop playsInline preload="none" aria-hidden="true" />
            ) : (
              <img src={heroPoster} alt="" aria-hidden="true" />
            )}
            <span className="lp-pill">stager · desktop app · in progress</span>
            <h3>The night shift</h3>
            <p>Leave what's unfinished on your desk. Your own AI models work through it overnight, on their own branches.</p>
          </div>
          <div className="lp-later">
            <span className="lp-pill">later</span>
            <div>
              <h3>Works</h3>
              <p>A team to build your site, app and servers.</p>
            </div>
            <div>
              <h3>Crew</h3>
              <p>Mentorships and internships on real projects.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CloseSection() {
  return (
    <section className="lp-close" aria-labelledby="close-title">
      <div className="lp-wrap">
        <h2 id="close-title">Make your space.</h2>
        <p>Free to belong. Nothing in it pulls at you.</p>
        <div className="lp-actions">
          <Link to="/register" className="lp-btn primary ui-press">
            Make your space <span aria-hidden="true">→</span>
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
        <span>SkillHiive™ · open source · built in India · work, but don't forget to be human</span>
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
