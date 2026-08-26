"use client";

import { useEffect, useRef, useState } from "react";
import { searchBusinessPartnersForAutocomplete } from "@/app/(main)/partners/actions";
import type { BusinessPartnerSuggestion } from "@/lib/business-partners";
import { PARTNER_TYPE_LABELS } from "@/types/business-partner";

type BusinessPartnerAutocompleteProps = {
  id?: string;
  name: string;
  value: string;
  partnerId: string;
  onChange: (value: string) => void;
  onPartnerIdChange: (partnerId: string) => void;
  onSelectPartner?: (partner: BusinessPartnerSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function BusinessPartnerAutocomplete({
  id,
  name,
  value,
  partnerId,
  onChange,
  onPartnerIdChange,
  onSelectPartner,
  placeholder,
  className = "",
  disabled = false,
}: BusinessPartnerAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [matches, setMatches] = useState<BusinessPartnerSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setMatches([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void searchBusinessPartnersForAutocomplete(query).then((response) => {
        setMatches(response.partners);
        setIsSearching(false);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [matches.length, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(partner: BusinessPartnerSuggestion) {
    onPartnerIdChange(partner.id);
    onChange(partner.display_name);
    onSelectPartner?.(partner);
    setOpen(false);
  }

  function handleInputChange(nextValue: string) {
    onPartnerIdChange("");
    onChange(nextValue);
    setOpen(nextValue.trim().length >= 1);
  }

  const showDropdown = open && value.trim().length >= 1;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name="partner_id" value={partnerId} />
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          if (value.trim().length >= 1) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (showDropdown && matches[highlightIndex]) {
              handleSelect(matches[highlightIndex]);
            }
            return;
          }

          if (!showDropdown || matches.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightIndex((prev) => (prev + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightIndex(
              (prev) => (prev - 1 + matches.length) % matches.length,
            );
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />

      {showDropdown ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
          {isSearching ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              검색 중…
            </li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              등록된 거래처가 없습니다. 저장 시 자동 등록됩니다.
            </li>
          ) : (
            matches.map((partner, index) => (
              <li key={partner.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(partner)}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    index === highlightIndex
                      ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                      : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">
                      {partner.corp_name || partner.display_name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {PARTNER_TYPE_LABELS[partner.partner_type]}
                    </span>
                    {partner.invoice_ready ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                        세금계산서
                      </span>
                    ) : null}
                  </span>
                  {partner.ceo_name || partner.memo ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {[
                        partner.ceo_name ? `대표: ${partner.ceo_name}` : null,
                        partner.memo,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                  {partner.contact_name || partner.contact_phone ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {[partner.contact_name, partner.contact_phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
