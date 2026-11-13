import { NextResponse } from "next/server";
import { removeParticipant, saveParticipant } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { participantId?: string; name?: string; slots?: string[] };
    if (!body.name?.trim() || body.name.trim().length > 30) {
      return NextResponse.json({ error: "이름을 30자 이내로 입력해 주세요." }, { status: 400 });
    }
    if (!Array.isArray(body.slots) || body.slots.length > 2000) {
      return NextResponse.json({ error: "선택한 시간이 올바르지 않습니다." }, { status: 400 });
    }
    const result = await saveParticipant(id, body.participantId, body.name, body.slots);
    if (!result) return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "일정을 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { participantId?: string };
  if (!body.participantId) return NextResponse.json({ error: "참여자 정보가 없습니다." }, { status: 400 });
  const event = await removeParticipant(id, body.participantId);
  if (!event) return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ event });
}
