import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import PageFallback from "@/components/PageFallback";
import SEO from "@/components/SEO";
import { usernameForId } from "@/lib/profiles";
import PublicProfile from "./PublicProfile";

/**
 * Old links point at /profile/:id. Everyone now has one profile address,
 * /p/:username, so send them there. People who haven't picked a username yet
 * keep the old page.
 */
export default function ProfileById() {
  const { id } = useParams<{ id: string }>();
  const [resolved, setResolved] = useState<{ id: string; username: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void usernameForId(id).then((username) => {
      if (!cancelled) setResolved({ id, username });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <Navigate to="/feed" replace />;
  if (!resolved || resolved.id !== id) return <PageFallback />;
  if (resolved.username) {
    return <Navigate to={`/p/${encodeURIComponent(resolved.username)}`} replace />;
  }

  return (
    <>
      <SEO dynamicParams={{ id }} />
      <PublicProfile />
    </>
  );
}
