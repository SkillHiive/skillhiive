import { useState } from "react";
import { Link } from "react-router";
import shVid from "@/assets/sh.mp4";
import heroPoster from "@/assets/hero-poster.webp";
import { useLandingProof } from "@/hooks/useLandingProof";
import { BUILT_COMMITS, sinceLabel, statusLabel } from "@/lib/landing";
import { GITHUB_ORG_URL, STATUS_URL, scrollToSection } from "./links";
import logoFull from "@/assets/landing/logo-full.webp";

/** The 10 MB background video plays only when nobody has asked for less motion or less data. */
function shouldPlayVideo(): boolean {
  if (typeof window === "undefined") return false;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !reduceMotion && connection?.saveData !== true;
}

/** Live facts, each linked to where it comes from. A fact we can't read is left out, never guessed. */
function Proof() {
  const { rooms, status } = useLandingProof();
  const [now] = useState(() => Date.now());
  const lastCommit = BUILT_COMMITS[0] ?? null;

  return (
    <dl className="lp-proof ui-rise" aria-label="Live">
      {rooms !== null && (
        <div>
          <dt>
            <span className={rooms > 0 ? "lp-dot" : "lp-dot off"} aria-hidden="true" />
            rooms open now
          </dt>
          <dd>{rooms}</dd>
        </div>
      )}
      {status && (
        <div>
          <dt>all systems</dt>
          <dd>
            <a href={STATUS_URL} style={{ color: status.up === status.total ? "var(--lp-live)" : undefined }}>
              {statusLabel(status)}
            </a>
          </dd>
        </div>
      )}
      <div>
        <dt>{lastCommit ? "last commit" : "source"}</dt>
        <dd>
          <a href={lastCommit?.url ?? GITHUB_ORG_URL}>{lastCommit ? sinceLabel(lastCommit.at, now) : "github"}</a>
        </dd>
      </div>
    </dl>
  );
}

export function LandingHero() {
  const [playVideo] = useState(shouldPlayVideo);

  return (
    <header className="lp-hero">
      {playVideo ? (
        <video src={shVid} poster={heroPoster} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
      ) : (
        <img className="lp-poster" src={heroPoster} alt="" aria-hidden="true" />
      )}
      <div className="lp-shade" aria-hidden="true" />

      <nav className="lp-nav" aria-label="Site">
        <Link to="/" className="lp-brand">
          <img src={logoFull} alt="SkillHiive" />
        </Link>
        <span className="lp-nav-links">
          <a className="wide" href="#space" onClick={scrollToSection("space")}>
            the space
          </a>
          <a className="wide" href="#out" onClick={scrollToSection("out")}>
            kept out
          </a>
          <a className="wide" href="#coming" onClick={scrollToSection("coming")}>
            coming
          </a>
          <Link to="/login" style={{ color: "var(--lp-t1)" }}>
            log in
          </Link>
        </span>
      </nav>

      <div className="lp-hero-body">
        <div className="ui-rise">
          <span className="lp-label" style={{ color: "rgba(255,255,255,0.6)" }}>
            open source · built in India
          </span>
          <h1>
            A place
            <br />
            to work.
          </h1>
          <p className="lp-motto">
            <span>People to work beside. Quiet to focus.</span>
            <span>Proof of everything you make.</span>
          </p>
          <div className="lp-actions">
            <Link to="/register" className="lp-btn primary ui-press">
              Make your space <span aria-hidden="true">→</span>
            </Link>
            <a href="#space" onClick={scrollToSection("space")} className="lp-btn ghost ui-press">
              Look inside
            </a>
          </div>
        </div>
        <Proof />
      </div>
    </header>
  );
}
