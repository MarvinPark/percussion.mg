import type { Product, ProductFeature } from '../../../types/product'
import { createEmptyFeature } from '../../../lib/productStorage'
import { FormSection } from './FormSection'
import { FieldLabel } from './FieldLabel'
import { TextArea } from './TextArea'
import { TextInput } from './TextInput'
import { ImageUrlField } from './ImageUrlField'

type ProductFeaturesFormSectionProps = {
  product: Product
  onProductChange: (patch: Partial<Product>) => void
}

function updateFeature(
  features: ProductFeature[],
  id: string,
  patch: Partial<ProductFeature>,
): ProductFeature[] {
  return features.map((f) => (f.id === id ? { ...f, ...patch } : f))
}

export function ProductFeaturesFormSection({
  product,
  onProductChange,
}: ProductFeaturesFormSectionProps) {
  const sorted = [...product.features].sort((a, b) => a.sortOrder - b.sortOrder)

  const addFeature = () => {
    const next = createEmptyFeature(product.id, product.features.length)
    onProductChange({ features: [...product.features, next] })
  }

  const removeFeature = (id: string) => {
    onProductChange({
      features: product.features.filter((f) => f.id !== id),
    })
  }

  return (
    <FormSection
      title="제품 특징"
      description="「+ 특징 추가」로 항목을 늘릴 수 있습니다."
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">아직 등록된 특징이 없습니다.</p>
      ) : null}

      <div className="space-y-6">
        {sorted.map((feature, index) => (
          <div
            key={feature.id}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                특징 {String(index + 1).padStart(2, '0')}
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeFeature(feature.id)}
              >
                삭제
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel>제목</FieldLabel>
                <TextInput
                  value={feature.title}
                  onChange={(e) =>
                    onProductChange({
                      features: updateFeature(product.features, feature.id, {
                        title: e.target.value,
                      }),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>설명</FieldLabel>
                <TextArea
                  rows={3}
                  value={feature.description}
                  onChange={(e) =>
                    onProductChange({
                      features: updateFeature(product.features, feature.id, {
                        description: e.target.value,
                      }),
                    })
                  }
                />
              </div>
              <ImageUrlField
                id={`feature-img-${feature.id}`}
                label="이미지"
                value={feature.imageUrl}
                onChange={(imageUrl) =>
                  onProductChange({
                    features: updateFeature(product.features, feature.id, { imageUrl }),
                  })
                }
              />
              <div>
                <FieldLabel>이미지 위치</FieldLabel>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={feature.imagePosition === 'left'}
                      onChange={() =>
                        onProductChange({
                          features: updateFeature(product.features, feature.id, {
                            imagePosition: 'left',
                          }),
                        })
                      }
                    />
                    좌
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={feature.imagePosition === 'right'}
                      onChange={() =>
                        onProductChange({
                          features: updateFeature(product.features, feature.id, {
                            imagePosition: 'right',
                          }),
                        })
                      }
                    />
                    우
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addFeature}
        className="inline-flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      >
        + 특징 추가
      </button>
    </FormSection>
  )
}
