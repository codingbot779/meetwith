import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventInput, MeetingEvent, Participant } from "./types";

const globalStore = globalThis as unknown as { meetings?: Map<string, MeetingEvent> };
const memory = globalStore.meetings ?? new Map<string, MeetingEvent>();
globalStore.meetings = memory;

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
  const db = database();
  if (db) {
    const { error } = await db.from("meetings").insert({ id: event.id, data: event });
    if (error) throw error;
  } else {
    memory.set(event.id, event);
  }
  return event;
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
