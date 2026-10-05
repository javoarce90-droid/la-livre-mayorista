"use client";

import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";

const LETTERS = [
  ["T", "Título", "TCASA", "Se posiciona alfabéticamente desde el texto."],
  ["A", "Autor", "ABORGES", "Se posiciona alfabéticamente desde el texto (Apellido, Nombre)."],
  ["E", "Editorial", "EALFAGUARA", "Editoriales que empiezan con el texto."],
  ["I", "ISBN", "I9789503074060", "13 dígitos, sin guiones. Coincidencia exacta."],
  ["C", "Código interno", "C100137", "Coincidencia exacta."],
] as const;

export function SearchHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="¿Cómo buscar?" onClose={onClose} footer={<Button onClick={onClose}>Entendido</Button>}>
      <div className="space-y-5 text-sm text-ink">
        <p>
          La primera letra elige el criterio y va <strong>pegada</strong> al texto, sin espacio. No importan mayúsculas ni
          acentos.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Letra</th>
                <th className="py-2 pr-3 font-medium">Busca por</th>
                <th className="py-2 pr-3 font-medium">Ejemplo</th>
                <th className="py-2 font-medium">Cómo funciona</th>
              </tr>
            </thead>
            <tbody>
              {LETTERS.map(([letter, field, example, how]) => (
                <tr key={letter} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-semibold text-brand-700">{letter}</td>
                  <td className="py-2 pr-3">{field}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{example}</td>
                  <td className="py-2 text-ink-muted">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-ink-muted">
          <li>
            Con <strong className="text-ink">+</strong> adelante, la palabra puede estar en cualquier parte del campo:{" "}
            <code className="font-mono text-xs text-ink">+TCASA</code>.
          </li>
          <li>
            Combiná criterios separándolos con espacios, cada uno con su +:{" "}
            <code className="font-mono text-xs text-ink">+TCUENTOS +ABORGES</code>. Se tienen que cumplir todos.
          </li>
          <li>
            Si usás lector de código de barras, el texto empieza con <code className="font-mono text-xs text-ink">*</code> o{" "}
            <code className="font-mono text-xs text-ink">(</code> y se busca por ISBN automáticamente.
          </li>
        </ul>
      </div>
    </Modal>
  );
}
