import { FileSpreadsheet, Hash, Receipt } from "lucide-react";

const PAINS = [
  {
    icon: Receipt,
    title: "The story doesn't survive",
    body: "A $75 evening with friends becomes one quiet line in a statement. A month later, you've forgotten what it meant.",
  },
  {
    icon: FileSpreadsheet,
    title: "Tracking feels like homework",
    body: "Budgeting apps are spreadsheets with prettier fonts. You install them, love them for a week — then abandon them.",
  },
  {
    icon: Hash,
    title: "On-chain feels like math",
    body: "Addresses, hashes, confirmations. Moving money over a network should feel personal, not like cryptography.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-32 md:py-44">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-mocha">The problem</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Does your money have a memory?
        </h2>
        <p className="mt-3 text-ink-soft">
          Every payment you make today has a story. Very few apps bother to keep it.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-3">
        {PAINS.map((pain) => (
          <div
            key={pain.title}
            className="rounded-[--radius-card] border border-line bg-surface p-8 shadow-soft"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-mocha-soft text-mocha">
              <pain.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-6 font-display text-xl font-semibold text-ink">{pain.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{pain.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center font-display text-xl font-medium text-mocha">
        Sound familiar?
      </p>
    </section>
  );
}