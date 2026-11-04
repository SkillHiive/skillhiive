// Supabase realtime subscriptions
import { getSupabaseClient } from "./client";

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export type RealtimeCallback<T> = (payload: T) => void;

export function subscribeToTable<T = any>(
  table: string,
  callback: RealtimeCallback<T>,
  filter?: { column: string; value: string }
): RealtimeSubscription {
  const client = getSupabaseClient();
  
  let channel = client.channel(`realtime:${table}`);
  
  if (filter) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${filter.column}=eq.${filter.value}`,
      },
      (payload) => callback(payload.new as T)
    );
  } else {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (payload) => callback(payload.new as T)
    );
  }
  
  channel.subscribe();
  
  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

export function subscribeToUserPresence(
  userId: string,
  callback: (presence: { user_id: string; status: string; room_id: string | null }) => void
): RealtimeSubscription {
  const client = getSupabaseClient();
  
  const channel = client.channel(`presence:${userId}`);
  
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // Handle presence sync
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      // Handle user joining
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      // Handle user leaving
    })
    .subscribe();
  
  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

interface RealtimePayload {
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export function subscribeToRoom(
  roomId: string,
  callbacks: {
    onParticipantJoin?: (participant: any) => void;
    onParticipantLeave?: (participant: any) => void;
    onPhaseChange?: (phase: any) => void;
  }
): RealtimeSubscription {
  const client = getSupabaseClient();
  
  const channel = client.channel(`room:${roomId}`);
  
  if (callbacks.onParticipantJoin) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_participants",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => callbacks.onParticipantJoin?.(payload.new)
    );
  }
  
  if (callbacks.onParticipantLeave) {
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "room_participants",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => callbacks.onParticipantLeave?.(payload.old)
    );
  }
  
  if (callbacks.onPhaseChange) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload: RealtimePayload) => {
        const newPhase = payload.new["phase"] as string | undefined;
        const oldPhase = payload.old["phase"] as string | undefined;
        if (newPhase !== oldPhase) {
          callbacks.onPhaseChange?.(payload.new);
        }
      }
    );
  }
  
  channel.subscribe();
  
  return {
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}