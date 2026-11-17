import { useEffect } from "react";
import Lenis from "lenis";
import Footer from "@/components/Footer";
import Cursor from "@/components/Cursor";
import Features from "./Features";
import Hero from "./Hero";
import SwipeLayout from "@/components/SwipeLayout";
import { OpenSource } from "./OpenSource";

const Landing = () => {
  // Smooth scrolling belongs to the long landing page only; app pages scroll natively.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return (
    <SwipeLayout>
      <Cursor />
      <div className="relative overflow-hidden p-0 m-0" style={{ width: "100%" }}>
        <Hero />
        <Features />
        <OpenSource />
        <Footer />
      </div>
    </SwipeLayout>
  );
};

export default Landing;
