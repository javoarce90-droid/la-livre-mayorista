"use client";

import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";

const SHORTCUTS = [
  ["+T", "Título", "+TCASA"],
  ["+A", "Autor", "+ABORGES"],
  ["+E", "Editorial", "+EALFAGUARA"],
  ["+I", "ISBN", "+I9789503074060"],
  ["+C", "Código interno", "+C100137"],
] as const;

export function SearchHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="¿Cómo buscar?" onClose={onClose} footer={<Button size="lg" onClick={onClose}>Entendido</Button>}>
      <div className="space-y-5 text-sm text-ink">
        <section className="space-y-1.5">
          <h3 className="font-semibold">Escribí lo que sepas</h3>
          <p className="text-ink-muted">
            Título, autor, editorial o ISBN, en cualquier orden: <code className="font-mono text-xs text-ink">cien años</code>,{" "}
            <code className="font-mono text-xs text-ink">borges aleph</code>,{" "}
            <code className="font-mono text-xs text-ink">978-950-307-406-0</code>. No importan mayúsculas, acentos ni guiones.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold">Combiná filtros</h3>
          <p className="text-ink-muted">
            Usá los filtros de Autor, Editorial, Materia, Disponibilidad y Promoción. Se suman a lo que escribiste: se tienen
            que cumplir todos. Podés filtrar sin escribir nada, por ejemplo todo lo disponible de una editorial.
          </p>
        </section>

        <section className="space-y-1.5">
          <h3 className="font-semibold">Lector de código de barras</h3>
          <p className="text-ink-muted">Escaneá directo en el buscador: se busca por ISBN automáticamente.</p>
        </section>

        <details className="rounded-lg border border-line px-3 py-2">
          <summary className="cursor-pointer py-1 font-medium">Atajos con letra (opcional)</summary>
          <div className="mt-2 space-y-3 text-ink-muted">
            <p>
              Si ya usabas las letras, siguen funcionando. Con <strong className="text-ink">+</strong> y la letra, el texto se
              busca solo en ese campo. Combinalos separados por espacios:{" "}
              <code className="font-mono text-xs text-ink">+TCUENTOS +ABORGES</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-medium">Atajo</th>
                    <th className="py-2 pr-3 font-medium">Busca en</th>
                    <th className="py-2 font-medium">Ejemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS.map(([shortcut, field, example]) => (
                    <tr key={shortcut} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 font-semibold text-brand-700">{shortcut}</td>
                      <td className="py-2 pr-3 text-ink">{field}</td>
                      <td className="py-2 font-mono text-xs text-ink">{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Sin + (por ejemplo <code className="font-mono text-xs text-ink">ABORGES</code>) también funciona: si no hay libros
              con ese texto, lo tomamos como atajo y te avisamos.
            </p>
          </div>
        </details>
      </div>
    </Modal>
  );
}
