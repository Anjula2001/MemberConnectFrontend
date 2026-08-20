"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/lib/utils";

/** Rows per page everywhere this control is used. */
export const DEFAULT_PAGE_SIZE = 10;

/** Total number of pages for a result set, never less than 1. */
export const pageCountFor = (total: number, pageSize = DEFAULT_PAGE_SIZE) =>
  Math.max(1, Math.ceil(total / pageSize));

/**
 * Clamps a page number into range. Filters and re-sorts shrink the result set
 * under whatever page the user was on, so every caller runs its page through
 * this rather than trusting the stored value.
 */
export const clampPage = (page: number, total: number, pageSize = DEFAULT_PAGE_SIZE) =>
  Math.min(Math.max(1, page), pageCountFor(total, pageSize));

/** The slice of rows belonging to `page`. */
export const pageSlice = <T,>(rows: T[], page: number, pageSize = DEFAULT_PAGE_SIZE) => {
  const safePage = clampPage(page, rows.length, pageSize);
  return rows.slice((safePage - 1) * pageSize, safePage * pageSize);
};

/**
 * Page numbers to render, collapsing long runs to "1 … 4 5 6 … 20" so the
 * control keeps a fixed width however many pages there are.
 */
const pageNumbers = (page: number, pageCount: number): (number | "gap")[] => {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const ordered = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const withGaps: (number | "gap")[] = [];
  ordered.forEach((p, i) => {
    if (i > 0 && p - (ordered[i - 1] as number) > 1) withGaps.push("gap");
    withGaps.push(p);
  });
  return withGaps;
};

export interface TablePaginationProps {
  /** 1-based. */
  page: number;
  /** Rows across every page, not just the visible ones. */
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  className?: string;
  /** Noun for the row count, e.g. "member" — pluralised with a trailing "s". */
  itemLabel?: string;
}

/**
 * Footer control for the paged list screens. It renders nothing at all for an
 * empty result: a "Showing 0-0 of 0" strip under an empty-state row reads as a
 * broken table rather than an empty one.
 */
export function TablePagination({
  page,
  total,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
  itemLabel = "member",
}: TablePaginationProps) {
  if (total === 0) return null;

  const pageCount = pageCountFor(total, pageSize);
  const safePage = clampPage(page, total, pageSize);
  const firstRow = (safePage - 1) * pageSize + 1;
  const lastRow = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-xs text-neutral-500">
        Showing {firstRow}–{lastRow} of {total} {itemLabel}
        {total === 1 ? "" : "s"}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageNumbers(safePage, pageCount).map((entry, index) =>
            entry === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-xs text-neutral-400">
                …
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 min-w-8 px-2 text-xs",
                  entry === safePage &&
                    "border-[#9e3600] bg-[#9e3600] text-white hover:bg-[#9e3600] hover:text-white"
                )}
                onClick={() => onPageChange(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === safePage ? "page" : undefined}
              >
                {entry}
              </Button>
            )
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default TablePagination;
