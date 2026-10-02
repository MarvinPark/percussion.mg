import { Link } from 'react-router-dom'
import type { ProductListItem } from '../../types/product'

const THEME_LABEL: Record<ProductListItem['theme'], string> = {
  clean: 'Clean',
  dark: 'Dark',
  classic: 'Classic',
}

type ProductListTableProps = {
  items: ProductListItem[]
}

export function ProductListTable({ items }: ProductListTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-900">등록된 상품이 없습니다</p>
        <p className="mt-2 text-sm text-slate-500">
          「새 상품 만들기」로 첫 상품 상세페이지를 준비하세요. (STEP 2부터 입력·미리보기가
          연결됩니다.)
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">상품명</th>
            <th className="px-4 py-3">브랜드</th>
            <th className="px-4 py-3">모델명</th>
            <th className="px-4 py-3">테마</th>
            <th className="px-4 py-3">마지막 수정일</th>
            <th className="px-4 py-3 text-right">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
              <td className="px-4 py-3 text-slate-600">{item.brandName}</td>
              <td className="px-4 py-3 text-slate-600">{item.modelName}</td>
              <td className="px-4 py-3 text-slate-600">{THEME_LABEL[item.theme]}</td>
              <td className="px-4 py-3 text-slate-600">{item.updatedAt}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-2">
                  <Link
                    to={`/products/${item.id}/preview`}
                    className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    미리보기
                  </Link>
                  <Link
                    to={`/products/${item.id}/edit`}
                    className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                    disabled
                    title="STEP 9 Supabase 연동 후 활성화"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
