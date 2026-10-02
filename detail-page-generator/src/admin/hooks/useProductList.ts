import { useCallback, useSyncExternalStore } from 'react'
import {
  deleteProduct,
  getBrand,
  listProducts,
  toListItem,
} from '../../lib/productStorage'
import type { ProductListItem } from '../../types/product'

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('pc-products-updated', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('pc-products-updated', onStoreChange)
  }
}

function getSnapshot(): ProductListItem[] {
  return [...listProducts()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => {
      const brandName = p.brandId ? getBrand(p.brandId)?.name ?? '(브랜드 없음)' : '(브랜드 없음)'
      return toListItem(p, brandName)
    })
}

function notifyListUpdated() {
  window.dispatchEvent(new Event('pc-products-updated'))
}

export function useProductList() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const remove = useCallback((id: string) => {
    if (!window.confirm('이 상품을 삭제할까요?')) return
    deleteProduct(id)
    notifyListUpdated()
  }, [])

  return { items, remove }
}

export { notifyListUpdated }
