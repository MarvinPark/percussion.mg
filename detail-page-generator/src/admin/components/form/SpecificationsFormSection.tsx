import type { Product, ProductSpecification } from '../../../types/product'
import { createEmptySpecification } from '../../../lib/productStorage'
import { FormSection } from './FormSection'
import { TextInput } from './TextInput'

type SpecificationsFormSectionProps = {
  product: Product
  onProductChange: (patch: Partial<Product>) => void
}

function updateSpec(
  specs: ProductSpecification[],
  id: string,
  patch: Partial<ProductSpecification>,
): ProductSpecification[] {
  return specs.map((s) => (s.id === id ? { ...s, ...patch } : s))
}

export function SpecificationsFormSection({
  product,
  onProductChange,
}: SpecificationsFormSectionProps) {
  const sorted = [...product.specifications].sort((a, b) => a.sortOrder - b.sortOrder)

  const addRow = () => {
    const row = createEmptySpecification(product.id, product.specifications.length)
    onProductChange({ specifications: [...product.specifications, row] })
  }

  const removeRow = (id: string) => {
    onProductChange({
      specifications: product.specifications.filter((s) => s.id !== id),
    })
  }

  return (
    <FormSection title="제품 제원" description="표 형태로 쇼핑몰 상세페이지에 표시됩니다.">
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">제원 항목을 추가하세요.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500">
            <span>항목</span>
            <span>값</span>
            <span className="w-12" />
          </div>
          {sorted.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <TextInput
                placeholder="예: 크기"
                value={row.label}
                onChange={(e) =>
                  onProductChange({
                    specifications: updateSpec(product.specifications, row.id, {
                      label: e.target.value,
                    }),
                  })
                }
              />
              <TextInput
                placeholder="예: 260 × 150 × 100 mm"
                value={row.value}
                onChange={(e) =>
                  onProductChange({
                    specifications: updateSpec(product.specifications, row.id, {
                      value: e.target.value,
                    }),
                  })
                }
              />
              <button
                type="button"
                className="rounded-md px-2 text-sm text-red-600 hover:bg-red-50"
                onClick={() => removeRow(row.id)}
                aria-label="항목 삭제"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        + 제원 항목 추가
      </button>
    </FormSection>
  )
}
