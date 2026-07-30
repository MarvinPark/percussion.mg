"use client";

import { useCallback, useMemo, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import { filterProducts } from "@/lib/product-search";
import type { Product } from "@/types/product";

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  readOnly?: boolean;
};

export default function ProductsPageClient({
  userId,
  products,
  readOnly = false,
}: ProductsPageClientProps) {
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const filteredProducts = useMemo(
    () => filterProducts(products, appliedQuery),
    [products, appliedQuery],
  );

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
  }, [draftQuery]);

  const handleSelectProduct = useCallback((product: Product) => {
    const value = product.sku || product.model_name;
    setDraftQuery(value);
    setAppliedQuery(value);
    setHighlightedIds(new Set([product.id]));

    requestAnimationFrame(() => {
      document
        .getElementById(`product-row-${product.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    window.setTimeout(() => {
      setHighlightedIds(new Set());
    }, 2500);
  }, []);

  return (
    <ProductsWorkspace
      userId={userId}
      products={filteredProducts}
      readOnly={readOnly}
      externalHighlightedIds={highlightedIds}
      searchSlot={
        <ProductListSearch
          compact
          products={products}
          query={draftQuery}
          onQueryChange={setDraftQuery}
          onConfirm={applySearch}
          onSelectProduct={handleSelectProduct}
        />
      }
    />
  );
}
