import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatDate, formatRelativeDays } from "@/shared/lib/format";
import type { OrderTotals } from "@/modules/order/domain/order";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Money } from "@/shared/ui/Money";
import { StatTile } from "@/shared/ui/StatTile";
import type { AccountOverview } from "../application/get-account-overview";
import { DownloadButtons } from "./DownloadButtons";
import { MonthlySalesChart } from "./MonthlySalesChart";
import { PageHeader } from "./PageHeader";

const linkClass = "text-xs font-medium text-brand-700 hover:underline";

export interface DashboardScreenProps {
  overview: AccountOverview;
  /** null when there is no open order. */
  order: (OrderTotals & { lineCount: number }) | null;
  now: Date;
}

export function DashboardScreen({ overview, order, now }: DashboardScreenProps) {
  const { statement, activity, consignment, monthlySales, account } = overview;
  const hasItems = order !== null && order.lineCount > 0;

  return (
    <>
      <PageHeader title="Dashboard" description={`${account.bookstoreName} — ${account.branch}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Pedido vigente"
            actions={hasItems ? <Link href="/pedido" className={linkClass}>Ver pedido vigente</Link> : null}
          />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Total del pedido" value={<Money cents={order?.total ?? 0} />} />
            <StatTile label="Total disponible" value={<Money cents={order?.available ?? 0} />} />
            <StatTile label="Estado" value={order ? "Abierto" : "Sin pedido abierto"} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Estado de cuenta" actions={<DownloadButtons subject="el estado de cuenta" />} />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Saldo" value={<Money cents={statement.balance} />} />
            {statement.overdue > 0 ? (
              <StatTile tone="danger" label="Saldo vencido" value={<Money cents={statement.overdue} />} />
            ) : (
              <StatTile label="Saldo vencido" value={<span className="text-sm font-normal text-ink-muted">Sin vencimientos impagos</span>} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Actividad" />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Último pedido" value={formatRelativeDays(activity.lastOrderAt, now)} />
            <StatTile
              label="Última factura"
              value={activity.lastInvoice ? <Money cents={activity.lastInvoice.amount} /> : "Sin facturas"}
              footer={
                activity.lastInvoice ? (
                  <a href={activity.lastInvoice.url} className={linkClass}>
                    Ver factura
                  </a>
                ) : null
              }
            />
            <StatTile
              label="Último envío"
              value={activity.lastShipment ? formatDate(activity.lastShipment.date) : "Sin envíos"}
              footer={
                activity.lastShipment?.trackingUrl ? (
                  <a href={activity.lastShipment.trackingUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                    Ver seguimiento <ExternalLink aria-hidden className="size-3" />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                ) : null
              }
            />
          </CardBody>
        </Card>

        {consignment ? (
          <Card>
            <CardHeader title="Consignaciones" actions={<DownloadButtons subject="las consignaciones" />} />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              <StatTile label="Valorización tapa" value={<Money cents={consignment.coverValue} />} />
              <StatTile label="Ejemplares consignados" value={consignment.copies.toLocaleString("es-AR")} />
            </CardBody>
          </Card>
        ) : null}

        <Card className="lg:col-span-2">
          <CardHeader title="Ventas Mensuales" subtitle="Últimos 12 meses" />
          <CardBody>
            <MonthlySalesChart points={monthlySales} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
