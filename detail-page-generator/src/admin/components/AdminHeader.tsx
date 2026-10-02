import { Link } from 'react-router-dom'

type AdminHeaderProps = {
  title?: string
  showCreateButton?: boolean
}

export function AdminHeader({
  title = '퍼커션센터 상세페이지 생성기',
  showCreateButton = true,
}: AdminHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          관리자
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
      </div>
      {showCreateButton ? (
        <Link
          to="/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          새 상품 만들기
        </Link>
      ) : null}
    </header>
  )
}
