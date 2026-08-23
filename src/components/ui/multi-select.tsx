"use client";

import { useEffect, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * A small checkbox dropdown for the multi-select filters the SRS asks for
 * (Location and Status on MMD12).
 *
 * An empty selection means "all", which is why the trigger falls back to
 * `allLabel` rather than showing "0 selected" — the filters read as "everything
 * unless you narrow it", and an empty multi-select that returned nothing would
 * be a trap.
 *
 * Lifted out of the dormant page, where it lived as a private component with a
 * comment explaining that no new files were allowed. The approval-list screens
 * need the same control, and two copies of a dropdown is how they drift apart.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel = "All",
  width = "w-64",
  disabled = false,
}: {
  /**
   * Optional. Omit it when the caller already renders a label of its own, so the
   * control does not stack two labels on top of each other.
   */
  label?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  allLabel?: string;
  width?: string;
  /** SRS 4.2.3: the Location filter is un-editable for a district-scoped user. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const summary =
    selected.length === 0
      ? allLabel
      : options
          .filter((o) => selected.includes(o.value))
          .map((o) => o.label)
          .join(", ");

  return (
    <div className={width}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground mb-2 block">{label}</label>
      )}
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="truncate text-left">{summary}</span>
          <svg
            className="ml-2 h-4 w-4 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && !disabled && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white p-1 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => onChange([])}
            >
              <span
                className={`h-4 w-4 rounded border ${selected.length === 0 ? "bg-[#8B4513]" : ""}`}
              />
              {allLabel}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                onClick={() => toggle(o.value)}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selected.includes(o.value) ? "bg-[#8B4513] text-white" : ""
                  }`}
                >
                  {selected.includes(o.value) && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <span className="truncate text-left">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiSelect;
