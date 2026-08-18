import fs from "node:fs/promises";
import path from "node:path";
import { fail, type CalendarEvent, type Loaded } from "@/lib/market/types";

const FILE = path.join(process.cwd(), "data", "market-calendar.json");

const KINDS = new Set(["FOMC", "CPI", "PCE", "JOBS", "GDP", "기타"]);

function isEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === "string" &&
    typeof v.title === "string" &&
    typeof v.kind === "string" &&
    KINDS.has(v.kind)
  );
}

export type CalendarData = {
  events: CalendarEvent[];
  updatedThrough: string;
  /** 입력해 둔 일정이 다 소진됐다는 뜻. 화면에서 갱신을 안내한다. */
  stale: boolean;
};

/**
 * 무료 경제 캘린더 API 가 없어 손으로 관리하는 파일을 읽는다.
 * data/links.json 을 읽는 lib/links.ts 와 같은 방식.
 */
export async function getUpcomingEvents(limit = 8): Promise<Loaded<CalendarData>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return fail("일정 데이터를 읽지 못했습니다.");
    }

    const obj = parsed as Record<string, unknown>;
    const updatedThrough = typeof obj.updatedThrough === "string" ? obj.updatedThrough : "";
    const all = Array.isArray(obj.events) ? obj.events.filter(isEvent) : [];

    const today = new Date().toISOString().slice(0, 10);
    const events = all
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);

    return {
      ok: true,
      source: "file",
      asOf: updatedThrough,
      data: {
        events,
        updatedThrough,
        stale: events.length === 0 || (updatedThrough !== "" && updatedThrough < today),
      },
    };
  } catch {
    return fail("일정 데이터를 읽지 못했습니다.");
  }
}
