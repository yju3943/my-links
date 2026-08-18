import { cleanPoints, changePct, downsample } from "@/lib/market/series";
import { fail, type Loaded, type Point, type Quote, type Unit } from "@/lib/market/types";

const BASE = process.env.YAHOO_BASE ?? "https://query1.finance.yahoo.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export type YahooSpec = { key: string; symbol: string; label: string; unit: Unit };

type FetchOpts = { range?: string; revalidate: number; tag: string };

type YahooChartNode = {
  meta?: {
    regularMarketPrice?: number;
    regularMarketTime?: number;
    symbol?: string;
  };
  timestamp?: number[];
  indicators?: { quote?: { close?: (number | null)[] }[] };
};

/**
 * 야후 응답을 JSON 으로 읽는다. 차단당하면 JSON 이 아니라 HTML 챌린지 페이지가
 * 오기 때문에 content-type 까지 확인해야 조용한 오작동을 막을 수 있다.
 */
async function getJson(url: string, opts: FetchOpts): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    next: { revalidate: opts.revalidate, tags: [opts.tag] },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!(res.headers.get("content-type") ?? "").includes("json")) {
    throw new Error("JSON 이 아닌 응답");
  }
  return res.json();
}

/**
 * 전일 종가를 시계열에서 직접 뽑는다.
 * meta.chartPreviousClose 는 "조회 구간 시작 전" 종가(수개월 전)라 일간 등락률로 쓰면 안 된다.
 * 또 close 배열의 마지막 칸이 null 인데 regularMarketPrice 에는 당일 값이 들어있는 경우가 잦다.
 */
