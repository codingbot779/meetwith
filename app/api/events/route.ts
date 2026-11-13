import { NextResponse } from "next/server";
import { createEvent, hasDatabase } from "@/lib/store";
import type { EventInput } from "@/lib/types";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventInput;
    if (!body.title?.trim() || body.title.length > 80) {
      return NextResponse.json({ error: "모임 이름을 80자 이내로 입력해 주세요." }, { status: 400 });
    }
    if (!Array.isArray(body.dates) || body.dates.length < 1 || body.dates.length > 31 || !body.dates.every((date) => datePattern.test(date))) {
      return NextResponse.json({ error: "후보 날짜를 1~31개 선택해 주세요." }, { status: 400 });
    }
    if (!timePattern.test(body.startTime) || !timePattern.test(body.endTime) || body.startTime >= body.endTime) {
      return NextResponse.json({ error: "시작 시간은 종료 시간보다 빨라야 합니다." }, { status: 400 });
    }
    if (![30, 60].includes(body.slotMinutes)) {
      return NextResponse.json({ error: "시간 단위가 올바르지 않습니다." }, { status: 400 });
    }
    const { event, adminToken } = await createEvent({
      ...body,
      title: body.title.trim(),
      description: body.description?.trim().slice(0, 500) ?? "",
      dates: [...new Set(body.dates)].sort(),
      location: body.location?.name?.trim()
        ? { ...body.location, name: body.location.name.trim().slice(0, 100), address: body.location.address?.trim().slice(0, 200) ?? "" }
        : null,
    });
    return NextResponse.json({ event, adminToken, persistent: hasDatabase() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "모임을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
