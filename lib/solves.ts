export type Penalty = "none" | "+2" | "DNF";
export type Solve = { id: string; ms: number; scramble: string; date: number; penalty: Penalty; note: string };

export function time(ms: number | null, placeholder = "—"): string {
  if (ms === null) return placeholder;
  if (!Number.isFinite(ms)) return "DNF";
  const centiseconds = Math.floor(Math.max(0, ms) / 10);
  const seconds = Math.floor(centiseconds / 100);
  const fraction = String(centiseconds % 100).padStart(2, "0");
  return seconds < 60 ? `${seconds}.${fraction}` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${fraction}`;
}

export function effective(solve: Solve) {
  return solve.penalty === "DNF" ? Infinity : solve.ms + (solve.penalty === "+2" ? 2000 : 0);
}

export function solveHistogram(solves: Solve[], median: number) {
  const values = solves.map(effective).filter(Number.isFinite);
  if (!values.length) return null;

  const firstSecond = Math.floor(values.reduce((a, b) => Math.min(a, b)) / 1000);
  const lastSecond = Math.floor(values.reduce((a, b) => Math.max(a, b)) / 1000);
  const maxBars = 9;
  const needsTails = lastSecond - firstSecond + 1 > maxBars;
  const middleBars = maxBars - 2;
  const first = needsTails
    ? Math.max(firstSecond, Math.min(Math.floor(median / 1000) - 3, lastSecond - middleBars + 1))
    : firstSecond;
  const end = needsTails ? first + middleBars : lastSecond + 1;
  const hasLowerTail = first > firstSecond;
  const hasUpperTail = end <= lastSecond;
  const offset = Number(hasLowerTail);
  const bins = Array<number>(end - first + offset + Number(hasUpperTail)).fill(0);

  for (const value of values) {
    const second = Math.floor(value / 1000);
    const bucket = second < first ? 0 : second >= end ? bins.length - 1 : second - first + offset;
    bins[bucket]++;
  }

  return {
    bins, first, end, hasLowerTail, hasUpperTail,
    medianPosition: (median / 1000 - first + offset) / bins.length * 100,
  };
}

export function averageWindow(solves: Solve[], size: number, offset = 0) {
  if (solves.length - offset < size) return null;
  const results = solves.slice(offset, offset + size).map(effective);
  const ranked = results.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const excluded = new Set([ranked[0].index, ranked[size - 1].index]);
  const value = ranked.slice(1, -1).reduce((sum, result) => sum + result.value, 0) / (size - 2);
  return { value, entries: results.map((value, index) => ({ value, excluded: excluded.has(index) })) };
}

export function average(solves: Solve[], size: number, offset = 0) {
  return averageWindow(solves, size, offset)?.value ?? null;
}

function bestAverage(solves: Solve[], size: number) {
  let best: ReturnType<typeof averageWindow> = null;
  for (let offset = 0; offset <= solves.length - size; offset++) {
    const window = averageWindow(solves, size, offset);
    if (window && Number.isFinite(window.value) && (!best || window.value < best.value)) best = window;
  }
  return best;
}

export function summarize(solves: Solve[]) {
  const valid = solves.map(effective).filter(Number.isFinite).sort((a, b) => a - b);
  const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  return {
    best: valid[0] ?? null,
    mean,
    median: valid.length ? (valid[Math.floor((valid.length - 1) / 2)] + valid[Math.floor(valid.length / 2)]) / 2 : null,
    ao5: average(solves, 5),
    ao12: average(solves, 12),
    bestAo5: bestAverage(solves, 5),
    bestAo12: bestAverage(solves, 12)?.value ?? null,
  };
}

export function exportSolves(solves: Solve[]) {
  const quote = (value: string | number) => {
    const text = String(value);
    const safe = typeof value === "string" && /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = solves.map(solve => [new Date(solve.date).toISOString(), time(solve.ms), time(effective(solve)), solve.penalty, solve.scramble, solve.note]);
  const url = URL.createObjectURL(new Blob([["Date,Raw time,Result,Penalty,Scramble,Note", ...rows.map(row => row.map(quote).join(","))].join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cuber-solves.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
