import { formatMoney } from "@/shared/lib/format";
import type { MonthlySalePoint } from "../domain/monthly-sales";

/** Single-series bar chart in plain HTML/CSS: hover/focus tooltip per bar + screen-reader table. */
export function MonthlySalesChart({ points }: { points: MonthlySalePoint[] }) {
  const max = Math.max(...points.map((point) => point.amount), 1);
  return (
    <figure>
      <div className="flex h-44 items-end gap-[2px] border-b border-line sm:gap-2" aria-hidden>
        {points.map((point) => (
          <div key={point.month} className="group relative flex h-full flex-1 items-end justify-center">
            <div

              className="w-full max-w-10 rounded-t bg-brand-500 transition-colors group-hover:bg-brand-700"
              style={{ height: `${Math.max((point.amount / max) * 100, point.amount > 0 ? 2 : 0)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden -translate-y-1 rounded-md bg-brand-950 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow group-hover:block">
              <span className="capitalize">{point.label}</span> · {formatMoney(point.amount)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] sm:gap-2" aria-hidden>
        {points.map((point) => (
          <span key={point.month} className="flex-1 text-center text-[10px] text-ink-muted capitalize sm:text-xs">
            {point.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Ventas mensuales de los últimos 12 meses</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Importe</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <td>{point.month}</td>
              <td>{formatMoney(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
