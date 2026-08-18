import { fail, type Loaded, type NewsItem } from "@/lib/market/types";

const YAHOO_BASE = process.env.YAHOO_BASE ?? "https://query1.finance.yahoo.com";
const RSS_BASE = "https://news.google.com/rss/search";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const NEWS_REVALIDATE = 1_800;

/** 섹터 ETF -> 한국어 검색어. 티커를 그대로 넣으면 한국어 기사가 거의 안 잡힌다. */
export const SECTOR_QUERIES: Record<string, string> = {
  XLK: "미국 기술주 나스닥",
  XLF: "미국 은행주 금리",
  XLE: "국제 유가 에너지주",
  XLV: "미국 제약 바이오 주가",
  XLY: "미국 소비 지출 소매주",
  XLP: "미국 필수소비재 주가",
  XLI: "미국 산업재 제조업 지표",
  XLB: "원자재 소재주 구리",
  XLU: "미국 유틸리티 전력주",
  XLRE: "미국 리츠 부동산 금리",
  XLC: "미국 미디어 통신주 광고",
};

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function pick(block: string, tag: string): string {
  // [^] 은 줄바꿈까지 포함한 임의의 문자. 문자열로 조립하는 정규식이라
  // 역슬래시가 들어가는 [\s\S] 대신 이 형태를 써서 이스케이프 사고를 피한다.
  const m = block.match(new RegExp(`<${tag}[^>]*>([^]*?)</${tag}>`));
  return m ? decodeEntities(m[1]) : "";
}

/**
 * RSS 파서를 따로 들이지 않고 item 블록만 훑는다.
 * 구글 뉴스 RSS 는 구조가 단순해서 이 정도로 충분하고, 의존성이 늘지 않는다.
 */
function parseRss(xml: string, limit: number): NewsItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return blocks.slice(0, limit).map((block) => {
    const rawTitle = pick(block, "title");
    const publisher = pick(block, "source");
    // 구글은 제목 끝에 " - 매체명"을 붙인다. 매체명을 따로 쓰니 제목에서는 덜어낸다.
    const title = publisher && rawTitle.endsWith(` - ${publisher}`)
      ? rawTitle.slice(0, -(publisher.length + 3))
      : rawTitle;

    return {
      title,
      link: pick(block, "link"),
      publisher: publisher || "Google 뉴스",
      publishedAt: pick(block, "pubDate"),
      lang: "ko" as const,
      tickers: [],
    };
  });
}

/** 한국어 검색에는 미국과 무관한 국내 종목 기사가 섞여 들어온다. 최소한의 체를 둔다. */
const KO_NOISE = /(코스피|코스닥|특징주|기업주식정보|장마감|상한가|하한가)/;
const KO_SIGNAL = /(미국|미증시|뉴욕|나스닥|S&P|다우|연준|FOMC|월가|국제)/i;

function looksRelevant(item: NewsItem): boolean {
  if (KO_NOISE.test(item.title) && !KO_SIGNAL.test(item.title)) return false;
  return item.title.length > 0;
}

export async function fetchGoogleNewsKo(query: string, count = 6): Promise<NewsItem[]> {
  const url = `${RSS_BASE}?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      next: { revalidate: NEWS_REVALIDATE, tags: ["market:news"] },
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), count * 2)
      .filter(looksRelevant)
      .slice(0, count);
  } catch {
    return [];
  }
}

/** 야후 검색은 relatedTickers 를 함께 준다. 종목·섹터와의 연결이 정확한 쪽. */
export async function fetchYahooNews(query: string, count = 6): Promise<NewsItem[]> {
  const url = `${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=${count}&quotesCount=0`;

  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/json" },
      next: { revalidate: NEWS_REVALIDATE, tags: ["market:news"] },
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("json")) return [];

    const json = (await res.json()) as {
      news?: {
        title?: string;
        link?: string;
        publisher?: string;
        providerPublishTime?: number;
        relatedTickers?: string[];
      }[];
    };

    return (json.news ?? [])
      .filter((n) => n.title && n.link)
      .map((n) => ({
        title: n.title as string,
        link: n.link as string,
        publisher: n.publisher ?? "Yahoo Finance",
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toUTCString()
          : "",
        lang: "en" as const,
        tickers: n.relatedTickers ?? [],
      }))
      .slice(0, count);
  } catch {
    return [];
  }
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((n) => {
    const key = n.title.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 오늘 가장 크게 움직인 섹터를 중심으로 뉴스를 모은다.
 * 한국어를 앞에 두되, 티커 매칭이 확실한 영문을 함께 실어 근거를 보강한다.
 */
export async function collectMarketNews(
  sectorKeys: string[],
  extraTickers: string[] = [],
): Promise<Loaded<NewsItem[]>> {
  const koQueries = ["미국 증시 뉴욕증시 마감", ...sectorKeys.map((k) => SECTOR_QUERIES[k]).filter(Boolean)];
  const enQueries = [...sectorKeys, ...extraTickers];

  const [ko, en] = await Promise.all([
    Promise.all(koQueries.slice(0, 4).map((q) => fetchGoogleNewsKo(q, 4))),
    Promise.all(enQueries.slice(0, 5).map((q) => fetchYahooNews(q, 3))),
  ]);

  const items = dedupe([...ko.flat(), ...en.flat()]);
  if (items.length === 0) return fail("관련 뉴스를 불러오지 못했습니다.");

  return { ok: true, data: items.slice(0, 20), source: "news", asOf: new Date().toISOString() };
}
