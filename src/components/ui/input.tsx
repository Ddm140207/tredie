import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-2xl border border-line bg-surface px-4 text-ink placeholder:text-ink-faint transition-colors focus:border-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-12 text-[15px]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea className={cn(fieldBase, "min-h-24 resize-none py-3 text-[15px]", className)} {...props} />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}