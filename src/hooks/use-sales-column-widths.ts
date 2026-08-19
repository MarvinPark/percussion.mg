"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDefaultSalesColumnWidths,
  loadSalesColumnWidths,
  SALES_TABLE_COLUMNS,
  saveSalesColumnWidths,
  type SalesTableColumnId,
} from "@/lib/sales-table-columns";

export function useSalesColumnWidths(userId: string) {
  const [widths, setWidths] = useState(getDefaultSalesColumnWidths);
  const widthsRef = useRef(widths);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    setWidths(loadSalesColumnWidths(userId));
  }, [userId]);

  const startResize = useCallback(
    (columnId: SalesTableColumnId, startX: number) => {
      const column = SALES_TABLE_COLUMNS.find((item) => item.id === columnId);
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
        saveSalesColumnWidths(userId, widthsRef.current);
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
