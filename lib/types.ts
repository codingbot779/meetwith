export type MapRegion = "domestic" | "overseas";

export type LocationInfo = {
  name: string;
  address: string;
  region: MapRegion;
};

export type Participant = {
  id: string;
  name: string;
  slots: string[];
  updatedAt: string;
};

export type MeetingEvent = {
  id: string;
  title: string;
  description: string;
  dates: string[];
  startTime: string;
  endTime: string;
  slotMinutes: number;
  location: LocationInfo | null;
  createdAt: string;
  participants: Participant[];
};

export type EventInput = Omit<MeetingEvent, "id" | "createdAt" | "participants">;

export function slotKey(date: string, time: string) {
  return `${date}T${time}`;
}

export function timeSlots(startTime: string, endTime: string, interval: number) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const result: string[] = [];
  for (let value = start; value < end; value += interval) {
    result.push(`${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`);
  }
  return result;
}
