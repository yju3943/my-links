"use client";

import { useMemo, useRef, useState } from "react";
import { downloadBlob, renderChartPng, toFileName } from "@/lib/chart-image";
import {
  capBuckets,
  formatNumber,
  numericScore,
  summarize,
  toSheet,
  type Sheet,
} from "@/lib/sheet";

const MAX_BARS = 20;
const MAX_TABLE_ROWS = 100;

export function ExcelDashboard() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [valueIndex, setValueIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setError("");

    try {
      const raw = await readFile(file);
      const parsed = toSheet(raw);

      if (parsed.headers.length === 0) {
        throw new Error("첫 줄에서 열 이름을 찾지 못했습니다.");
      }

      // 값 열은 숫자가 가장 많은 열, 분류 열은 그 외 첫 번째 열로 기본값을 잡는다.
      const scores = parsed.headers.map((_, i) => numericScore(parsed, i));
      const bestValue = scores.indexOf(Math.max(...scores));
      const bestCategory = parsed.headers.findIndex((_, i) => i !== bestValue);

      setSheet(parsed);
      setValueIndex(bestValue);
      setCategoryIndex(bestCategory === -1 ? bestValue : bestCategory);
      setFileName(file.name);
    } catch (e) {
      setSheet(null);
      setFileName("");
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    if (!sheet) return null;
    return summarize(sheet, categoryIndex, valueIndex);
  }, [sheet, categoryIndex, valueIndex]);

  const bars = summary ? capBuckets(summary.buckets, MAX_BARS) : [];
  const max = bars.reduce((m, b) => Math.max(m, Math.abs(b.total)), 0);

  const chartTitle = sheet
    ? `${sheet.headers[categoryIndex]}별 ${sheet.headers[valueIndex]} 합계`
    : "";

  async function handleDownload() {
    if (bars.length === 0) return;

    setDownloading(true);
    setError("");

    try {
      const blob = await renderChartPng({
        title: chartTitle,
        subtitle: fileName,
        buckets: bars,
        fontFamily: getComputedStyle(document.body).fontFamily,
      });

      downloadBlob(blob, `${toFileName(chartTitle)}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 만들지 못했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="viz">
      <div className="rounded-lg border border-dashed border-black/15 px-6 py-8 text-center dark:border-white/20">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
        >
          엑셀 · CSV 파일 고르기
        </button>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          {loading
            ? "읽는 중…"
            : fileName
              ? `${fileName} — 이 브라우저 안에서만 읽었습니다.`
              : ".xlsx, .xls, .csv — 파일은 서버로 전송되지 않습니다."}
        </p>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      {sheet && summary && (
        <>
          <section className="mt-12">
            <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
              열 이름 ({sheet.headers.length}개) · 데이터 {sheet.rows.length}행
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sheet.headers.map((header, i) => (
                <li
                  key={`${header}-${i}`}
                  className="rounded-full bg-black/5 px-3 py-1 text-sm dark:bg-white/10"
                >
                  {header}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 flex flex-wrap gap-4">
            <ColumnSelect
              label="분류 열"
              headers={sheet.headers}
              value={categoryIndex}
              onChange={setCategoryIndex}
            />
            <ColumnSelect
              label="값 열"
              headers={sheet.headers}
              value={valueIndex}
              onChange={setValueIndex}
            />
          </section>

          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
                {chartTitle}
              </h2>
              <button
                type="button"
                onClick={handleDownload}
                disabled={bars.length === 0 || downloading}
                className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40 dark:border-white/20"
              >
                {downloading ? "만드는 중…" : "이미지로 내려받기"}
              </button>
            </div>

            {bars.length === 0 ? (
              <p className="mt-3 text-sm text-black/50 dark:text-white/50">
                값 열에서 숫자를 찾지 못했습니다. 다른 열을 골라 보세요.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {bars.map((bucket) => (
                  <li
                    key={bucket.label}
                    className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3"
                    title={`${bucket.label} · ${formatNumber(bucket.total)}`}
                  >
                    <span className="truncate text-sm text-black/70 dark:text-white/70">
                      {bucket.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 rounded-r-[4px]"
                        style={{
                          width: `${max ? (Math.abs(bucket.total) / max) * 100 : 0}%`,
                          minWidth: bucket.total ? "2px" : "0",
                          background: "var(--viz-series)",
                        }}
                      />
                      <span className="shrink-0 text-sm tabular-nums text-black/60 dark:text-white/60">
                        {formatNumber(bucket.total)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 border-t pt-3 text-xs text-black/45 dark:text-white/45"
               style={{ borderColor: "var(--viz-baseline)" }}>
              분류 {summary.buckets.length}개
              {summary.buckets.length > MAX_BARS &&
                ` (상위 ${MAX_BARS}개만 막대로, 나머지는 "기타"로 묶음)`}
              {summary.skipped > 0 &&
                ` · 값이 숫자가 아니어서 건너뛴 행 ${summary.skipped}개`}
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
              원본 표
            </h2>

            <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/15">
                    {sheet.headers.map((header, i) => (
                      <th
                        key={`${header}-${i}`}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2 text-left font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(0, MAX_TABLE_ROWS).map((row, r) => (
                    <tr
                      key={r}
                      className="border-b border-black/5 last:border-0 dark:border-white/10"
                    >
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className="whitespace-nowrap px-3 py-2 text-black/70 tabular-nums dark:text-white/70"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sheet.rows.length > MAX_TABLE_ROWS && (
              <p className="mt-3 text-xs text-black/45 dark:text-white/45">
                전체 {sheet.rows.length}행 중 앞의 {MAX_TABLE_ROWS}행만 보여줍니다.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      >
        {headers.map((header, i) => (
          <option key={`${header}-${i}`} value={i}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 파일은 브라우저 안에서만 읽는다. 네트워크로 나가는 경로가 없다. */
async function readFile(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });

    if (result.data.length === 0) throw new Error("CSV에서 읽을 내용이 없습니다.");
    return result.data;
  }

  // 기본 내보내기는 모든 시트를 돌려주므로, 첫 시트만 읽는 readSheet 를 쓴다.
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);

  if (rows.length === 0) throw new Error("시트가 비어 있습니다.");
  return rows;
}
