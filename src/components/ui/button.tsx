import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper shadow-soft hover:bg-ink-soft active:scale-[0.98]",
        accent:
          "bg-mocha text-white shadow-soft hover:brightness-110 active:scale-[0.98]",
        outline:
          "border border-line-strong bg-surface text-ink hover:bg-surface-muted active:scale-[0.98]",
        ghost:
          "text-ink-soft hover:bg-surface-muted hover:text-ink active:scale-[0.98]",
        danger:
          "border border-coral/30 bg-coral-soft text-coral-ink hover:bg-coral/15",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };