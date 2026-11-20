import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

/**
 * Keeps a `room_participants` row for us while `roomName` is set, and takes it away when it is
 * cleared or the component unmounts. Pass `undefined` until the user is actually in the room, so
 * a camera preview or a rejected join never shows up in the rooms list or starts its clock.
 */
export function useRoomPresence(
  roomName: string | undefined,
  onJoinFailed?: () => void,
) {
  // The join effect must only re-run for a new room, so it reads the latest callback through a ref.
  const onJoinFailedRef = useRef(onJoinFailed);
  useEffect(() => {
    onJoinFailedRef.current = onJoinFailed;
  });

  useEffect(() => {
    if (!roomName) return;
    const room = roomName;

    // Per run of this effect, so a leave that overtakes a slow join still cleans up after it.
    let cancelled = false;
    let participantId: string | null = null;
    let userId: string | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const fail = () => {
      if (!cancelled) onJoinFailedRef.current?.();
    };

    async function removeRow(id: string | null, uid: string) {
      if (id) {
        const { error } = await supabase.from("room_participants").delete().eq("id", id);
        if (!error) return;
      }
      await supabase
        .from("room_participants")
        .delete()
        .eq("user_id", uid)
        .eq("room_name", room);
    }

    async function join() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userError || !user) return fail();

        userId = user.id;

        await supabase
          .from("room_participants")
          .delete()
          .eq("user_id", user.id)
          .eq("room_name", room);
        if (cancelled) return;

        const { data, error: insertError } = await supabase
          .from("room_participants")
          .insert({
            room_name: room,
            user_id: user.id,
            joined_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !data) return fail();
        participantId = data.id as string;
        // Left while the insert was in flight: take the row straight back out.
        if (cancelled) return void removeRow(participantId, user.id);

        const { data: verify, error: verifyError } = await supabase
          .from("room_participants")
          .select("id")
          .eq("id", data.id)
          .single();
        if (cancelled) return;
        if (verifyError || !verify) {
          void removeRow(participantId, user.id);
          return fail();
        }

        heartbeat = setInterval(() => {
          if (!participantId) return;
          void supabase
            .from("room_participants")
            .update({ last_seen: new Date().toISOString() })
            .eq("id", participantId);
        }, 30000);

        const { error } = await supabase.rpc("start_room_session_if_not_started", {
          p_room_name: room,
        });
        if (error) console.error("start_room_session error:", error);
      } catch (err) {
        console.error("Room join failed:", err);
        fail();
      }
    }

    void join();

    const onUnload = () => {
      if (participantId) {
        void supabase.from("room_participants").delete().eq("id", participantId);
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      window.removeEventListener("beforeunload", onUnload);
      // A join still in flight sees `cancelled` and removes its own row once its insert lands.
      if (userId && participantId) void removeRow(participantId, userId);
    };
  }, [roomName]);
}