function toQuote(spec: YahooSpec, node: YahooChartNode): Quote | null {
  const price = node.meta?.regularMarketPrice;
  if (typeof price !== "number") return null;

  const cleaned = cleanPoints(node.timestamp, node.indicators?.quote?.[0]?.close);
  const last = cleaned[cleaned.length - 1];
  const prev =
    last && last.v === price
      ? cleaned[cleaned.length - 2]?.v
      : last?.v;

  // 당일 값이 시계열에 아직 없으면 직접 이어 붙여 차트 끝과 표시값을 일치시킨다.
  const points: Point[] =
    last && last.v === price
      ? cleaned
      : [...cleaned, { t: new Date().toISOString().slice(0, 10), v: price }];

  const asOf = node.meta?.regularMarketTime
    ? new Date(node.meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString();

  return {
    key: spec.key,
    label: spec.label,
    symbol: spec.symbol,
    value: price,
    prev: prev ?? price,
    changePct: changePct(prev ?? price, price),
    asOf,
    unit: spec.unit,
    points: downsample(points, 130),
  };
}

/**
 * spark 엔드포인트로 여러 심볼을 한 번에 받는다.
 * 응답 순서가 요청 순서와 다르므로 반드시 symbol 로 되짚어야 행이 뒤섞이지 않는다.
 */
export async function fetchSparkBatch(
  specs: YahooSpec[],
  opts: FetchOpts,
): Promise<Map<string, Loaded<Quote>>> {
  const out = new Map<string, Loaded<Quote>>();
  if (specs.length === 0) return out;

  const range = opts.range ?? "6mo";
  const symbols = specs.map((s) => s.symbol).join(",");
  const url = `${BASE}/v7/finance/spark?symbols=${encodeURIComponent(symbols)}&range=${range}&interval=1d`;

  try {
    const json = (await getJson(url, opts)) as {
      spark?: { result?: { symbol?: string; response?: YahooChartNode[] }[] };
    };

    const bySymbol = new Map<string, YahooChartNode>();
    for (const entry of json.spark?.result ?? []) {
      const node = entry.response?.[0];
      const symbol = entry.symbol ?? node?.meta?.symbol;
      if (symbol && node) bySymbol.set(symbol, node);
    }

    for (const spec of specs) {
      const node = bySymbol.get(spec.symbol);
      const quote = node ? toQuote(spec, node) : null;
      out.set(
        spec.key,
        quote
          ? { ok: true, data: quote, source: "yahoo", asOf: quote.asOf }
          : fail("시세를 불러오지 못했습니다."),
      );
    }
  } catch {
    for (const spec of specs) out.set(spec.key, fail("시세를 불러오지 못했습니다."));
  }

  return out;
}

/** 단일 심볼. spark 응답에서 빠진 종목을 다시 시도할 때 쓴다. */
export async function fetchChart(spec: YahooSpec, opts: FetchOpts): Promise<Loaded<Quote>> {
  const range = opts.range ?? "6mo";
  const url = `${BASE}/v8/finance/chart/${encodeURIComponent(spec.symbol)}?range=${range}&interval=1d`;

  try {
    const json = (await getJson(url, opts)) as { chart?: { result?: YahooChartNode[] } };
    const quote = json.chart?.result?.[0] ? toQuote(spec, json.chart.result[0]) : null;
    if (!quote) return fail("시세를 불러오지 못했습니다.");
    return { ok: true, data: quote, source: "yahoo", asOf: quote.asOf };
  } catch {
    return fail("시세를 불러오지 못했습니다.");
  }
}

/** spark 로 못 받은 항목만 chart 로 한 번 더 두드린다. */
export async function fetchQuotes(
  specs: YahooSpec[],
  opts: FetchOpts,
): Promise<Map<string, Loaded<Quote>>> {
  const first = await fetchSparkBatch(specs, opts);
  const missing = specs.filter((s) => !first.get(s.key)?.ok);
  if (missing.length === 0) return first;

  const retried = await Promise.all(missing.map((spec) => fetchChart(spec, opts)));
  missing.forEach((spec, i) => {
    if (retried[i].ok) first.set(spec.key, retried[i]);
  });
  return first;
}

export const INDEX_SPECS: YahooSpec[] = [
  { key: "sp500", symbol: "^GSPC", label: "S&P 500", unit: "index" },
  { key: "nasdaq", symbol: "^IXIC", label: "나스닥 종합", unit: "index" },
  { key: "dow", symbol: "^DJI", label: "다우존스", unit: "index" },
  { key: "russell", symbol: "^RUT", label: "러셀 2000", unit: "index" },
  { key: "vix", symbol: "^VIX", label: "VIX 변동성지수", unit: "index" },
];

export const COMMODITY_SPECS: YahooSpec[] = [
  { key: "wti", symbol: "CL=F", label: "WTI 유가", unit: "usd" },
  { key: "brent", symbol: "BZ=F", label: "브렌트유", unit: "usd" },
  { key: "gold", symbol: "GC=F", label: "금", unit: "usd" },
  { key: "natgas", symbol: "NG=F", label: "천연가스", unit: "usd" },
  { key: "dxy", symbol: "DX-Y.NYB", label: "달러인덱스", unit: "index" },
  { key: "usdkrw", symbol: "KRW=X", label: "원/달러", unit: "krw" },
];

/** SPDR 섹터 ETF 11종. 섹터별 자금 쏠림을 읽는 표준 도구다. */
export const SECTOR_SPECS: YahooSpec[] = [
  { key: "XLK", symbol: "XLK", label: "기술", unit: "usd" },
  { key: "XLF", symbol: "XLF", label: "금융", unit: "usd" },
  { key: "XLE", symbol: "XLE", label: "에너지", unit: "usd" },
  { key: "XLV", symbol: "XLV", label: "헬스케어", unit: "usd" },
  { key: "XLY", symbol: "XLY", label: "경기소비재", unit: "usd" },
  { key: "XLP", symbol: "XLP", label: "필수소비재", unit: "usd" },
  { key: "XLI", symbol: "XLI", label: "산업재", unit: "usd" },
  { key: "XLB", symbol: "XLB", label: "소재", unit: "usd" },
  { key: "XLU", symbol: "XLU", label: "유틸리티", unit: "usd" },
  { key: "XLRE", symbol: "XLRE", label: "부동산", unit: "usd" },
  { key: "XLC", symbol: "XLC", label: "커뮤니케이션", unit: "usd" },
];
