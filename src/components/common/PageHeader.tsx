import { type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 w-full min-w-0 flex flex-col gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="w-full min-w-0 flex flex-row flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
