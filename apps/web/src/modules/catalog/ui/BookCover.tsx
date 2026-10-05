import { BookOpen } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import type { Promotion } from "../domain/book";

/** Generic cover placeholder with an optional red promo ribbon (e.g. "-15%"). */
export function BookCover({ promotion, size = "sm" }: { promotion: Promotion | null; size?: "sm" | "lg" }) {
  return (
    <div
      className={cx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-gradient-to-br from-brand-50 to-canvas text-brand-200",
        size === "sm" ? "h-14 w-10" : "aspect-[2/3] w-full max-w-44",
      )}
    >
      <BookOpen aria-hidden className={size === "sm" ? "size-4" : "size-10"} />
      {promotion ? (
        <span
          className={cx(
            "absolute top-0 right-0 bg-danger-600 font-bold text-white",
            size === "sm" ? "rounded-bl px-1 text-[9px]" : "rounded-bl-md px-2 py-0.5 text-xs",
          )}
        >
          -{promotion.percent}%<span className="sr-only"> en promoción</span>
        </span>
      ) : null}
    </div>
  );
}
