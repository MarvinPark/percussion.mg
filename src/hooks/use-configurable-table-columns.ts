"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTableColumnOrder } from "@/hooks/use-table-column-order";
import {
  getDefaultWidthsFromColumns,
  loadTableColumnWidths,
  saveTableColumnWidths,
  type ConfigurableTableColumn,
} from "@/lib/configurable-table-columns";

type UseConfigurableTableColumnsOptions<T extends string> = {
  fixedStart?: T[];
  fixedEnd?: T[];
};

export function useConfigurableTableColumns<T extends string>(
  userId: string,
  orderStorageKey: string,
  widthStorageKey: string,
  columns: ConfigurableTableColumn<T>[],
  options: UseConfigurableTableColumnsOptions<T> = {},
) {
  const { fixedStart = [], fixedEnd = [] } = options;

  const defaultOrder = useMemo(
    () =>
      columns
        .map((column) => column.id)
        .filter((id) => !fixedStart.includes(id) && !fixedEnd.includes(id)),
    [columns, fixedEnd, fixedStart],
  );

  const {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useTableColumnOrder(orderStorageKey, defaultOrder, columns, {
    fixedStart,
    fixedEnd,
  });

  const [widths, setWidths] = useState(() => getDefaultWidthsFromColumns(columns));
  const widthsRef = useRef(widths);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    setWidths(loadTableColumnWidths(widthStorageKey, columns));
  }, [columns, widthStorageKey]);

  const startResize = useCallback(
    (columnId: T, startX: number) => {
      const column = columns.find((item) => item.id === columnId);
      if (!column?.resizable) return;

      const startWidth = widthsRef.current[columnId];
      const minWidth = column.minWidth;

      function onMove(event: MouseEvent) {
        const nextWidth = Math.max(
          minWidth,
          startWidth + (event.clientX - startX),
        );

        setWidths((current) => {
          const next = { ...current, [columnId]: nextWidth };
          widthsRef.current = next;
          return next;
        });
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        saveTableColumnWidths(widthStorageKey, widthsRef.current);
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [columns, widthStorageKey],
  );

  const tableMinWidth = orderedColumns.reduce(
    (sum, column) => sum + widths[column.id],
    0,
  );

  return {
    orderedColumns,
    widths,
    startResize,
    tableMinWidth,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
    fixedStart,
    fixedEnd,
  };
}
