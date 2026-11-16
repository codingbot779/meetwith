import { NextResponse } from "next/server";
import { deleteEvent, getEvent, hasDatabase, setConfirmedSlot } from "@/lib/store";
import { slotKey, timeSlots } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ event, persistent: hasDatabase() });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { adminToken?: unknown };
    if (typeof body.adminToken !== "string" || !body.adminToken || body.adminToken.length > 100) {
      return NextResponse.json({ error: "모임을 만든 사람만 삭제할 수 있어요." }, { status: 403 });
    }
    if (!(await getEvent(id))) return NextResponse.json({ error: "이미 삭제되었거나 찾을 수 없는 모임입니다." }, { status: 404 });
    const deleted = await deleteEvent(id, body.adminToken);
    if (!deleted) return NextResponse.json({ error: "모임을 만든 사람만 삭제할 수 있어요." }, { status: 403 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "모임을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}

/** 모임을 만든 사람이 시간을 확정하거나(slot) 확정을 취소합니다(slot: null). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { adminToken?: unknown; slot?: unknown };
    if (typeof body.adminToken !== "string" || !body.adminToken || body.adminToken.length > 100) {
      return NextResponse.json({ error: "모임을 만든 사람만 확정할 수 있어요." }, { status: 403 });
    }
    if (body.slot !== null && typeof body.slot !== "string") {
      return NextResponse.json({ error: "확정할 시간이 올바르지 않습니다." }, { status: 400 });
    }
    const event = await getEvent(id);
    if (!event) return NextResponse.json({ error: "이미 삭제되었거나 찾을 수 없는 모임입니다." }, { status: 404 });
    if (body.slot !== null) {
      const valid = event.dates.some((date) => timeSlots(event.startTime, event.endTime, event.slotMinutes).some((time) => slotKey(date, time) === body.slot));
      if (!valid) return NextResponse.json({ error: "모임 일정에 없는 시간이에요." }, { status: 400 });
    }
    const updated = await setConfirmedSlot(id, body.adminToken, body.slot);
    if (!updated) return NextResponse.json({ error: "모임을 만든 사람만 확정할 수 있어요." }, { status: 403 });
    return NextResponse.json({ event: updated });
  } catch {
    return NextResponse.json({ error: "확정하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
