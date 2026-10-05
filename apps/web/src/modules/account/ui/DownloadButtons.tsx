"use client";

import { useToast } from "@/shared/ui/Toast";

/** PDF/XLS icon buttons. Mock: downloads are not wired yet, so they show a toast. */
export function DownloadButtons({ subject }: { subject: string }) {
  const toast = useToast();
  const formats = [
    { label: "PDF", className: "bg-danger-600 hover:bg-danger-700" },
    { label: "XLS", className: "bg-success-800 hover:bg-success-700" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs text-ink-muted sm:inline">Descargar</span>
      {formats.map((format) => (
        <button
          key={format.label}
          type="button"
          aria-label={`Descargar ${subject} en ${format.label}`}
          title={`Descargar ${format.label}`}
          onClick={() => toast(`La descarga en ${format.label} estará disponible pronto.`)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${format.className}`}
        >
          {format.label}
        </button>
      ))}
    </div>
  );
}
