"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-neutral-950 text-white hover:bg-neutral-800",
        variant === "secondary" && "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        variant === "outline" && "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
        variant === "ghost" && "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
