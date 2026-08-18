import { fetchQuotes, type YahooSpec } from "@/lib/market/yahoo";
import { fail, type Loaded, type Mover } from "@/lib/market/types";

const BASE = process.env.YAHOO_BASE ?? "https://query1.finance.yahoo.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export type ScreenerId = "day_gainers" | "day_losers" | "most_actives";

export const SCREENER_LABELS: Record<ScreenerId, string> = {
  day_gainers: "상승률 상위",
  day_losers: "하락률 상위",
  most_actives: "거래량 상위",
};

/** 스크리너가 막혔을 때 대신 보여줄 대형주. 최소한 "오늘 뭐가 움직였나"는 남는다. */
const MEGACAP: YahooSpec[] = [
  { key: "AAPL", symbol: "AAPL", label: "Apple", unit: "usd" },
  { key: "MSFT", symbol: "MSFT", label: "Microsoft", unit: "usd" },
  { key: "NVDA", symbol: "NVDA", label: "NVIDIA", unit: "usd" },
  { key: "AMZN", symbol: "AMZN", label: "Amazon", unit: "usd" },
  { key: "GOOGL", symbol: "GOOGL", label: "Alphabet", unit: "usd" },
  { key: "META", symbol: "META", label: "Meta", unit: "usd" },
  { key: "TSLA", symbol: "TSLA", label: "Tesla", unit: "usd" },
  { key: "AVGO", symbol: "AVGO", label: "Broadcom", unit: "usd" },
  { key: "JPM", symbol: "JPM", label: "JPMorgan", unit: "usd" },
  { key: "XOM", symbol: "XOM", label: "Exxon Mobil", unit: "usd" },
  { key: "LLY", symbol: "LLY", label: "Eli Lilly", unit: "usd" },
  { key: "WMT", symbol: "WMT", label: "Walmart", unit: "usd" },
];

type ScreenerQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
};

export async function fetchMovers(
  scrId: ScreenerId,
  count = 6,
  revalidate = 600,
): Promise<Loaded<Mover[]>> {
  const url = `${BASE}/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}`;

  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      next: { revalidate, tags: ["market:quotes"] },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get("content-type") ?? "").includes("json")) {
      throw new Error("JSON 이 아닌 응답");
    }

    const json = (await res.json()) as {
      finance?: { result?: { quotes?: ScreenerQuote[] }[] };
    };

    const movers: Mover[] = (json.finance?.result?.[0]?.quotes ?? [])
      .filter((q): q is ScreenerQuote & { symbol: string } => typeof q.symbol === "string")
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortName ?? q.longName ?? q.symbol,
        price: q.regularMarketPrice ?? 0,
        changePct: q.regularMarketChangePercent ?? 0,
        volume: q.regularMarketVolume ?? 0,
      }))
      .slice(0, count);

    if (movers.length === 0) throw new Error("빈 결과");
    return { ok: true, data: movers, source: "yahoo", asOf: new Date().toISOString() };
  } catch {
    return fail("종목 순위를 불러오지 못했습니다.");
  }
}

/**
 * 스크리너 3종을 한 번에. 전부 실패하면 대형주 워치리스트로 대신 채우고,
 * 그 사실을 note 로 남겨 화면이 출처를 숨기지 않게 한다.
 */
export async function fetchMoverBoard(): Promise<
  Loaded<{ gainers: Mover[]; losers: Mover[]; actives: Mover[] }>
> {
  const [gainers, losers, actives] = await Promise.all([
    fetchMovers("day_gainers"),
    fetchMovers("day_losers"),
    fetchMovers("most_actives"),
  ]);

  if (gainers.ok && losers.ok && actives.ok) {
    return {
      ok: true,
      source: "yahoo",
      asOf: gainers.asOf,
      data: { gainers: gainers.data, losers: losers.data, actives: actives.data },
    };
  }

  const quotes = await fetchQuotes(MEGACAP, { range: "5d", revalidate: 600, tag: "market:quotes" });
  const rows: Mover[] = [];
  for (const spec of MEGACAP) {
    const q = quotes.get(spec.key);
    if (!q?.ok) continue;
    rows.push({
      symbol: spec.symbol,
      name: spec.label,
      price: q.data.value,
      changePct: q.data.changePct,
      volume: 0,
    });
  }

  if (rows.length === 0) return fail("종목 순위를 불러오지 못했습니다.");

  const sorted = [...rows].sort((a, b) => b.changePct - a.changePct);
  return {
    ok: true,
    source: "yahoo",
    asOf: new Date().toISOString(),
    note: "야후 순위 조회가 막혀 대형주 워치리스트 기준으로 대신 표시합니다.",
    data: {
      gainers: sorted.slice(0, 6),
      losers: [...sorted].reverse().slice(0, 6),
      actives: [],
    },
  };
}
