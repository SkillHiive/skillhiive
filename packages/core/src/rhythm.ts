// Rhythm engine - Platform-agnostic phase computation
import { Phase, PhaseState } from "@skillhiive/contracts";

export interface RhythmConfig {
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  cycles: number;
  micAllowedDuringFocus: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export const defaultRhythmConfig: RhythmConfig = {
  focusDurationMinutes: 50,
  breakDurationMinutes: 10,
  cycles: 4,
  micAllowedDuringFocus: false,
  autoStartBreaks: true,
  autoStartFocus: false,
};

/**
 * Computes the current focus phase based on session start time.
 * Uses server time offset to ensure all clients see the same phase.
 * 
 * @param sessionStartedAt - ISO timestamp from server when session began
 * @param config - Rhythm configuration
 * @param now - Current timestamp (defaults to Date.now())
 * @param serverTimeOffsetMs - Server time offset in milliseconds
 * @returns PhaseState with phase, remainingSeconds, progress, micAllowed
 * 
 * @example
 * ```ts
 * const phase = computePhase('2024-01-15T10:00:00Z', defaultRhythmConfig);
 * // { phase: 'focusing', remainingSeconds: 1800, progress: 0.5, micAllowed: false }
 * ```
 */
export function computePhase(
  sessionStartedAt: string | null,
  config: RhythmConfig = defaultRhythmConfig,
  now: number = Date.now(),
  serverTimeOffsetMs: number = 0
): PhaseState {
  const adjustedNow = now + serverTimeOffsetMs;
  
  if (!sessionStartedAt) {
    return {
      phase: "waiting",
      remainingSeconds: 0,
      progress: 0,
      micAllowed: true,
      currentCycle: 0,
      totalCycles: config.cycles,
      sessionStartedAt: null,
      serverTimeOffsetMs,
    };
  }
  
  const startTime = new Date(sessionStartedAt).getTime();
  const elapsedMs = adjustedNow - startTime;
  
  if (elapsedMs < 0) {
    return {
      phase: "waiting",
      remainingSeconds: 0,
      progress: 0,
      micAllowed: true,
      currentCycle: 0,
      totalCycles: config.cycles,
      sessionStartedAt,
      serverTimeOffsetMs,
    };
  }
  
  const cycleDurationMs = (config.focusDurationMinutes + config.breakDurationMinutes) * 60 * 1000;
  const totalDurationMs = cycleDurationMs * config.cycles;
  
  if (elapsedMs >= totalDurationMs) {
    return {
      phase: "ended",
      remainingSeconds: 0,
      progress: 1,
      micAllowed: true,
      currentCycle: config.cycles,
      totalCycles: config.cycles,
      sessionStartedAt,
      serverTimeOffsetMs,
    };
  }
  
  const cycleIndex = Math.floor(elapsedMs / cycleDurationMs);
  const cycleElapsedMs = elapsedMs % cycleDurationMs;
  const focusDurationMs = config.focusDurationMinutes * 60 * 1000;
  
  if (cycleElapsedMs < focusDurationMs) {
    // Focusing phase
    const remainingMs = focusDurationMs - cycleElapsedMs;
    return {
      phase: "focusing",
      remainingSeconds: Math.ceil(remainingMs / 1000),
      progress: cycleElapsedMs / focusDurationMs,
      micAllowed: config.micAllowedDuringFocus,
      currentCycle: cycleIndex + 1,
      totalCycles: config.cycles,
      sessionStartedAt,
      serverTimeOffsetMs,
    };
  } else {
    // Break phase
    const breakElapsedMs = cycleElapsedMs - focusDurationMs;
    const breakDurationMs = config.breakDurationMinutes * 60 * 1000;
    const remainingMs = breakDurationMs - breakElapsedMs;
    
    const isLastCycle = cycleIndex === config.cycles - 1;
    const phase: Phase = isLastCycle ? "ending" : "break";
    
    return {
      phase,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      progress: breakElapsedMs / breakDurationMs,
      micAllowed: true,
      currentCycle: cycleIndex + 1,
      totalCycles: config.cycles,
      sessionStartedAt,
      serverTimeOffsetMs,
    };
  }
}

/**
 * Gets the next phase transition time
 */
export function getNextPhaseTransition(
  sessionStartedAt: string | null,
  config: RhythmConfig = defaultRhythmConfig,
  now: number = Date.now(),
  serverTimeOffsetMs: number = 0
): number | null {
  const state = computePhase(sessionStartedAt, config, now, serverTimeOffsetMs);
  
  if (state.phase === "waiting" || state.phase === "ended") {
    return null;
  }
  
  return now + state.remainingSeconds * 1000;
}