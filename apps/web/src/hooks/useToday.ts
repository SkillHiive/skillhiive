import { useCallback, useEffect, useMemo, useState } from "react";

export type TaskStatus = "queued" | "done" | "carried";

export interface TodayTask {
  id: string;
  text: string;
  estimateMin: number;
  status: TaskStatus;
  actualMin?: number;
  shipped?: string;
  blockers?: string;
  createdAt: number;
}

export interface CarryTask {
  id: string;
  text: string;
  estimateMin: number;
}

export interface CaptureNote {
  id: string;
  text: string;
  createdAt: number;
}

export interface TodayState {
  date: string;
  tasks: TodayTask[];
  carryFrom: CarryTask[];
  captures: CaptureNote[];
}

export interface TodaySummary {
  queued: number;
  done: number;
  carried: number;
  unplanned: number;
  estimatedMin: number;
  actualMin: number;
}

const KEY = "skillhive:today:v1";

export const ESTIMATE_OPTIONS = [15, 30, 45, 60, 90, 120, 180] as const;

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function emptyState(): TodayState {
  return { date: todayKey(), tasks: [], carryFrom: [], captures: [] };
}

function toCarry(t: unknown): CarryTask | null {
  if (!t || typeof t !== "object") return null;
  const { id, text, estimateMin } = t as Partial<CarryTask>;
  if (typeof id !== "string" || typeof text !== "string" || !text.trim()) {
    return null;
  }
  return {
    id,
    text,
    estimateMin: typeof estimateMin === "number" ? estimateMin : 30,
  };
}

/**
 * Restore the saved state for `today`. On a new day, everything unfinished
 * carries forward: the last saved day's open tasks plus carry items that were
 * never added or dismissed, so a skipped day loses nothing.
 */
export function restoreToday(raw: string | null, today: string): TodayState {
  const empty: TodayState = {
    date: today,
    tasks: [],
    carryFrom: [],
    captures: [],
  };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<TodayState> | null;
    if (!parsed || typeof parsed !== "object") return empty;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const carryFrom = Array.isArray(parsed.carryFrom) ? parsed.carryFrom : [];
    if (parsed.date === today) {
      return {
        date: today,
        tasks,
        carryFrom,
        captures: Array.isArray(parsed.captures) ? parsed.captures : [],
      };
    }
    const seen = new Set<string>();
    const carried: CarryTask[] = [];
    for (const item of [
      ...carryFrom,
      ...tasks.filter((t: TodayTask) => t?.status !== "done"),
    ]) {
      const c = toCarry(item);
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      carried.push(c);
    }
    return { ...empty, carryFrom: carried };
  } catch {
    return empty;
  }
}

/**
 * The tasks with the queued ones in the order of `ids` (a drag-and-drop result).
 * Queued tasks missing from `ids` keep their place after the listed ones; unknown
 * ids are ignored; done and carried tasks are untouched.
 */
export function orderQueue(tasks: TodayTask[], ids: string[]): TodayTask[] {
  const queued = tasks.filter((t) => t.status === "queued");
  const byId = new Map(queued.map((t) => [t.id, t]));
  const ordered: TodayTask[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (t) {
      ordered.push(t);
      byId.delete(id);
    }
  }
  for (const t of queued) if (byId.has(t.id)) ordered.push(t);
  return [...ordered, ...tasks.filter((t) => t.status !== "queued")];
}

function loadState(): TodayState {
  if (typeof window === "undefined") return emptyState();
  try {
    return restoreToday(window.localStorage.getItem(KEY), todayKey());
  } catch {
    return emptyState();
  }
}

/**
 * The solo daily driver — "what must happen today?".
 * State is persisted to localStorage (offline-first) and rolled over each day.
 */
