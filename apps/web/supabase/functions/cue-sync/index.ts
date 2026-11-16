// SkillHive — Cue device sync endpoint.
//
// Called by the Cue program on a user's computer, not by the browser. Requests
// are authenticated by the device's own Ed25519 signature rather than a
// Supabase JWT, so this function must be deployed with JWT verification off:
//
//   supabase functions deploy cue-sync --no-verify-jwt
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase)
// and CUE_LINK_ORIGIN, the web origin that serves /link (e.g. https://skillhiive.com).
//
// All request handling lives in ../_shared/cue-sync-core.ts; this file only
// connects it to the database.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEVICE_WINDOW_SECONDS, MAX_DEVICE_REQUESTS, handleCueSync } from "../_shared/cue-sync-core.ts";
import type { CueSyncStore, DeviceRow, LinkRow } from "../_shared/cue-sync-core.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const store: CueSyncStore = {
  async countRecentLinks(ipHash, sinceIso) {
    const { count, error } = await supabaseAdmin
      .from("cue_links")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gt("created_at", sinceIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async createLink(link) {
    const row = must(
      await supabaseAdmin
        .from("cue_links")
        .insert({
          user_code_hash: link.userCodeHash,
          public_key: link.publicKey,
          device_name: link.deviceName,
          platform: link.platform,
          ip_hash: link.ipHash,
          expires_at: link.expiresAt,
        })
        .select("id")
        .single(),
    );
    return row.id as string;
  },

  async getLink(id): Promise<LinkRow | null> {
    const row = must(
      await supabaseAdmin
        .from("cue_links")
        .select("id, public_key, expires_at, approved_at, approved_by, device_id")
        .eq("id", id)
        .maybeSingle(),
    );
    if (!row) return null;
    return {
      id: row.id,
      publicKey: row.public_key,
      expiresAt: row.expires_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      deviceId: row.device_id,
    };
  },

  async getDevice(id): Promise<DeviceRow | null> {
    // A malformed id is simply an unknown device, not a server error.
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const row = must(
      await supabaseAdmin
        .from("cue_devices")
        .select("id, user_id, public_key, revoked_at")
        .eq("id", id)
        .maybeSingle(),
    );
    if (!row) return null;
    return { id: row.id, userId: row.user_id, publicKey: row.public_key, revokedAt: row.revoked_at };
  },

  async usernameOf(userId) {
    const row = must(
      await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle(),
    );
    return (row?.username as string | null) ?? null;
  },

  async writeDays(device, projects, days) {
    const now = new Date().toISOString();
    if (projects.length > 0) {
      must(
        await supabaseAdmin.from("cue_projects").upsert(
          projects.map((project) => ({
            user_id: device.userId,
            device_id: device.id,
            project_key: project.key,
            name: project.name,
            remote: project.remote,
            updated_at: now,
          })),
          { onConflict: "device_id,project_key" },
        ),
      );
    }
    if (days.length > 0) {
      must(
        await supabaseAdmin.from("cue_project_days").upsert(
          days.map((day) => ({
            user_id: device.userId,
            device_id: device.id,
            project_key: day.projectKey,
            date: day.date,
            seconds: day.seconds,
            agent_seconds: day.agentSeconds,
            sources: day.sources,
            languages: day.languages,
            commits: day.commits,
            updated_at: now,
          })),
          { onConflict: "device_id,project_key,date" },
        ),
      );
    }
  },

  async unpublish(device, projectKey) {
    must(
      await supabaseAdmin
        .from("cue_project_days")
        .delete()
        .eq("device_id", device.id)
        .eq("project_key", projectKey),
    );
    must(
      await supabaseAdmin
        .from("cue_projects")
        .delete()
        .eq("device_id", device.id)
        .eq("project_key", projectKey),
    );
  },

  async revokeDevice(device) {
    must(
      await supabaseAdmin
        .from("cue_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", device.id),
    );
  },

  async allowRequest(device) {
    const allowed = must(
      await supabaseAdmin.rpc("cue_device_allow", {
        p_device_id: device.id,
        p_limit: MAX_DEVICE_REQUESTS,
        p_window_seconds: DEVICE_WINDOW_SECONDS,
      }),
    );
    return allowed === true;
  },

  async afterSync(device) {
    must(
      await supabaseAdmin.rpc("cue_after_sync", {
        p_user_id: device.userId,
        p_device_id: device.id,
      }),
    );
  },
};

Deno.serve((request: Request) =>
  handleCueSync(request, store, {
    webOrigin: Deno.env.get("CUE_LINK_ORIGIN") ?? "https://skillhiive.com",
    now: () => Date.now(),
  }),
);
