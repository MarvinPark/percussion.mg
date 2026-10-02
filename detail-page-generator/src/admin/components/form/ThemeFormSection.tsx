import type { DetailPageTheme } from '../../../types/product'
import { THEME_OPTIONS } from '../../../types/product'
import { FormSection } from './FormSection'
import { FieldLabel } from './FieldLabel'

type ThemeFormSectionProps = {
  theme: DetailPageTheme
  onChange: (theme: DetailPageTheme) => void
}

export function ThemeFormSection({ theme, onChange }: ThemeFormSectionProps) {
  return (
    <FormSection
      title="테마 선택"
      description="STEP 5에서 상세페이지 디자인에 반영됩니다. 지금은 값만 저장합니다."
    >
      <FieldLabel htmlFor="theme-select">테마</FieldLabel>
      <select
        id="theme-select"
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={theme}
        onChange={(e) => onChange(e.target.value as DetailPageTheme)}
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormSection>
  )
}
