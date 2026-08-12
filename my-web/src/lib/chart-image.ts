import { formatNumber, type Bucket } from "@/lib/sheet";

/** 보고서에 붙이는 용도라 화면 테마와 무관하게 항상 밝은 배경으로 그린다. */
const INK = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const BASELINE = "#c3c2b7";
const SERIES = "#2a78d6";
const SURFACE = "#ffffff";

const SCALE = 2; // 보고서에 확대해 붙여도 깨지지 않게
const WIDTH = 880;
const PADDING = 32;
const ROW_HEIGHT = 30;
const BAR_HEIGHT = 12;
const GAP = 12;
const LABEL_MAX = 240;

export type ChartImageOptions = {
  title: string;
  subtitle?: string;
  buckets: Bucket[];
  fontFamily: string;
};

/** 화면의 막대 차트를 캔버스에 다시 그려 PNG로 만든다. */
export async function renderChartPng({
  title,
  subtitle,
  buckets,
  fontFamily,
}: ChartImageOptions): Promise<Blob> {
  await document.fonts.ready;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("캔버스를 만들지 못했습니다.");

  const labelFont = `14px ${fontFamily}`;
  const valueFont = `14px ${fontFamily}`;

  measure.font = labelFont;
  const labelWidth = Math.min(
    LABEL_MAX,
    Math.max(...buckets.map((b) => measure.measureText(b.label).width), 0) + 4,
  );

  measure.font = valueFont;
  const valueWidth =
    Math.max(
      ...buckets.map((b) => measure.measureText(formatNumber(b.total)).width),
      0,
    ) + 4;

  const headHeight = subtitle ? 52 : 32;
  const height =
    PADDING * 2 + headHeight + buckets.length * ROW_HEIGHT + 8;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했습니다.");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.font = `600 18px ${fontFamily}`;
  ctx.fillText(title, PADDING, PADDING + 14);

  if (subtitle) {
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = `12px ${fontFamily}`;
    ctx.fillText(subtitle, PADDING, PADDING + 34);
  }

  const barLeft = PADDING + labelWidth + GAP;
  const barMax = WIDTH - PADDING - barLeft - GAP - valueWidth;
  const max = buckets.reduce((m, b) => Math.max(m, Math.abs(b.total)), 0);

  buckets.forEach((bucket, i) => {
    const top = PADDING + headHeight + i * ROW_HEIGHT;
    const barTop = top + (ROW_HEIGHT - BAR_HEIGHT) / 2;

    ctx.fillStyle = INK_SECONDARY;
    ctx.font = labelFont;
    ctx.fillText(ellipsize(ctx, bucket.label, labelWidth), PADDING, barTop + 10);

    const width = max ? Math.max((Math.abs(bucket.total) / max) * barMax, 2) : 2;

    ctx.fillStyle = SERIES;
    ctx.beginPath();
    ctx.roundRect(barLeft, barTop, width, BAR_HEIGHT, [0, 4, 4, 0]);
    ctx.fill();

    ctx.fillStyle = INK_SECONDARY;
    ctx.font = valueFont;
    ctx.fillText(formatNumber(bucket.total), barLeft + width + 8, barTop + 10);
  });

  // 막대가 시작하는 자리를 가리키는 세로 기준선
  ctx.strokeStyle = BASELINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(barLeft - 0.5, PADDING + headHeight);
  ctx.lineTo(barLeft - 0.5, PADDING + headHeight + buckets.length * ROW_HEIGHT);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지를 만들지 못했습니다."))),
      "image/png",
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}

/** 파일 이름에 쓸 수 없는 글자를 걷어낸다. */
export function toFileName(text: string): string {
  return text.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-").slice(0, 80);
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}