export function useToday() {
  const [state, setState] = useState<TodayState>(loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [state]);

  const addTask = useCallback((text: string, estimateMin: number) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: makeId(),
          text: trimmed,
          estimateMin,
          status: "queued",
          createdAt: Date.now(),
        },
      ],
    }));
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<TodayTask>) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [],
  );

  const removeTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }, []);

  const moveTask = useCallback((id: string, dir: -1 | 1) => {
    setState((prev) => {
      const queued = prev.tasks.filter((t) => t.status === "queued");
      const idx = queued.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= queued.length) return prev;
      const current = queued[idx];
      const swapped = queued[next];
      if (!current || !swapped) return prev;
      queued[idx] = swapped;
      queued[next] = current;
      const queuedIds = new Set(queued.map((t) => t.id));
      return {
        ...prev,
        tasks: [
          ...queued,
          ...prev.tasks.filter((t) => !queuedIds.has(t.id)),
        ],
      };
    });
  }, []);

  const reorderTask = useCallback((id: string, toIndex: number) => {
    setState((prev) => {
      const queued = prev.tasks.filter((t) => t.status === "queued");
      const from = queued.findIndex((t) => t.id === id);
      if (from === -1) return prev;
      const clamped = Math.max(0, Math.min(queued.length - 1, toIndex));
      if (clamped === from) return prev;
      const next = [...queued];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(clamped, 0, item);
      const queuedIds = new Set(next.map((t) => t.id));
      return {
        ...prev,
        tasks: [
          ...next,
          ...prev.tasks.filter((t) => !queuedIds.has(t.id)),
        ],
      };
    });
  }, []);

  const setQueueOrder = useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, tasks: orderQueue(prev.tasks, ids) }));
  }, []);

  const completeTask = useCallback(
    (id: string, data: { actualMin: number; shipped: string; blockers: string }) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "done",
                actualMin: data.actualMin,
                shipped: data.shipped.trim(),
                blockers: data.blockers.trim(),
              }
            : t,
        ),
      }));
    },
    [],
  );

  const carryTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, status: "carried" } : t,
      ),
    }));
  }, []);

  const restoreTask = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, status: "queued" } : t,
      ),
    }));
  }, []);

  const addCarry = useCallback((carryId: string) => {
    setState((prev) => {
      const item = prev.carryFrom.find((c) => c.id === carryId);
      if (!item) return prev;
      return {
        ...prev,
        carryFrom: prev.carryFrom.filter((c) => c.id !== carryId),
        tasks: [
          ...prev.tasks,
          {
            id: makeId(),
            text: item.text,
            estimateMin: item.estimateMin,
            status: "queued",
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const dismissCarry = useCallback((carryId: string) => {
    setState((prev) => ({
      ...prev,
      carryFrom: prev.carryFrom.filter((c) => c.id !== carryId),
    }));
  }, []);

  const addCapture = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      captures: [
        ...prev.captures,
        { id: makeId(), text: trimmed, createdAt: Date.now() },
      ],
    }));
  }, []);

  const removeCapture = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      captures: prev.captures.filter((c) => c.id !== id),
    }));
  }, []);

  const summary = useMemo<TodaySummary>(() => {
    const done = state.tasks.filter((t) => t.status === "done");
    const queued = state.tasks.filter((t) => t.status === "queued");
    const carried = state.tasks.filter((t) => t.status === "carried");
    const estimatedMin = state.tasks.reduce((s, t) => s + (t.estimateMin || 0), 0);
    const actualMin = done.reduce((s, t) => s + (t.actualMin || 0), 0);
    return {
      queued: queued.length,
      done: done.length,
      carried: carried.length,
      unplanned: state.captures.length,
      estimatedMin,
      actualMin,
    };
  }, [state.tasks, state.captures]);

  return {
    date: state.date,
    tasks: state.tasks,
    carryFrom: state.carryFrom,
    captures: state.captures,
    summary,
    addTask,
    updateTask,
    removeTask,
    moveTask,
    reorderTask,
    setQueueOrder,
    completeTask,
    carryTask,
    restoreTask,
    addCarry,
    dismissCarry,
    addCapture,
    removeCapture,
  };
}
