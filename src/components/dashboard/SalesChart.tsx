import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { salesSeries, formatCRC } from "@/lib/mock-data";

export function SalesChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Ventas de la semana</h3>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {formatCRC(salesSeries.reduce((a, b) => a + b.ventas, 0))}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" /> Ventas
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" /> Facturas
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={salesSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-primary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-success" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₡${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "var(--shadow-floating)",
              }}
              formatter={(v: number, name) => [
                name === "ventas" ? formatCRC(v) : v,
                name === "ventas" ? "Ventas" : "Facturas",
              ]}
            />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="url(#grad-primary)"
            />
            <Area
              type="monotone"
              dataKey="facturas"
              stroke="var(--color-success)"
              strokeWidth={2}
              fill="url(#grad-success)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
