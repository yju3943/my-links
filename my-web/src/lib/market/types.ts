/** 시계열 한 점. t 는 "YYYY-MM-DD". */
export type Point = { t: string; v: number };

export type Unit = "index" | "pct" | "usd" | "krw";

/** 지수·원자재·환율처럼 "현재값 + 전일 대비 + 추세"로 보는 값. */
export type Quote = {
  key: string;
  label: string;
  symbol: string;
  value: number;
  prev: number;
  changePct: number;
  asOf: string;
  unit: Unit;
  points: Point[];
};

/** 등락률 상위 종목 한 줄. */
export type Mover = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  volume: number;
};

export type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
  lang: "ko" | "en";
  tickers: string[];
};

export type CalendarEvent = {
  date: string;
  time?: string;
  kind: "FOMC" | "CPI" | "PCE" | "JOBS" | "GDP" | "기타";
  title: string;
  note?: string;
};

export type Source = "yahoo" | "fred" | "news" | "ai" | "file";

/**
 * 모든 로더의 반환 타입. 실패를 예외가 아니라 값으로 다뤄야
 * 한 섹션이 무너져도 나머지 섹션과 빌드가 살아남는다.
 */
export type Loaded<T> =
  | { ok: true; data: T; source: Source; asOf: string; note?: string }
  | { ok: false; reason: string };

export function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}
