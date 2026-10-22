import { cn } from "@/lib/utils";

export function LogoIcon({
  className = "h-8 w-8",
  light = false,
  animated = true,
}: {
  className?: string;
  light?: boolean;
  animated?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-xl transition-all duration-200 shrink-0 overflow-hidden shadow-sm select-none",
        light
          ? "bg-white text-[#003B94] ring-1 ring-white/30 shadow-blue-950/20"
          : "bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-blue-500/25 ring-1 ring-white/15",
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-[72%] w-[72%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fos-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="fos-paper-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Modern Folded Document Body */}
        <path
          d="M7 6.5C7 5.11929 8.11929 4 9.5 4H19.5C19.8978 4 20.2794 4.15804 20.5607 4.43934L24.5607 8.43934C24.842 8.72064 25 9.10218 25 9.5V25.5C25 26.8807 23.8807 28 22.5 28H9.5C8.11929 28 7 26.8807 7 25.5V6.5Z"
          fill={light ? "#F0F5FF" : "#0F172A"}
          fillOpacity={light ? "1" : "0.5"}
          stroke={light ? "#BFDBFE" : "rgba(255,255,255,0.2)"}
          strokeWidth="1.2"
        />

        {/* Document Fold Tab */}
        <path
          d="M19 4V8.5C19 9.05228 19.4477 9.5 20 9.5H24.5L19 4Z"
          fill={light ? "#93C5FD" : "#38BDF8"}
          fillOpacity={light ? "0.8" : "0.7"}
        />

        {/* Stylized 'F' Upper Bar */}
        <rect
          x="10.5"
          y="12"
          width="9.5"
          height="2.4"
          rx="1.2"
          fill={light ? "#0045AC" : "#FFFFFF"}
        />

        {/* Stylized 'F' Middle Bar */}
        <rect
          x="10.5"
          y="16.5"
          width="7"
          height="2.4"
          rx="1.2"
          fill={light ? "#0284C7" : "url(#fos-glow)"}
        />

        {/* Vertical Stem of 'F' */}
        <rect
          x="10.5"
          y="12"
          width="2.5"
          height="11"
          rx="1.2"
          fill={light ? "#0045AC" : "#FFFFFF"}
        />

        {/* OS Core Terminal Spark / Glowing Pulse Node */}
        <circle
          cx="19.8"
          cy="21.5"
          r="2.4"
          fill={light ? "#0284C7" : "#38BDF8"}
        />

        {/* Inner high-speed spinning dashed ring */}
        <circle
          cx="19.8"
          cy="21.5"
          r="4.2"
          stroke={light ? "#0284C7" : "#38BDF8"}
          strokeWidth="1.1"
          strokeOpacity="0.8"
          strokeDasharray="2 1.8"
        >
          {animated && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 19.8 21.5"
              to="360 19.8 21.5"
              dur="6s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Outer orbital radar wheel (much more visible and prominent) */}
        <circle
          cx="19.8"
          cy="21.5"
          r="6.0"
          stroke={light ? "#0045AC" : "#67E8F9"}
          strokeWidth="0.9"
          strokeOpacity="0.55"
          strokeDasharray="3 2.5"
        >
          {animated && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360 19.8 21.5"
              to="0 19.8 21.5"
              dur="10s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>
    </div>
  );
}

export function Logo({
  className,
  compact = false,
  light = false,
}: {
  className?: string;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <LogoIcon className="h-8 w-8" light={light} />

      {!compact && (
        <div className="flex items-center leading-none">
          <span
            className={cn(
              "text-display text-[19px] font-bold tracking-tight",
              light ? "text-white" : "text-foreground"
            )}
          >
            Factura
            <span
              className={cn(
                "font-black tracking-tight",
                light
                  ? "text-cyan-300"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-300"
              )}
            >
              OS
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export function FacturaOSSplashLoader({
  message = "Iniciando FacturaOS...",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 select-none animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center">
        {/* Glow halo ambient background */}
        <div className="absolute -inset-8 rounded-full bg-blue-500/25 blur-3xl animate-pulse pointer-events-none" />

        {/* Big Rotating Orbital Rig */}
        <div className="relative grid place-items-center mb-6">
          {/* Outer large dashed radar wheel */}
          <div className="absolute -inset-5 sm:-inset-6 rounded-[34px] border-2 border-dashed border-cyan-400/50 animate-[spin_8s_linear_infinite]" />

          {/* Secondary counter-rotating faint orbit ring */}
          <div className="absolute -inset-9 sm:-inset-10 rounded-full border border-blue-500/30 animate-[spin_16s_linear_infinite_reverse]" />

          {/* Large prominent Isotipo */}
          <LogoIcon
            className="h-24 w-24 sm:h-28 sm:w-28 shadow-2xl ring-2 ring-white/20 rounded-3xl"
            animated={true}
          />
        </div>

        {/* Wordmark FacturaOS */}
        <div className="flex items-center leading-none">
          <span className="text-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Factura
            <span className="font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-300">
              OS
            </span>
          </span>
        </div>

        {/* Status text + glowing progress bar */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">
            {message}
          </p>
          <div className="h-1.5 w-36 sm:w-44 overflow-hidden rounded-full bg-muted/70">
            <div className="h-full w-full origin-left animate-[pulse_1.5s_ease-in-out_infinite] bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
