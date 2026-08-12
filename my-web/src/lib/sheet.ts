export type Sheet = {
  headers: string[];
  rows: string[][];
};

export type Bucket = {
  label: string;
  total: number;
};

/** 첫 줄을 헤더로 보고, 빈 헤더는 "열 3" 처럼 자리 이름을 붙인다. */
export function toSheet(raw: unknown[][]): Sheet {
  const [first, ...rest] = raw;
  if (!first) return { headers: [], rows: [] };

  const headers = first.map((cell, i) => cellToString(cell).trim() || `열 ${i + 1}`);

  const rows = rest
    .map((row) => headers.map((_, i) => cellToString(row?.[i])))
    .filter((row) => row.some((cell) => cell !== ""));

  return { headers, rows };
}

/** 분류 열로 묶어 값 열을 합계 낸다. 합계가 큰 순서로 돌려준다. */
export function summarize(
  sheet: Sheet,
  categoryIndex: number,
  valueIndex: number,
): { buckets: Bucket[]; skipped: number } {
  const totals = new Map<string, number>();
  let skipped = 0;

  for (const row of sheet.rows) {
    const value = toNumber(row[valueIndex]);

    if (value === null) {
      skipped += 1;
      continue;
    }

    const label = row[categoryIndex]?.trim() || "(빈 값)";
    totals.set(label, (totals.get(label) ?? 0) + value);
  }

  const buckets = [...totals]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);

  return { buckets, skipped };
}

/** 막대가 너무 많아지면 뒤쪽을 "기타"로 묶는다. */
export function capBuckets(buckets: Bucket[], limit: number): Bucket[] {
  if (buckets.length <= limit) return buckets;

  const head = buckets.slice(0, limit);
  const tail = buckets.slice(limit);
  const total = tail.reduce((sum, bucket) => sum + bucket.total, 0);

  return [...head, { label: `기타 (${tail.length}개)`, total }];
}

/** 열마다 숫자로 읽히는 칸이 몇 개인지 세어 값 열 후보를 찾는다. */
export function numericScore(sheet: Sheet, index: number): number {
  let count = 0;
  for (const row of sheet.rows) {
    if (toNumber(row[index]) !== null) count += 1;
  }
  return count;
}

/** "1,234", "₩1,234", "12%" 처럼 흔한 표기까지 숫자로 읽는다. */
export function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;

  const cleaned = value.replace(/[\s,₩$€%]/g, "");
  if (cleaned === "") return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell);
}
