import { Link } from 'react-router-dom'
import { AdminHeader } from '../components/AdminHeader'
import { AdminLayout } from '../components/AdminLayout'

export function ProductNewPlaceholderPage() {
  return (
    <AdminLayout>
      <AdminHeader showCreateButton={false} title="새 상품 만들기" />
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-600">
          상품 입력 폼과 실시간 미리보기는 <strong>STEP 2~3</strong>에서 구현합니다.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          ← 상품 목록으로
        </Link>
      </div>
    </AdminLayout>
  )
}
