import { fetchFredSeries, monthsAgo } from "@/lib/market/fred";
import { changePct, yoy } from "@/lib/market/series";
import {
  COMMODITY_SPECS,
  INDEX_SPECS,
  SECTOR_SPECS,
  fetchQuotes,
} from "@/lib/market/yahoo";
import { fail, type Loaded, type Point, type Quote } from "@/lib/market/types";

const QUOTE_REVALIDATE = 300;

/** 지표 한 줄. 값 + 추세 + 기준일. */
export type MacroRow = {
  key: string;
  label: string;
  value: number;
  changeAbs: number;
  suffix: string;
  points: Point[];
  asOf: string;
};

function toMacroRow(
  key: string,
  label: string,
  points: Point[],
  suffix: string,
): MacroRow | null {
  const last = points[points.length - 1];
  if (!last) return null;
  const prev = points[points.length - 2];

  return {
    key,
    label,
    value: last.v,
    changeAbs: prev ? last.v - prev.v : 0,
    suffix,
    points,
    asOf: last.t,
  };
}

export async function getIndexes(): Promise<Map<string, Loaded<Quote>>> {
  return fetchQuotes(INDEX_SPECS, { revalidate: QUOTE_REVALIDATE, tag: "market:quotes" });
}

export async function getCommodities(): Promise<Map<string, Loaded<Quote>>> {
  return fetchQuotes(COMMODITY_SPECS, { revalidate: QUOTE_REVALIDATE, tag: "market:quotes" });
}

export async function getSectors(): Promise<Loaded<Quote[]>> {
  const rows = await fetchQuotes(SECTOR_SPECS, {
    range: "3mo",
    revalidate: QUOTE_REVALIDATE,
    tag: "market:quotes",
  });

  const sectors: Quote[] = [];
  for (const spec of SECTOR_SPECS) {
    const row = rows.get(spec.key);
    if (row?.ok) sectors.push(row.data);
  }

  if (sectors.length === 0) return fail("섹터 시세를 불러오지 못했습니다.");
  return { ok: true, data: sectors, source: "yahoo", asOf: sectors[0].asOf };
}

export type RatesData = {
  target: { lower: number; upper: number; asOf: string } | null;
  rows: MacroRow[];
  spread: Point[];
  twoYear: Point[];
  tenYear: Point[];
  inverted: boolean;
};

/** 금리는 FRED 만 제대로 다룬다. 야후에는 2년물도, 장단기 스프레드도 없다. */
export async function getRates(): Promise<Loaded<RatesData>> {
  const start = monthsAgo(24);
  const [upper, lower, dgs2, dgs10, spread] = await Promise.all([
    fetchFredSeries("DFEDTARU", { start }),
    fetchFredSeries("DFEDTARL", { start }),
    fetchFredSeries("DGS2", { start }),
    fetchFredSeries("DGS10", { start }),
    fetchFredSeries("T10Y2Y", { start }),
  ]);

  const rows: MacroRow[] = [];
  if (dgs2.ok) {
    const r = toMacroRow("dgs2", "미국 2년물", dgs2.data, "%");
    if (r) rows.push(r);
  }
  if (dgs10.ok) {
    const r = toMacroRow("dgs10", "미국 10년물", dgs10.data, "%");
    if (r) rows.push(r);
  }
  if (spread.ok) {
    const r = toMacroRow("spread", "10년−2년 스프레드", spread.data, "%p");
    if (r) rows.push(r);
  }

  if (rows.length === 0) return fail("금리 지표를 불러오지 못했습니다.");

  const spreadPoints = spread.ok ? spread.data : [];
  const latestSpread = spreadPoints[spreadPoints.length - 1];

  return {
    ok: true,
    source: "fred",
    asOf: rows[0].asOf,
    data: {
      target:
        upper.ok && lower.ok
          ? {
              upper: upper.data[upper.data.length - 1].v,
              lower: lower.data[lower.data.length - 1].v,
              asOf: upper.data[upper.data.length - 1].t,
            }
          : null,
      rows,
      spread: spreadPoints,
      twoYear: dgs2.ok ? dgs2.data : [],
      tenYear: dgs10.ok ? dgs10.data : [],
      inverted: latestSpread ? latestSpread.v < 0 : false,
    },
  };
}

/** 물가지수는 원값이 아니라 전년 대비 상승률로 봐야 뜻이 읽힌다. */
export async function getInflationJobs(): Promise<Loaded<MacroRow[]>> {
  const start = monthsAgo(60);
  const [cpi, core, pce, unrate, payems] = await Promise.all([
    fetchFredSeries("CPIAUCSL", { start }),
    fetchFredSeries("CPILFESL", { start }),
    fetchFredSeries("PCEPI", { start }),
    fetchFredSeries("UNRATE", { start }),
    fetchFredSeries("PAYEMS", { start }),
  ]);

  const rows: MacroRow[] = [];
  const push = (r: MacroRow | null) => {
    if (r) rows.push(r);
  };

  if (cpi.ok) push(toMacroRow("cpi", "소비자물가 (전년비)", yoy(cpi.data), "%"));
  if (core.ok) push(toMacroRow("core", "근원 소비자물가 (전년비)", yoy(core.data), "%"));
  if (pce.ok) push(toMacroRow("pce", "PCE 물가 (전년비)", yoy(pce.data), "%"));
  if (unrate.ok) push(toMacroRow("unrate", "실업률", unrate.data, "%"));

  if (payems.ok) {
    // 고용은 총원 수준이 아니라 월간 증감이 뉴스가 된다.
    const diff = payems.data.slice(1).map((p, i) => ({
      t: p.t,
      v: p.v - payems.data[i].v,
    }));
    push(toMacroRow("payems", "비농업 고용 증감 (천명)", diff, "천명"));
  }

  if (rows.length === 0) return fail("물가·고용 지표를 불러오지 못했습니다.");
  return { ok: true, data: rows, source: "fred", asOf: rows[0].asOf };
}

/** 브리핑에 넘길 매크로 요약 한 줄들. */
export function macroHighlights(
  commodities: Map<string, Loaded<Quote>>,
  rates: Loaded<RatesData>,
): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];

  const wti = commodities.get("wti");
  if (wti?.ok) out.push({ label: "WTI 유가", text: `$${wti.data.value.toFixed(2)} (${wti.data.changePct.toFixed(2)}%)` });

  const dxy = commodities.get("dxy");
  if (dxy?.ok) out.push({ label: "달러인덱스", text: `${dxy.data.value.toFixed(2)} (${dxy.data.changePct.toFixed(2)}%)` });

  if (rates.ok) {
    const ten = rates.data.rows.find((r) => r.key === "dgs10");
    if (ten) out.push({ label: "미 10년물", text: `${ten.value.toFixed(2)}% (${ten.changeAbs >= 0 ? "+" : ""}${ten.changeAbs.toFixed(2)}%p)` });
  }

  return out;
}

export { changePct };
