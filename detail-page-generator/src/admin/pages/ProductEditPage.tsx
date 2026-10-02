import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProductEditor } from '../hooks/useProductEditor'
import { AdminHeader } from '../components/AdminHeader'
import { AdminLayout } from '../components/AdminLayout'
import { BrandFormSection } from '../components/form/BrandFormSection'
import { ProductInfoFormSection } from '../components/form/ProductInfoFormSection'
import { ProductFeaturesFormSection } from '../components/form/ProductFeaturesFormSection'
import { SpecificationsFormSection } from '../components/form/SpecificationsFormSection'
import { ThemeFormSection } from '../components/form/ThemeFormSection'
import { PreviewPlaceholder } from '../components/form/PreviewPlaceholder'

export function ProductEditPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { form, brands, isNew, saveMessage, patchForm, patchProduct, save, clearSaveMessage } =
    useProductEditor(productId)

  useEffect(() => {
    if (!saveMessage) return
    const t = window.setTimeout(clearSaveMessage, 3000)
    return () => window.clearTimeout(t)
  }, [saveMessage, clearSaveMessage])

  const onSave = () => {
    const { error, productId } = save()
    if (error) {
      window.alert(error)
      return
    }
    if (isNew && productId) {
      navigate(`/products/${productId}/edit`, { replace: true })
    }
  }

  const title = isNew ? '새 상품 만들기' : '상품 수정'

  return (
    <AdminLayout>
      <AdminHeader showCreateButton={false} title={title} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← 상품 목록
        </Link>
        <div className="flex items-center gap-3">
          {saveMessage ? (
            <span className="text-sm text-emerald-600">{saveMessage}</span>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            저장
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <BrandFormSection brands={brands} values={form} onChange={patchForm} />
          <ProductInfoFormSection product={form.product} onProductChange={patchProduct} />
          <ProductFeaturesFormSection product={form.product} onProductChange={patchProduct} />
          <SpecificationsFormSection product={form.product} onProductChange={patchProduct} />
          <ThemeFormSection
            theme={form.product.theme}
            onChange={(theme) => patchProduct({ theme })}
          />
        </div>

        <div className="lg:sticky lg:top-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            미리보기 (STEP 3)
          </p>
          <PreviewPlaceholder />
        </div>
      </div>
    </AdminLayout>
  )
}
