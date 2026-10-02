/** 상세페이지 테마 (STEP 5에서 렌더에 반영) */
export type DetailPageTheme = 'clean' | 'dark' | 'classic'

export type ImagePosition = 'left' | 'right'

/** Supabase `brands` 테이블 대응 (STEP 9) */
export type Brand = {
  id: string
  name: string
  logoUrl: string
  description: string
  imageUrl: string
}

/** Supabase `company_profile` — 코드/설정에서 관리 (STEP 4) */
export type CompanyProfile = {
  companyName: string
  description: string
  logoUrl: string
}

export type ProductImage = {
  id: string
  productId: string
  imageUrl: string
  sortOrder: number
  isMain: boolean
}

export type ProductFeature = {
  id: string
  productId: string
  title: string
  description: string
  imageUrl: string
  imagePosition: ImagePosition
  sortOrder: number
}

export type ProductSpecification = {
  id: string
  productId: string
  label: string
  value: string
  sortOrder: number
}

/** Supabase `products` + 관계 데이터 (편집·미리보기 공통) */
export type Product = {
  id: string
  brandId: string | null
  productName: string
  modelName: string
  shortDescription: string
  longDescription: string
  theme: DetailPageTheme
  createdAt: string
  updatedAt: string
  images: ProductImage[]
  features: ProductFeature[]
  specifications: ProductSpecification[]
}

export type ProductListItem = {
  id: string
  productName: string
  brandName: string
  modelName: string
  theme: DetailPageTheme
  updatedAt: string
}

/** 편집 폼: 브랜드는 선택 또는 신규 입력 */
export type ProductFormValues = {
  product: Product
  brandMode: 'existing' | 'new'
  selectedBrandId: string | null
  brandDraft: Omit<Brand, 'id'>
}

export const THEME_OPTIONS: { value: DetailPageTheme; label: string }[] = [
  { value: 'clean', label: 'Theme 01 — Clean' },
  { value: 'dark', label: 'Theme 02 — Dark' },
  { value: 'classic', label: 'Theme 03 — Classic' },
]
