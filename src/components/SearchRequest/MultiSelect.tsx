'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A checkbox dropdown for the Profile Changes filters.
 *
 * Replaces the native `<select multiple>`, which rendered as a fixed scrolling box:
 * it was taller than every field beside it, hid its own options behind a scrollbar,
 * and needed ctrl-click to pick a second value — a gesture most users never discover.
 *
 * "All" is exclusive. Selecting it clears the individual choices, and choosing any
 * individual value clears "All", because the two mean different things to the query:
 * "All" sends no filter at all.
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allValue,
  allLabel = 'All',
  disabled = false,
  emptyText = 'None available',
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Sentinel for the "everything" choice. Omit to make this a plain multi-select. */
  allValue?: string;
  allLabel?: string;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const isAll = allValue != null && selected.includes(allValue);

  const toggle = (value: string) => {
    if (allValue != null && value === allValue) {
      onChange([allValue]);
      return;
    }
    const withoutAll = selected.filter((v) => v !== allValue);
    const next = withoutAll.includes(value)
      ? withoutAll.filter((v) => v !== value)
      : [...withoutAll, value];
    // Falling back to "All" beats an empty filter that silently returns everything
    // while the control claims nothing is selected.
    onChange(next.length === 0 && allValue != null ? [allValue] : next);
  };

  const summary = () => {
    if (isAll) return allLabel;
    if (selected.length === 0) return allValue != null ? allLabel : `Any ${label.toLowerCase()}`;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="flex flex-col gap-1" ref={boxRef}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-1 text-left text-sm shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          <span className={isAll || selected.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
            {summary()}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {allValue != null && (
              <Option
                label={allLabel}
                checked={isAll}
                onClick={() => toggle(allValue)}
                divider={options.length > 0}
              />
            )}
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{emptyText}</p>
            ) : (
              options.map((o) => (
                <Option
                  key={o.value}
                  label={o.label}
                  checked={!isAll && selected.includes(o.value)}
                  onClick={() => toggle(o.value)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Option({
  label,
  checked,
  onClick,
  divider = false,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  divider?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
        divider ? 'border-b border-gray-100' : ''
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-[#953002] bg-[#953002]' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className={checked ? 'font-medium text-gray-900' : 'text-gray-700'}>{label}</span>
    </button>
  );
}
