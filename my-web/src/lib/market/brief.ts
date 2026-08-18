import { unstable_cache } from "next/cache";
import { generateText } from "ai";
import { formatPct } from "@/lib/market/series";
import { fail, type Loaded, type Mover, type NewsItem, type Quote } from "@/lib/market/types";

const MODEL = "anthropic/claude-sonnet-5";

export type BriefContext = {
  indexes: Quote[];
  sectors: Quote[];
  gainers: Mover[];
  losers: Mover[];
  macro: { label: string; text: string }[];
  news: NewsItem[];
};

const INSTRUCTIONS = [
  "당신은 한국어로 미국 증시 일일 브리핑을 쓰는 시장 분석가입니다.",
  "규칙:",
  "1. 제공된 헤드라인에서 확인되는 내용만 근거로 삼습니다. 헤드라인에 없는 인과를 만들어내지 마세요.",
  "2. 어떤 움직임의 배경이 헤드라인에서 확인되지 않으면 '뉴스에서 배경이 확인되지 않았습니다'라고 그대로 쓰세요.",
  "3. 투자 권유, 향후 전망, 목표가, 매매 조언을 쓰지 마세요. 오늘 일어난 일만 서술합니다.",
  "4. 헤드라인을 근거로 삼은 문장 끝에는 [1] 처럼 번호를 답니다. 여러 개면 [1][3].",
  "5. 3~4문장, 평서체(-습니다)로 씁니다. 제목이나 목록 없이 문단 하나로만 답하세요.",
].join("\n");

function buildPrompt(ctx: BriefContext): string {
  const line = (q: Quote) => `${q.label} ${formatPct(q.changePct)}`;

  const sorted = [...ctx.sectors].sort((a, b) => b.changePct - a.changePct);
  const top = sorted.slice(0, 3).map(line).join(", ");
  const bottom = sorted.slice(-3).reverse().map(line).join(", ");

  const movers = (rows: Mover[]) =>
    rows.slice(0, 5).map((m) => `${m.name}(${m.symbol}) ${formatPct(m.changePct)}`).join(", ");

  const headlines = ctx.news
    .map((n, i) => `[${i + 1}] ${n.title} — ${n.publisher}`)
    .join("\n");

  return [
    "## 오늘 시장 데이터",
    `지수: ${ctx.indexes.map(line).join(", ")}`,
    `강한 섹터: ${top || "자료 없음"}`,
    `약한 섹터: ${bottom || "자료 없음"}`,
    `상승 상위: ${movers(ctx.gainers) || "자료 없음"}`,
    `하락 상위: ${movers(ctx.losers) || "자료 없음"}`,
    ctx.macro.length ? `매크로: ${ctx.macro.map((m) => `${m.label} ${m.text}`).join(", ")}` : "",
    "",
    "## 참고 헤드라인",
    headlines || "(헤드라인 없음)",
    "",
    "위 데이터에서 눈에 띄는 움직임을 고르고, 헤드라인에서 확인되는 배경만 붙여 설명하세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callModel(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: MODEL,
    instructions: INSTRUCTIONS,
    prompt,
  });
  return text.trim();
}

/**
 * generateText 는 POST 라 Next 의 fetch 캐시가 걸리지 않는다.
 * unstable_cache 로 감싸 배포당 시간에 한 번만 모델을 호출한다.
 */
const cachedBrief = unstable_cache(callModel, ["market-brief"], {
  revalidate: 3_600,
  tags: ["market:news"],
});

/**
 * 키가 없는 건 실패가 아니라 기능이 꺼진 상태다.
 * 화면에서 AI 블록을 통째로 감춰, 설정 안 된 기능이 오류처럼 보이지 않게 한다.
 */
export function isBriefConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

/** 요약이 실패해도 헤드라인은 그대로 남아야 한다. 뉴스 기능이 AI 에 종속되지 않게. */
export async function generateMarketBrief(ctx: BriefContext): Promise<Loaded<string>> {
  if (!isBriefConfigured()) return fail("AI 요약이 설정되지 않았습니다.");
  if (ctx.news.length === 0) return fail("요약할 뉴스가 없습니다.");

  try {
    const text = await cachedBrief(buildPrompt(ctx));
    if (!text) return fail("요약을 생성하지 못했습니다.");
    return { ok: true, data: text, source: "ai", asOf: new Date().toISOString() };
  } catch {
    return fail("요약을 생성하지 못했습니다. 아래 헤드라인을 직접 확인해 주세요.");
  }
}
