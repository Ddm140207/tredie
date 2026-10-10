import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import {
  MonthlyTrendChart,
  RecipientBars,
  type MonthPoint,
  type RankRow,
  type RarityDot,
} from "@/components/collection/charts";
import { cn } from "@/lib/utils";
import type { TredieRecord } from "@/types";

const MAX_RANKED_PEOPLE = 4;

function shortMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(iso));
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function groupBy<T>(items: readonly T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return groups;
}

export function SpendingView({ tredies }: { tredies: TredieRecord[] }) {
  const thisMonthKey = useMemo(() => monthKey(new Date().toISOString()), []);

  const summary = useMemo(() => {
    const count = tredies.length;
    const all = tredies.reduce((sum, item) => sum + item.amount, 0);
    const average = count > 0 ? all / count : 0;

    const sortedByAmount = [...tredies].sort((a, b) => b.amount - a.amount);
    const biggest = sortedByAmount[0] ?? null;

    const byPerson = groupBy(tredies, (item) => item.recipient ?? "Someone");
    const byMonth = groupBy(tredies, (item) => monthKey(item.createdAt));

    const people = new Map<string, { total: number; count: number }>();
    for (const [label, items] of byPerson) {
      people.set(label, {
        total: items.reduce((sum, item) => sum + item.amount, 0),
        count: items.length,
      });
    }

    const monthRows: MonthPoint[] = [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, items], index) => {
        const first = index === 0;
        const yearSuffix = `’${key.slice(2, 4)}`;
        const label = first
          ? `${shortMonth(items[0]?.createdAt ?? key)} ${yearSuffix}`
          : shortMonth(items[0]?.createdAt ?? key);
        return {
          key,
          label,
          total: items.reduce((sum, item) => sum + item.amount, 0),
          count: items.length,
          items: items.map(
            (item): RarityDot => ({ rarity: item.rarity, isGolden: item.isGolden }),
          ),
        };
      });

    const ranked = [...people.entries()]
      .map(([label, row]): RankRow => ({ label, ...row, share: all > 0 ? row.total / all : 0 }))
      .sort((a, b) => b.total - a.total);

    const shown = ranked.slice(0, MAX_RANKED_PEOPLE);
    const rest = ranked.slice(MAX_RANKED_PEOPLE);
    const peopleRows =
      rest.length > 0
        ? [
            ...shown,
            {
              label: "Others",
              total: rest.reduce((sum, row) => sum + row.total, 0),
              count: rest.reduce((sum, row) => sum + row.count, 0),
              share: all > 0 ? rest.reduce((sum, row) => sum + row.total, 0) / all : 0,
            },
          ]
        : shown;

    const otters = tredies.filter((item) => item.species === "OTTER").length;
    const golden = tredies.filter((item) => item.isGolden).length;
    const distinctPeople = byPerson.size;

    return { all, count, average, biggest, monthRows, peopleRows, otters, golden, distinctPeople };
  }, [tredies]);

  const thisMonth = useMemo(
    () => summary.monthRows.find((month) => month.key === thisMonthKey),
    [summary.monthRows, thisMonthKey],
  );
  const topPerson = summary.peopleRows[0];

  if (summary.count === 0) {
    return (
      <div className="mt-10 flex flex-col gap-10">
        <p className="text-sm text-ink-faint">No payments yet — send your first Tredie and the story starts.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-10">
      <header className="rounded-[--radius-hero] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <p className="text-sm font-medium text-ink-faint">All time</p>
        <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink tabular-nums sm:text-5xl">
          {formatUsd(summary.all)}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          You&apos;ve sent{" "}
          <span className="font-medium text-ink">{formatUsd(summary.all)}</span> to{" "}
          {summary.distinctPeople} {summary.distinctPeople === 1 ? "person" : "people"} —{" "}
          {summary.otters > 0
            ? `${summary.otters} of them ${summary.otters === 1 ? "is" : "are"} an otter.`
            : "no otters yet. Send something big."}
          {summary.golden > 0 ? (
            <>
              {" "}
              <Sparkles className="mb-0.5 inline size-3.5 text-legendary" aria-hidden /> and one of
              them is gold.
            </>
          ) : null}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="This month"
          value={formatUsd(thisMonth?.total ?? 0)}
          sub={thisMonth !== undefined ? `${thisMonth.count} payment${thisMonth.count === 1 ? "" : "s"}` : "no sends yet this month"}
        />
        <StatCard
          label="Biggest send"
          value={summary.biggest ? formatUsd(summary.biggest.amount) : "—"}
          sub={
            summary.biggest
              ? summary.biggest.note
                ? summary.biggest.note
                : summary.biggest.recipient
                ? `to ${summary.biggest.recipient}`
                : "to someone"
              : "no sends yet"
          }
        />
        <StatCard
          label="Average send"
          value={formatUsd(summary.average)}
          sub={`${summary.count} send${summary.count === 1 ? "" : "s"} in total`}
        />
        <StatCard
          label="Top recipient"
          value={topPerson ? topPerson.label : "—"}
          sub={
            topPerson
              ? `${topPerson.count} payment${topPerson.count === 1 ? "" : "s"}, ${Math.round(topPerson.share * 100)}% of spending`
              : "no sends yet"
          }
        />
      </dl>

      <section className="rounded-[--radius-hero] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Where it goes</h2>
          <span className="text-xs text-ink-faint">
            {summary.peopleRows.length} {summary.peopleRows.length === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="mt-6">
          {summary.peopleRows.length > 0 ? (
            <RecipientBars rows={summary.peopleRows} total={summary.all} />
          ) : (
            <p className="text-sm text-ink-faint">Nobody yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-[--radius-hero] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Month by month</h2>
          <span className="text-xs text-ink-faint">
            Shapes mark rarity: <span aria-hidden>● rare · ▲ epic · ★ legendary</span>
            <span className="sr-only">Rare is a circle, epic a triangle, legendary a star.</span>
          </span>
        </div>
        <div className="mt-6">
          {summary.monthRows.length > 0 ? (
            <MonthlyTrendChart months={summary.monthRows} thisMonthKey={thisMonthKey} />
          ) : (
            <p className="text-sm text-ink-faint">No payments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[--radius-card] border border-line bg-surface p-5 shadow-soft", className)}>
      <dt className="text-xs font-medium text-ink-faint">{label}</dt>
      <dd className="mt-1.5 truncate font-display text-2xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </dd>
      {sub ? <p className="mt-1 truncate text-xs text-ink-soft">{sub}</p> : null}
    </div>
  );
}