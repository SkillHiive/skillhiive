import "@/components/landing/landing.css";
import { LandingHero } from "@/components/landing/LandingHero";
import { SpaceScene } from "@/components/landing/SpaceScene";
import { ComingSection, CloseSection, KeptOutSection, LandingFooter } from "@/components/landing/LandingSections";

/**
 * skillhiive.com: the hero video, then "They want you to stay. We want you to finish. This is a space.": the feed's
 * noise scatters and your space settles in as a floor plan (rooms, cubicle, break room, desk,
 * wall). Then what is kept out, what is coming, and an invitation to make your space. Always dark.
 * Built to move to the separate site (apps/site) as it is.
 */
export default function Landing() {
  return (
    <div className="lp">
      <LandingHero />
      <main>
        <SpaceScene />
        <KeptOutSection />
        <ComingSection />
        <CloseSection />
      </main>
      <LandingFooter />
    </div>
  );
}
