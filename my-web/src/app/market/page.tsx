import { CalendarList } from "@/components/market/calendar-list";
import { MacroRowItem } from "@/components/market/macro-row";
import { MoverList } from "@/components/market/mover-list";
import { NewsBrief } from "@/components/market/news-brief";
import { QuoteList } from "@/components/market/quote-row";
import { MarketSection, SectionFallback } from "@/components/market/section";
import { SectorGrid } from "@/components/market/sector-grid";
import { SparkLine } from "@/components/market/spark-line";
import { generateMarketBrief, isBriefConfigured } from "@/lib/market/brief";
import { getUpcomingEvents } from "@/lib/market/calendar";
import { collectMarketNews } from "@/lib/market/news";
import {
  getCommodities,
  getIndexes,
  getInflationJobs,
  getRates,
  getSectors,
  macroHighlights,
} from "@/lib/market/quotes";
import { fetchMoverBoard } from "@/lib/market/screener";
import { formatAsOf } from "@/lib/market/series";
import { COMMODITY_SPECS, INDEX_SPECS } from "@/lib/market/yahoo";
import type { Quote } from "@/lib/market/types";

export const metadata = {
  title: "미국 증시",
  description: "미국 주요 지수·섹터·금리·유가·물가를 한 화면에서 봅니다.",
};

export const revalidate = 300;

