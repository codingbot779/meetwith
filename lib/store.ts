import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventInput, MeetingEvent, Participant } from "./types";

const globalStore = globalThis as unknown as { meetings?: Map<string, MeetingEvent>; adminHashes?: Map<string, string> };
const memory = globalStore.meetings ?? new Map<string, MeetingEvent>();
globalStore.meetings = memory;
const memoryAdminHashes = globalStore.adminHashes ?? new Map<string, string>();
globalStore.adminHashes = memoryAdminHashes;

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

let supabase: SupabaseClient | null = null;

function apiKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
}

function database() {
  const url = process.env.SUPABASE_URL;
  const key = apiKey();
  if (!url || !key) return null;
  if (!supabase) {
    supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return supabase;
}

export function hasDatabase() {
  return Boolean(process.env.SUPABASE_URL && apiKey());
}

export async function createEvent(input: EventInput) {
  const event: MeetingEvent = {
    ...input,
    id: crypto.randomUUID().replaceAll("-", "").slice(0, 10),
    createdAt: new Date().toISOString(),
    participants: [],
  };
  // 모임을 만든 사람에게만 전달되는 관리자 키. DB에는 해시만 저장합니다.
  const adminToken = randomBytes(24).toString("base64url");
  const adminTokenHash = hashToken(adminToken);
  const db = database();
  if (db) {
    const { error } = await db.from("meetings").insert({ id: event.id, data: event, admin_token_hash: adminTokenHash });
    if (error) throw error;
  } else {
    memory.set(event.id, event);
    memoryAdminHashes.set(event.id, adminTokenHash);
  }
  return { event, adminToken };
}

export async function getEvent(id: string): Promise<MeetingEvent | null> {
  const db = database();
  if (db) {
    const { data, error } = await db.from("meetings").select("data").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? (data.data as MeetingEvent) : null;
  }
  return memory.get(id) ?? null;
}

async function saveEvent(event: MeetingEvent) {
  const db = database();
  if (db) {
    const { error } = await db.from("meetings").update({ data: event }).eq("id", event.id);
    if (error) throw error;
  } else {
    memory.set(event.id, event);
  }
}

export async function saveParticipant(eventId: string, participantId: string | undefined, name: string, slots: string[]) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const existing = participantId ? event.participants.find((person) => person.id === participantId) : undefined;
  const participant: Participant = {
    id: existing?.id ?? crypto.randomUUID(),
    name: name.trim(),
    slots: [...new Set(slots)].sort(),
    updatedAt: new Date().toISOString(),
  };
  event.participants = existing
    ? event.participants.map((person) => (person.id === existing.id ? participant : person))
    : [...event.participants, participant];
  await saveEvent(event);
  return { event, participant };
}

export async function removeParticipant(eventId: string, participantId: string) {
  const event = await getEvent(eventId);
  if (!event) return null;
  event.participants = event.participants.filter((person) => person.id !== participantId);
  await saveEvent(event);
  return event;
}

/** 관리자 키가 일치할 때만 삭제합니다. 삭제되면 true, 키가 틀리면 false. */
export async function deleteEvent(id: string, adminToken: string) {
  const db = database();
  if (db) {
    const { data, error } = await db.rpc("delete_meeting", { meeting_id: id, admin_token: adminToken });
    if (error) throw error;
    return data === true;
  }
  const stored = memoryAdminHashes.get(id);
  if (!stored || !timingSafeEqual(Buffer.from(stored), Buffer.from(hashToken(adminToken)))) return false;
  memoryAdminHashes.delete(id);
  return memory.delete(id);
}
