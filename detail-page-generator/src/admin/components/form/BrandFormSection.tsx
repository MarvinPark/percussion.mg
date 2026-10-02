import type { Brand, ProductFormValues } from '../../../types/product'
import { FormSection } from './FormSection'
import { FieldLabel } from './FieldLabel'
import { TextArea } from './TextArea'
import { TextInput } from './TextInput'
import { ImageUrlField } from './ImageUrlField'

type BrandFormSectionProps = {
  brands: Brand[]
  values: ProductFormValues
  onChange: (patch: Partial<ProductFormValues>) => void
}

export function BrandFormSection({ brands, values, onChange }: BrandFormSectionProps) {
  const { brandMode, selectedBrandId, brandDraft } = values

  return (
    <FormSection
      title="브랜드"
      description="브랜드는 저장해 두었다가 다른 상품에서 재사용할 수 있습니다. (STEP 9 Supabase 연동)"
    >
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="brandMode"
            checked={brandMode === 'existing'}
            onChange={() => onChange({ brandMode: 'existing' })}
          />
          저장된 브랜드 선택
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="brandMode"
            checked={brandMode === 'new'}
            onChange={() => onChange({ brandMode: 'new' })}
          />
          새 브랜드 입력
        </label>
      </div>

      {brandMode === 'existing' ? (
        <div>
          <FieldLabel htmlFor="brand-select">브랜드</FieldLabel>
          <select
            id="brand-select"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedBrandId ?? ''}
            onChange={(e) =>
              onChange({ selectedBrandId: e.target.value || null })
            }
          >
            <option value="">브랜드를 선택하세요</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || '(이름 없음)'}
              </option>
            ))}
          </select>
          {brands.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              저장된 브랜드가 없습니다. 「새 브랜드 입력」을 사용하세요.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div>
            <FieldLabel htmlFor="brand-name">브랜드명</FieldLabel>
            <TextInput
              id="brand-name"
              value={brandDraft.name}
              onChange={(e) =>
                onChange({ brandDraft: { ...brandDraft, name: e.target.value } })
              }
            />
          </div>
          <ImageUrlField
            id="brand-logo"
            label="브랜드 로고"
            value={brandDraft.logoUrl}
            onChange={(logoUrl) => onChange({ brandDraft: { ...brandDraft, logoUrl } })}
          />
          <div>
            <FieldLabel htmlFor="brand-desc">브랜드 소개</FieldLabel>
            <TextArea
              id="brand-desc"
              value={brandDraft.description}
              onChange={(e) =>
                onChange({ brandDraft: { ...brandDraft, description: e.target.value } })
              }
            />
          </div>
          <ImageUrlField
            id="brand-image"
            label="브랜드 대표 이미지"
            value={brandDraft.imageUrl}
            onChange={(imageUrl) => onChange({ brandDraft: { ...brandDraft, imageUrl } })}
          />
        </>
      )}
    </FormSection>
  )
}
