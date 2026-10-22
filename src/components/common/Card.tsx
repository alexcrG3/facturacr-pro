import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated",
        className,
      )}
      {...props}
    />
  );
}
