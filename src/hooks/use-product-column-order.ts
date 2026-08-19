"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductTableColumn, ProductTableColumnId } from "@/lib/product-table-columns";
import {
  applyColumnOrder,
  getDefaultColumnOrder,
  loadColumnOrder,
  reorderColumnOrder,
  saveColumnOrder,
} from "@/lib/product-table-column-order";

export function useProductColumnOrder(
  userId: string,
  baseColumns: ProductTableColumn[],
) {
  const [order, setOrder] = useState<ProductTableColumnId[]>(() =>
    getDefaultColumnOrder(baseColumns),
  );
  const orderRef = useRef(order);
  const [draggingColumnId, setDraggingColumnId] = useState<ProductTableColumnId | null>(
    null,
  );
  const [dragOverColumnId, setDragOverColumnId] = useState<ProductTableColumnId | null>(
    null,
  );
  const dragJustEndedRef = useRef(false);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    setOrder(loadColumnOrder(userId, baseColumns));
  }, [userId, baseColumns]);

  const orderedColumns = useMemo(
    () => applyColumnOrder(baseColumns, order),
    [baseColumns, order],
  );

  const moveColumn = useCallback(
    (fromId: ProductTableColumnId, toId: ProductTableColumnId) => {
      setOrder((current) => {
        const next = reorderColumnOrder(current, fromId, toId);
        orderRef.current = next;
        saveColumnOrder(userId, next, baseColumns);
        return next;
      });
    },
    [baseColumns, userId],
  );

  const handleColumnDragStart = useCallback((columnId: ProductTableColumnId) => {
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

  const handleColumnDragOver = useCallback((columnId: ProductTableColumnId) => {
    setDragOverColumnId(columnId);
  }, []);

  const handleColumnDrop = useCallback(
    (targetColumnId: ProductTableColumnId) => {
      if (draggingColumnId && draggingColumnId !== targetColumnId) {
        moveColumn(draggingColumnId, targetColumnId);
      }
      handleColumnDragEnd();
    },
    [draggingColumnId, handleColumnDragEnd, moveColumn],
  );

  const shouldIgnoreSortClick = useCallback(() => dragJustEndedRef.current, []);

  return {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
    shouldIgnoreSortClick,
  };
}
