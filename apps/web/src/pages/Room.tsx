import { Navigate, useLocation, useParams } from "react-router";
import { useProfile } from "@/hooks/useProfile";
import { useActiveRooms } from "@/hooks/useActiveRooms";
import { useRoomCall } from "@/hooks/roomCall";
import { lastClockOffset, roomSlug } from "@/lib/room";
import { PreJoin } from "@/components/rooms/PreJoin";

/**
 * `/rooms/:roomName`: the pre-join screen, then the room. The call itself lives above the routes
 * (RoomCallProvider), so it keeps going when you open another page; here it shows full size.
 * Old free-text links move to the name the token server accepts.
 */
export default function RoomRoute() {
  const { roomName = "" } = useParams<{ roomName: string }>();
  const slug = roomSlug(roomName);
  const call = useRoomCall();
  const location = useLocation();
  // Home's "start in a room" sends the task along in the navigation, never in storage.
  const sent = (location.state as { task?: { text?: unknown } } | null)?.task;
  const task = typeof sent?.text === "string" && sent.text.trim() ? { text: sent.text } : null;
  const inThisRoom = call.active?.roomName === slug;
  const { profile } = useProfile();
  const { rooms } = useActiveRooms(!inThisRoom);

  if (!slug) return <Navigate to="/rooms" replace />;
  if (slug !== roomName) return <Navigate to={`/rooms/${encodeURIComponent(slug)}`} replace />;
  // The call draws the room over this page.
  if (inThisRoom) return null;

  const listed = rooms.find((r) => r.room_name === slug) ?? null;
  return (
    <PreJoin
      key={slug}
      roomName={slug}
      username={profile?.username ?? ""}
      avatar={profile?.avatar ?? null}
      count={listed?.participant_count ?? null}
      sessionStartedAt={listed?.session_started_at ?? null}
      clockOffsetMs={lastClockOffset()}
      onJoin={(withCam, frontCam) => call.start({ roomName: slug, withCam, frontCam, task })}
    />
  );
}
