import { formatUsd } from "@/lib/utils";
import type { Rarity } from "@/types";

/**
 * Pure-SVG/CSS chart primitives for the spending overview.
 *
 * Every chart here follows the same three rules:
 *   1. Honest scales — quantitative axes and bars always start at zero, never
 *      truncate a range, and every value is labelled.
 *   2. Colourblind-safe encoding — rarity doubles as BOTH a shape and a colour,
 *      and the rest of the palette resolves to one mocha accent + neutrals.
 *   3. Accessible by construction — each chart is announced with
 *      `role="img"` + an aria-label AND carries a `<table>` fallback, so the
 *      numbers are never trapped inside pixels.
 */

export interface RarityDot {
  rarity: Rarity;
  isGolden: boolean;
}

export interface MonthPoint {
  /** "YYYY-MM" bucket, also used to match the current month. */
  key: string;
  /** Short axis label, e.g. "Oct". */
  label: string;
  total: number;
  count: number;
  items: readonly RarityDot[];
}

export interface RankRow {
  label: string;
  total: number;
  count: number;
  /** Fraction of the whole spend, 0..1. */
  share: number;
}

/** Shapes carry the rarity when colour cannot: "●" rare, "▲" epic, "★" legendary. */
const RARITY_GLYPH: Record<Rarity, { glyph: string; color: string }> = {
  RARE: { glyph: "●", color: "#7c93b8" },
  EPIC: { glyph: "▲", color: "#8e7bc4" },
  LEGENDARY: { glyph: "★", color: "#c39a3e" },
};

/** Rounds a positive number up to a friendly 1/2/5 × 10ⁿ ceiling so axes run
 *  0 .. 600 instead of 0 .. 576.32. */
function niceCeil(value: number): number {
  if (!(value > 0)) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const scaled = value / base;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * base;
}

