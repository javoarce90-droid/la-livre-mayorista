import Link from "next/link";
import { Hourglass } from "lucide-react";
import { buttonClasses } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "./PageHeader";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Hourglass aria-hidden className="size-6" />
        </span>
        <h2 className="text-lg font-semibold text-ink">Próximamente</h2>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          Estamos terminando esta sección. Mientras tanto, podés buscar títulos en Libros y armar tu pedido.
        </p>
        <Link href="/libros" className={buttonClasses("primary", "md", "mt-6")}>
          Ir a Libros
        </Link>
      </Card>
    </>
  );
}
