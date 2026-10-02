import { AdminHeader } from '../components/AdminHeader'
import { AdminLayout } from '../components/AdminLayout'
import { ProductListTable } from '../components/ProductListTable'
import { useProductList } from '../hooks/useProductList'

export function ProductListPage() {
  const { items, remove } = useProductList()

  return (
    <AdminLayout>
      <AdminHeader />
      <ProductListTable items={items} onDelete={remove} />
    </AdminLayout>
  )
}