/** Compact axis tick label: "$50", "$2.5k", "$12k". */
function formatAxis(value: number): string {
  if (value >= 1000) {
    const scaled = value / 1000;
    return `$${scaled < 10 ? scaled.toFixed(1) : Math.round(scaled)}k`;
  }
  return `$${Math.round(value)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Zero-based area chart of total sent per calendar month (viewBox 0 0 640 250).
 *
 * The x axis labels sit just below the plot; under each slot a small row of
 * rarity glyphs shows which creatures arrived that month, so the strip reads
 * "these friends showed up in October". The current month is drawn in
 * legendary gold with its exact value.
 */
export function MonthlyTrendChart({
  months,
  thisMonthKey,
}: {
  months: readonly MonthPoint[];
  thisMonthKey: string;
}) {
  const vw = 640;
  const vh = 250;
  const pad = { left: 52, right: 16, top: 16, bottom: 48 };
  const plotW = vw - pad.left - pad.right;
  const plotH = vh - pad.top - pad.bottom;
  const baseline = vh - pad.bottom;

  const max = niceCeil(Math.max(...months.map((month) => month.total), 1));
  const yFor = (value: number) => pad.top + plotH * (1 - value / max);
  const xFor = (index: number) =>
    months.length === 1 ? pad.left + plotW / 2 : pad.left + (index / (months.length - 1)) * plotW;

  const axisSteps = 4;
  const gridlines = Array.from({ length: axisSteps + 1 }, (_, stepIndex) => {
    const value = (max / axisSteps) * stepIndex;
    return { value, y: yFor(value) };
  });

  const points = months.map((month, index) => ({ x: xFor(index), y: yFor(month.total) }));
  const areaPath =
    points.length > 0
      ? [
          `M ${points[0]?.x ?? pad.left} ${baseline}`,
          ...points.map((point) => `L ${point.x} ${point.y}`),
          `L ${points[points.length - 1]?.x ?? pad.left} ${baseline}`,
          "Z",
        ].join(" ")
      : "";
  const linePath = points.map((point) => `${point.x},${point.y}`).join(" ");

  const currentMonthIndex = months.findIndex((month) => month.key === thisMonthKey);
  const current = currentMonthIndex >= 0 ? months[currentMonthIndex] : undefined;
  const currentLabel =
    current !== undefined ? formatUsd(current.total) : undefined;

  const chartSummary = `Total sent per month: ${months
    .map((month) => `${month.label}: ${formatUsd(month.total)}`)
    .join(", ")}.`;

  return (
    <div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" role="img" aria-label={chartSummary}>
        <defs>
          <linearGradient id="monthly-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#417258" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#417258" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridlines.map(({ value, y }) => (
          <g key={`grid-${value}`}>
            <line x1={pad.left} x2={vw - pad.right} y1={y} y2={y} stroke="#eae8e4" strokeWidth="1" />
            <text x={pad.left - 8} y={y} dy="0.32em" textAnchor="end" fontSize="11" fill="#8d867c">
              {formatAxis(value)}
            </text>
          </g>
        ))}

        {areaPath !== "" ? <path d={areaPath} fill="url(#monthly-area-fill)" /> : null}
        {linePath !== "" ? (
          <path
            d={`M ${linePath}`}
            fill="none"
            stroke="#417258"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {points.map((point, index) => {
          const isThis = months[index]?.key === thisMonthKey;
          return (
            <g key={`point-${index}`}>
              {isThis ? <circle cx={point.x} cy={point.y} r="7" fill="#c39a3e" opacity="0.22" /> : null}
              <circle
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill={isThis ? "#c39a3e" : "#ffffff"}
                stroke={isThis ? "#ffffff" : "#417258"}
                strokeWidth="2.5"
              />
            </g>
          );
        })}

        {current !== undefined && currentLabel !== undefined ? (
          <text
            x={xFor(currentMonthIndex)}
            y={clamp(yFor(current.total) - 12, 24, baseline - 24)}
            textAnchor={
              currentMonthIndex === 0 && months.length > 1
                ? "start"
                : currentMonthIndex === months.length - 1 && months.length > 1
                ? "end"
                : "middle"
            }
            fontSize="12"
            fontWeight="600"
            fill="#211f1d"
            className="tabular-nums"
          >
            {currentLabel}
          </text>
        ) : null}

        {months.map((month, index) => {
          const first = index === 0;
          const last = index === months.length - 1;
          const anchor = months.length === 1 ? "middle" : first ? "start" : last ? "end" : "middle";
          return (
            <text
              key={`x-${month.key}`}
              x={xFor(index)}
              y={baseline + 20}
              dy="0.32em"
              textAnchor={anchor}
              fontSize="11"
              fontWeight="500"
              fill="#8d867c"
            >
              {month.label}
            </text>
          );
        })}

        {months.map((month, index) => {
          const glyphs = month.items.slice(0, 6);
          const extra = month.items.length - glyphs.length;
          const slot = xFor(index);
          const glyphW = 9;
          const rowW = glyphs.length * glyphW + (extra > 0 ? 16 : 0);
          const start = clamp(slot - rowW / 2 + (glyphs.length > 0 ? glyphW / 2 : 0), 24, vw - 24 - rowW);
          return (
            <g key={`glyphs-${month.key}`}>
              {glyphs.map((item, position) => {
                const { glyph, color } = RARITY_GLYPH[item.rarity];
                return (
                  <text
                    key={`glyph-${position}`}
                    x={start + position * glyphW}
                    y={baseline + 38}
                    dy="0.27em"
                    textAnchor="middle"
                    fontSize="10"
                    fill={color}
                  >
                    {glyph}
                  </text>
                );
              })}
              {extra > 0 ? (
                <text
                  x={start + glyphs.length * glyphW + 2}
                  y={baseline + 38}
                  dy="0.27em"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#8d867c"
                >
                  +{extra}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>Total sent per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Total</th>
            <th scope="col">Payments</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.key}>
              <th scope="row">{month.label}</th>
              <td>{formatUsd(month.total)}</td>
              <td>{month.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Zero-based, ranked horizontal bars — one row per recipient, tallest first.
 * The bars keep a single accent hue (top rank strongest, then fading) because
 * the label, the value and the share are already the data.
 */
export function RecipientBars({ rows, total }: { rows: readonly RankRow[]; total: number }) {
  const max = Math.max(...rows.map((row) => row.total), 1);

  return (
    <div>
      <ol className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const fillClass = index === 0 ? "bg-mocha" : index === 1 ? "bg-mocha/60" : "bg-mocha/30";
          const width = Math.round((row.total / max) * 100);
          const share = total > 0 ? Math.round(row.share * 100) : 0;
          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-ink">{row.label}</span>
                <span className="shrink-0 text-sm font-medium text-ink tabular-nums">
                  {formatUsd(row.total)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full ${fillClass}`}
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">
                {row.count} payment{row.count === 1 ? "" : "s"}, {share}% of spending
              </p>
            </li>
          );
        })}
      </ol>

      <table className="sr-only">
        <caption>Spending by recipient, ranked</caption>
        <thead>
          <tr>
            <th scope="col">Who</th>
            <th scope="col">Total</th>
            <th scope="col">Payments</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{formatUsd(row.total)}</td>
              <td>{row.count}</td>
              <td>{total > 0 ? `${Math.round(row.share * 100)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}