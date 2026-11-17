import { supabase } from "./supabase";
import { withTimeout } from "./load";

export type AllyStatus = "none" | "pending_sent" | "pending_received" | "accepted";

interface AllyRow {
  requester_id: string;
  receiver_id: string;
  status?: string;
}

/** The other person in each accepted ally row, without duplicates or yourself. */
export function allyIdsFrom(rows: AllyRow[], myId: string): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const other = row.requester_id === myId ? row.receiver_id : row.requester_id;
    if (other && other !== myId) ids.add(other);
  }
  return [...ids];
}

/** Everyone you are allied with (accepted both ways). Throws on failure. */
export async function fetchAllyIds(myId: string): Promise<string[]> {
  const { data, error } = await withTimeout(
    supabase
      .from("allies")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`),
  );
  if (error) throw error;
  return allyIdsFrom((data ?? []) as AllyRow[], myId);
}

/** Your relationship with one other person. */
export function allyStatusFrom(row: AllyRow | null, myId: string): AllyStatus {
  if (!row) return "none";
  if (row.status === "accepted") return "accepted";
  if (row.status === "pending") return row.requester_id === myId ? "pending_sent" : "pending_received";
  return "none";
}

export async function fetchAllyStatus(myId: string, otherId: string): Promise<AllyStatus> {
  const { data, error } = await withTimeout(
    supabase
      .from("allies")
      .select("requester_id, receiver_id, status")
      .or(
        `and(requester_id.eq.${myId},receiver_id.eq.${otherId}),and(requester_id.eq.${otherId},receiver_id.eq.${myId})`,
      )
      .maybeSingle(),
  );
  if (error) throw error;
  return allyStatusFrom((data as AllyRow | null) ?? null, myId);
}

export async function countAllies(userId: string): Promise<number> {
  const { count, error } = await withTimeout(
    supabase
      .from("allies")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted"),
  );
  if (error) throw error;
  return count ?? 0;
}

export async function sendAllyRequest(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase.from("allies").insert({ requester_id: myId, receiver_id: otherId });
  if (error) throw error;
}

export async function acceptAllyRequest(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase
    .from("allies")
    .update({ status: "accepted" })
    .eq("requester_id", otherId)
    .eq("receiver_id", myId);
  if (error) throw error;
}

/** Withdraws a request you sent, or ends an alliance, in either direction. */
export async function removeAlly(myId: string, otherId: string): Promise<void> {
  const { error } = await supabase
    .from("allies")
    .delete()
    .or(
      `and(requester_id.eq.${myId},receiver_id.eq.${otherId}),and(requester_id.eq.${otherId},receiver_id.eq.${myId})`,
    );
  if (error) throw error;
}
