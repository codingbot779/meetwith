import { NextResponse } from "next/server";
import { getEvent, hasDatabase } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ event, persistent: hasDatabase() });
}
