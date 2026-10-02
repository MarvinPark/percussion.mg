import { AdminHeader } from '../components/AdminHeader'
import { AdminLayout } from '../components/AdminLayout'
import { ProductListTable } from '../components/ProductListTable'

/** STEP 1: 로컬 더미 목록 (STEP 9에서 Supabase로 대체) */
const PLACEHOLDER_PRODUCTS: never[] = []

export function ProductListPage() {
  return (
    <AdminLayout>
      <AdminHeader />
      <ProductListTable items={PLACEHOLDER_PRODUCTS} />
    </AdminLayout>
  )
}
