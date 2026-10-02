import type { Brand, Product, ProductListItem } from '../types/product'
import { createId } from './id'

const PRODUCTS_KEY = 'pc-detail-generator:products'
const BRANDS_KEY = 'pc-detail-generator:brands'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function listBrands(): Brand[] {
  return readJson<Brand[]>(BRANDS_KEY, [])
}

export function saveBrand(brand: Brand): void {
  const brands = listBrands()
  const idx = brands.findIndex((b) => b.id === brand.id)
  if (idx >= 0) brands[idx] = brand
  else brands.push(brand)
  writeJson(BRANDS_KEY, brands)
}

export function getBrand(id: string): Brand | undefined {
  return listBrands().find((b) => b.id === id)
}

export function listProducts(): Product[] {
  return readJson<Product[]>(PRODUCTS_KEY, [])
}

export function getProduct(id: string): Product | undefined {
  return listProducts().find((p) => p.id === id)
}

export function saveProduct(product: Product): void {
  const products = listProducts()
  const idx = products.findIndex((p) => p.id === product.id)
  if (idx >= 0) products[idx] = product
  else products.push(product)
  writeJson(PRODUCTS_KEY, products)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pc-products-updated'))
  }
}

export function deleteProduct(id: string): void {
  writeJson(
    PRODUCTS_KEY,
    listProducts().filter((p) => p.id !== id),
  )
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pc-products-updated'))
  }
}

export function toListItem(product: Product, brandName: string): ProductListItem {
  return {
    id: product.id,
    productName: product.productName,
    brandName,
    modelName: product.modelName,
    theme: product.theme,
    updatedAt: formatDate(product.updatedAt),
  }
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function createEmptyProduct(): Product {
  const now = new Date().toISOString()
  const id = createId('product')
  return {
    id,
    brandId: null,
    productName: '',
    modelName: '',
    shortDescription: '',
    longDescription: '',
    theme: 'clean',
    createdAt: now,
    updatedAt: now,
    images: [],
    features: [],
    specifications: [],
  }
}

export function createEmptyBrandDraft(): Omit<Brand, 'id'> {
  return {
    name: '',
    logoUrl: '',
    description: '',
    imageUrl: '',
  }
}

export function createEmptyFeature(productId: string, sortOrder: number) {
  return {
    id: createId('feature'),
    productId,
    title: '',
    description: '',
    imageUrl: '',
    imagePosition: 'left' as const,
    sortOrder,
  }
}

export function createEmptySpecification(productId: string, sortOrder: number) {
  return {
    id: createId('spec'),
    productId,
    label: '',
    value: '',
    sortOrder,
  }
}
