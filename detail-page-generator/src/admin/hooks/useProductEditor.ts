import { useCallback, useMemo, useState } from 'react'
import { createId } from '../../lib/id'
import {
  createEmptyBrandDraft,
  createEmptyProduct,
  getBrand,
  getProduct,
  listBrands,
  saveBrand,
  saveProduct,
} from '../../lib/productStorage'
import type { Brand, Product, ProductFormValues } from '../../types/product'

function buildInitialForm(product: Product, brands: Brand[]): ProductFormValues {
  const linked = product.brandId ? getBrand(product.brandId) : undefined
  if (linked) {
    return {
      product,
      brandMode: 'existing',
      selectedBrandId: linked.id,
      brandDraft: createEmptyBrandDraft(),
    }
  }
  return {
    product,
    brandMode: brands.length > 0 ? 'existing' : 'new',
    selectedBrandId: brands[0]?.id ?? null,
    brandDraft: createEmptyBrandDraft(),
  }
}

export function useProductEditor(productId: string | undefined) {
  const isNew = !productId

  const initialProduct = useMemo(() => {
    if (productId) {
      return getProduct(productId) ?? createEmptyProduct()
    }
    return createEmptyProduct()
  }, [productId])

  const [form, setForm] = useState<ProductFormValues>(() =>
    buildInitialForm(initialProduct, listBrands()),
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const brands = listBrands()

  const patchForm = useCallback((patch: Partial<ProductFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const patchProduct = useCallback((patch: Partial<Product>) => {
    setForm((prev) => ({ ...prev, product: { ...prev.product, ...patch } }))
  }, [])

  const save = useCallback((): { error: string | null; productId: string | null } => {
    let brandId = form.product.brandId

    if (form.brandMode === 'existing') {
      if (!form.selectedBrandId) {
        return { error: '브랜드를 선택하거나 새 브랜드를 입력해 주세요.', productId: null }
      }
      brandId = form.selectedBrandId
    } else {
      if (!form.brandDraft.name.trim()) {
        return { error: '브랜드명을 입력해 주세요.', productId: null }
      }
      const brand: Brand = {
        id: createId('brand'),
        ...form.brandDraft,
      }
      saveBrand(brand)
      brandId = brand.id
    }

    if (!form.product.productName.trim()) {
      return { error: '제품명을 입력해 주세요.', productId: null }
    }

    const now = new Date().toISOString()
    const product: Product = {
      ...form.product,
      brandId,
      updatedAt: now,
      createdAt: isNew ? now : form.product.createdAt,
    }
    saveProduct(product)
    setForm(buildInitialForm(product, listBrands()))
    setSaveMessage('저장되었습니다.')
    return { error: null, productId: product.id }
  }, [form, isNew])

  return {
    form,
    brands,
    isNew,
    saveMessage,
    patchForm,
    patchProduct,
    save,
    clearSaveMessage: () => setSaveMessage(null),
  }
}
