import type { Metadata } from "next";
import MeetingRoom from "@/components/MeetingRoom";

export const metadata: Metadata = { title: "모임 일정 맞추기" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingRoom eventId={id} />;
}
