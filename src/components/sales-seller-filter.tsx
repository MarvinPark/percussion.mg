"use client";

import { useEffect, useRef, useState } from "react";

const triggerClass =
  "inline-flex h-[26px] min-w-[7rem] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none text-zinc-900 outline-none hover:bg-zinc-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

const menuClass =
  "absolute left-0 top-full z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900";

const optionClass =
  "block w-full px-2 py-1.5 text-left text-[12px] leading-none text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800";

type SalesSellerFilterProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
};

export default function SalesSellerFilter({
  value,
  options,
  onChange,
  showAllOption = false,
  allOptionLabel = "전체 보기",
}: SalesSellerFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        {value || "판매자선택"}
      </button>

      {open ? (
        <ul role="listbox" className={menuClass}>
          {showAllOption ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => selectOption("")}
                className={optionClass}
              >
                {allOptionLabel}
              </button>
            </li>
          ) : null}
          {options.length === 0 ? (
            <li className="px-2 py-1.5 text-[12px] leading-none text-zinc-500 dark:text-zinc-400">
              판매자 없음
            </li>
          ) : (
            options.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === name}
                  onClick={() => selectOption(name)}
                  className={optionClass}
                >
                  {name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
