"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyTableColumnOrder,
  loadTableColumnOrder,
  reorderTableColumnOrder,
  saveTableColumnOrder,
} from "@/lib/table-column-order";

type UseTableColumnOrderOptions<T extends string> = {
  fixedStart?: T[];
  fixedEnd?: T[];
};

export function useTableColumnOrder<T extends string, C extends { id: T }>(
  storageKey: string,
  defaultOrder: T[],
  baseColumns: C[],
  options: UseTableColumnOrderOptions<T> = {},
) {
  const { fixedStart = [], fixedEnd = [] } = options;
  const [order, setOrder] = useState<T[]>(defaultOrder);
  const orderRef = useRef(order);
  const [draggingColumnId, setDraggingColumnId] = useState<T | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<T | null>(null);
  const dragJustEndedRef = useRef(false);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    setOrder(loadTableColumnOrder(storageKey, defaultOrder));
  }, [storageKey, defaultOrder]);

  const orderedColumns = useMemo(
    () => applyTableColumnOrder(baseColumns, order, fixedStart, fixedEnd),
    [baseColumns, fixedEnd, fixedStart, order],
  );

  const moveColumn = useCallback(
    (fromId: T, toId: T) => {
      setOrder((current) => {
        const next = reorderTableColumnOrder(current, fromId, toId);
        orderRef.current = next;
        saveTableColumnOrder(storageKey, next, defaultOrder);
        return next;
      });
    },
    [defaultOrder, storageKey],
  );

  const handleColumnDragStart = useCallback((columnId: T) => {
    setDraggingColumnId(columnId);
  }, []);

  const handleColumnDragEnd = useCallback(() => {
    setDraggingColumnId(null);
    setDragOverColumnId(null);
    dragJustEndedRef.current = true;
    window.requestAnimationFrame(() => {
      dragJustEndedRef.current = false;
    });
  }, []);

  const handleColumnDragOver = useCallback((columnId: T) => {
    setDragOverColumnId(columnId);
  }, []);

  const handleColumnDrop = useCallback(
    (targetColumnId: T) => {
      if (draggingColumnId && draggingColumnId !== targetColumnId) {
        moveColumn(draggingColumnId, targetColumnId);
      }
      handleColumnDragEnd();
    },
    [draggingColumnId, handleColumnDragEnd, moveColumn],
  );

  return {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  };
}
