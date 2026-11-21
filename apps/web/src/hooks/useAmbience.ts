import { useCallback, useEffect, useRef, useState } from "react";

export type AmbienceKind = "none" | "rain" | "cafe";

const STORAGE_KEY = "skillhive:ambience";

function makeNoiseBuffer(ctx: AudioContext, brown: boolean): AudioBuffer {
  const seconds = 4;
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, rate * seconds, rate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

function loadChoice(): AmbienceKind {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "rain" || saved === "cafe" ? saved : "none";
  } catch {
    return "none";
  }
}

type Nodes = {
  kind: Exclude<AmbienceKind, "none">;
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
};

/**
 * Lightweight ambient soundscapes via Web Audio (rain / cafe murmur), synthesised
 * locally. The choice is remembered; sound plays only while `active` (a focus
 * session is on). `playing` says whether it is actually audible: a browser can
 * hold audio until the first click or key press, and the sound starts then.
 */
export function useAmbience(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Nodes | null>(null);
  const [kind, setKind] = useState<AmbienceKind>(loadChoice);
  const [running, setRunning] = useState(false);

  const stop = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;
    try {
      nodes.source.stop();
      nodes.source.disconnect();
      nodes.gain.disconnect();
      nodes.filter.disconnect();
    } catch {
      /* already stopped */
    }
    nodesRef.current = null;
  }, []);

  /** Starts (or keeps) the sound for `next`; returns the context, or null without Web Audio. */
  const play = useCallback(
    (next: Exclude<AmbienceKind, "none">): AudioContext | null => {
      let ctx = ctxRef.current;
      if (!ctx) {
        try {
          ctx = new AudioContext();
        } catch {
          return null;
        }
        const created = ctx;
        created.addEventListener("statechange", () => setRunning(created.state === "running"));
        ctxRef.current = created;
      }
      const audio = ctx;
      if (audio.state === "suspended") {
        audio.resume().then(() => setRunning(audio.state === "running"), () => {});
      } else if (audio.state === "running") {
        queueMicrotask(() => setRunning(true));
      }

      if (nodesRef.current?.kind === next) return audio;
      stop();

      const source = audio.createBufferSource();
      const gain = audio.createGain();
      const filter = audio.createBiquadFilter();
      source.buffer = makeNoiseBuffer(audio, next === "cafe");
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = next === "rain" ? 1200 : 420;
      gain.gain.value = next === "rain" ? 0.14 : 0.1;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start();
      nodesRef.current = { kind: next, source, gain, filter };
      return audio;
    },
    [stop],
  );

  const setAmbience = useCallback(
    (next: AmbienceKind) => {
      setKind(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      // Start inside the click, where the browser always allows audio.
      if (next === "none") stop();
      else if (active) play(next);
    },
    [active, play, stop],
  );

  // Follow the session: play the chosen sound while it is on, silence otherwise.
  // If the browser holds audio until a gesture, resume on the first one.
  useEffect(() => {
    if (!active || kind === "none") {
      stop();
      return;
    }
    const ctx = play(kind);
    if (!ctx || ctx.state === "running") return;
    const gestures = ["click", "keydown", "touchend"] as const;
    const resume = () => {
      ctx.resume().then(() => setRunning(ctx.state === "running"), () => {});
    };
    for (const g of gestures) window.addEventListener(g, resume, true);
    return () => {
      for (const g of gestures) window.removeEventListener(g, resume, true);
    };
  }, [active, kind, play, stop]);

  useEffect(() => {
    return () => {
      stop();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, [stop]);

  return { kind, playing: active && kind !== "none" && running, setAmbience };
}
