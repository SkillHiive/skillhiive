import { useEffect, useRef, useState } from "react";

/**
 * The landing page's glowing cursor. It only runs for mouse users who have not asked
 * for reduced motion; everyone else keeps the system cursor. While it runs it adds
 * `custom-cursor` to <html>, which hides the system cursor (see index.css).
 */
function wantsCustomCursor(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Cursor() {
  const [enabled] = useState(wantsCustomCursor);
  const [cursorActive, setCursorActive] = useState(false);

  const glowRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("custom-cursor");

    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.left = `${mouseX}px`;
        dotRef.current.style.top = `${mouseY}px`;
      }

      setCursorActive(true);
    };

    const handleMouseLeave = () => {
      setCursorActive(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    let frameId: number;

    const animateGlow = () => {
      glowX += (mouseX - glowX) * 0.06;
      glowY += (mouseY - glowY) * 0.06;

      if (glowRef.current) {
        glowRef.current.style.left = `${glowX}px`;
        glowRef.current.style.top = `${glowY}px`;
      }

      frameId = requestAnimationFrame(animateGlow);
    };

    animateGlow();

    return () => {
      root.classList.remove("custom-cursor");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);

      cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={glowRef}
        className={`cursor-glow ${cursorActive ? "active" : ""}`}
        aria-hidden="true"
      />

      <div
        ref={dotRef}
        className={`cursor-dot ${cursorActive ? "active" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}