export default async function MarketPage() {
  const [indexes, sectors, movers, commodities, rates, macro, calendar] = await Promise.all([
    getIndexes(),
    getSectors(),
    fetchMoverBoard(),
    getCommodities(),
    getRates(),
    getInflationJobs(),
    getUpcomingEvents(),
  ]);

  const indexQuotes: Quote[] = INDEX_SPECS.map((s) => indexes.get(s.key))
    .filter((r) => r?.ok === true)
    .map((r) => (r as { ok: true; data: Quote }).data);

  const sectorList = sectors.ok ? sectors.data : [];
  const ranked = [...sectorList].sort((a, b) => b.changePct - a.changePct);

  // 가장 강한 두 섹터와 가장 약한 한 섹터. "왜 움직였나"는 대개 이 셋에 걸려 있다.
  const focusSectors = [...ranked.slice(0, 2), ...ranked.slice(-1)].map((s) => s.key);

  const news = await collectMarketNews(
    focusSectors,
    movers.ok ? movers.data.gainers.slice(0, 2).map((m) => m.symbol) : [],
  );
  const newsItems = news.ok ? news.data : [];

  const brief = await generateMarketBrief({
    indexes: indexQuotes,
    sectors: sectorList,
    gainers: movers.ok ? movers.data.gainers : [],
    losers: movers.ok ? movers.data.losers : [],
    macro: macroHighlights(commodities, rates),
    news: newsItems,
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">미국 증시</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          지수와 섹터가 어떻게 움직였는지, 그 배경에 어떤 뉴스가 있었는지, 그리고 금리·유가·물가가
          어디에 있는지를 한 화면에 모았습니다.
        </p>
      </header>

      <div className="viz mt-14 space-y-14">
        <MarketSection title="지수" note="6개월 추이 · 일 종가 기준">
          <QuoteList specs={INDEX_SPECS} rows={indexes} />
        </MarketSection>

        <MarketSection title="섹터" note="SPDR 섹터 ETF 11종을 등락률 순으로 정렬">
          {sectors.ok ? (
            <SectorGrid sectors={sectors.data} />
          ) : (
            <SectionFallback reason={sectors.reason} />
          )}
        </MarketSection>

        <MarketSection title="개별 종목" note={movers.ok ? movers.note : undefined}>
          {movers.ok ? (
            <div className="space-y-8">
              <MoverList title="상승률 상위" rows={movers.data.gainers} />
              <MoverList title="하락률 상위" rows={movers.data.losers} />
              <MoverList title="거래량 상위" rows={movers.data.actives} />
            </div>
          ) : (
            <SectionFallback reason={movers.reason} />
          )}
        </MarketSection>

        <MarketSection
          title="오늘의 브리핑"
          note={
            isBriefConfigured()
              ? "왜 이렇게 움직였는지, 뉴스에서 확인되는 만큼만"
              : "오늘 가장 크게 움직인 섹터와 종목에 걸린 뉴스"
          }
        >
          {newsItems.length > 0 || brief.ok ? (
            <NewsBrief brief={brief} news={newsItems} showBrief={isBriefConfigured()} />
          ) : (
            <SectionFallback reason={news.ok ? "표시할 뉴스가 없습니다." : news.reason} />
          )}
        </MarketSection>

        <MarketSection title="금리·채권" note="출처 FRED · 최근 2년">
          {rates.ok ? (
            <div>
              {rates.data.target ? (
                <p className="mb-4 text-sm">
                  정책금리 목표범위{" "}
                  <span className="tabular-nums">
                    {rates.data.target.lower.toFixed(2)}–{rates.data.target.upper.toFixed(2)}%
                  </span>
                  <span className="ml-2 text-xs text-black/35 dark:text-white/35">
                    {formatAsOf(rates.data.target.asOf)} 기준
                  </span>
                </p>
              ) : null}

              {rates.data.inverted ? (
                <p
                  className="mb-4 inline-block rounded-sm px-2 py-1 text-xs"
                  style={{
                    background: "color-mix(in srgb, var(--viz-up) 12%, transparent)",
                    color: "var(--viz-up)",
                  }}
                >
                  장단기 금리 역전 — 10년물이 2년물보다 낮습니다
                </p>
              ) : null}

              {rates.data.twoYear.length > 0 && rates.data.tenYear.length > 0 ? (
                <div className="mb-6">
                  <SparkLine
                    height={88}
                    ariaLabel="미국 2년물과 10년물 금리 추이"
                    series={[
                      { points: rates.data.tenYear, color: "var(--viz-series)", label: "10년물" },
                      {
                        points: rates.data.twoYear,
                        color: "var(--viz-series-2)",
                        label: "2년물",
                        dashed: true,
                      },
                    ]}
                  />
                  <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                    <span style={{ color: "var(--viz-series)" }}>―</span> 10년물{"   "}
                    <span style={{ color: "var(--viz-series-2)" }}>--</span> 2년물 (같은 축)
                  </p>
                </div>
              ) : null}

              <ul className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
                {rates.data.rows.map((row) => (
                  <MacroRowItem key={row.key} row={row} />
                ))}
              </ul>
            </div>
          ) : (
            <SectionFallback reason={rates.reason} />
          )}
        </MarketSection>

        <MarketSection title="원자재·환율" note="6개월 추이">
          <QuoteList specs={COMMODITY_SPECS} rows={commodities} />
        </MarketSection>

        <MarketSection title="물가·고용" note="출처 FRED · 월간 지표는 발표까지 몇 주 걸립니다">
          {macro.ok ? (
            <ul className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
              {macro.data.map((row) => (
                <MacroRowItem key={row.key} row={row} />
              ))}
            </ul>
          ) : (
            <SectionFallback reason={macro.reason} />
          )}
        </MarketSection>

        <MarketSection title="발표 일정" note="수동으로 관리하는 목록입니다">
          {calendar.ok ? (
            <CalendarList data={calendar.data} />
          ) : (
            <SectionFallback reason={calendar.reason} />
          )}
        </MarketSection>
      </div>

      <footer className="mt-16 border-t border-black/10 pt-6 text-xs leading-relaxed text-black/40 dark:border-white/15 dark:text-white/40">
        <p>
          출처: Yahoo Finance(시세·뉴스), FRED(금리·물가·고용), Google 뉴스. 실시간 호가가 아니라
          지연된 일 종가 기준입니다.
        </p>
        <p className="mt-2">
          등락 색은 한국 관습을 따릅니다 — <span style={{ color: "var(--viz-up)" }}>▲ 상승</span>{" "}
          <span style={{ color: "var(--viz-down)" }}>▼ 하락</span>.
        </p>
        <p className="mt-2">참고용 정보이며 투자 판단의 근거로 사용할 수 없습니다.</p>
      </footer>
    </main>
  );
}
