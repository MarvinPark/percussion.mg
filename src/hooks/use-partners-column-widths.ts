"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDefaultPartnersColumnWidths,
  loadPartnersColumnWidths,
  PARTNERS_TABLE_COLUMNS,
  savePartnersColumnWidths,
  type PartnersTableColumnId,
} from "@/lib/partners-table-columns";

export function usePartnersColumnWidths(userId: string) {
  const [widths, setWidths] = useState(getDefaultPartnersColumnWidths);
  const widthsRef = useRef(widths);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    setWidths(loadPartnersColumnWidths(userId));
  }, [userId]);

  const startResize = useCallback(
    (columnId: PartnersTableColumnId, startX: number) => {
      const column = PARTNERS_TABLE_COLUMNS.find((item) => item.id === columnId);
      if (!column?.resizable) return;

      const startWidth = widthsRef.current[columnId];
      const minWidth = column.minWidth;

      function onMove(event: MouseEvent) {
        const nextWidth = Math.max(
          minWidth,
          startWidth + (event.clientX - startX),
        );

        setWidths((prev) => {
          const next = { ...prev, [columnId]: nextWidth };
          widthsRef.current = next;
          return next;
        });
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        savePartnersColumnWidths(userId, widthsRef.current);
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [userId],
  );

  return { widths, startResize };
}
