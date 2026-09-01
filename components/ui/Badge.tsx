import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "outline" | "muted" | "dark";
  className?: string;
}

export function Badge({ children, variant = "outline", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase",
        variant === "default" && "bg-neutral-900 text-white",
        variant === "outline" && "border border-neutral-300 text-neutral-700",
        variant === "muted" && "bg-neutral-100 text-neutral-600",
        variant === "dark" && "bg-neutral-950 text-white",
        className
      )}
    >
      {children}
    </span>
  );
}
