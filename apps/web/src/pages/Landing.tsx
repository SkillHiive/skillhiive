import "@/components/landing/landing.css";
import { LandingHero } from "@/components/landing/LandingHero";
import {
  CloseSection,
  DoorsSection,
  FloorSection,
  LandingFooter,
  LoopSection,
  PromisesSection,
  SidesSection,
} from "@/components/landing/LandingSections";

/**
 * skillhiive.com: the hero video, then the loop (meet, work together, hand off, sleep, wake up
 * ahead), Stager's two sides, the Floor rules, the promises with their proof, and the four doors.
 * Always dark. Built to move to the separate site (apps/site) as it is.
 */
export default function Landing() {
  return (
    <div className="lp">
      <LandingHero />
      <main>
        <LoopSection />
        <SidesSection />
        <FloorSection />
        <PromisesSection />
        <DoorsSection />
        <CloseSection />
      </main>
      <LandingFooter />
    </div>
  );
}
