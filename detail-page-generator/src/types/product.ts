/** 상품 목록·편집에 사용할 타입 (STEP 2+에서 확장) */
export type DetailPageTheme = 'clean' | 'dark' | 'classic'

export type ProductListItem = {
  id: string
  productName: string
  brandName: string
  modelName: string
  theme: DetailPageTheme
  updatedAt: string
}
