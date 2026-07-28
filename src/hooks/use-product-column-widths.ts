"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDefaultColumnWidths,
  loadColumnWidths,
  PRODUCT_TABLE_COLUMNS,
  saveColumnWidths,
  type ProductTableColumnId,
} from "@/lib/product-table-columns";

export function useProductColumnWidths(userId: string) {
  const [widths, setWidths] = useState(getDefaultColumnWidths);
  const widthsRef = useRef(widths);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    setWidths(loadColumnWidths(userId));
  }, [userId]);

  const startResize = useCallback(
    (columnId: ProductTableColumnId, startX: number) => {
      const column = PRODUCT_TABLE_COLUMNS.find((item) => item.id === columnId);
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
        saveColumnWidths(userId, widthsRef.current);
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [userId],
  );

  const tableMinWidth = PRODUCT_TABLE_COLUMNS.reduce(
    (sum, column) => sum + widths[column.id],
    0,
  );

  return { widths, startResize, tableMinWidth };
}
