import { useRef } from 'react'
import { FieldLabel } from './FieldLabel'
import { TextInput } from './TextInput'

type ImageUrlFieldProps = {
  id: string
  label: string
  value: string
  onChange: (url: string) => void
  hint?: string
}

/** STEP 6에서 Supabase 업로드 컴포넌트로 교체 예정. 현재는 URL + 로컬 파일(Object URL) */
export function ImageUrlField({ id, label, value, onChange, hint }: ImageUrlFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (file: File | undefined) => {
    if (!file) return
    onChange(URL.createObjectURL(file))
  }

  return (
    <div>
      <FieldLabel htmlFor={id} hint={hint}>
        {label}
      </FieldLabel>
      <TextInput
        id={id}
        type="url"
        placeholder="https://..."
        value={value.startsWith('blob:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => fileRef.current?.click()}
        >
          파일 선택 (로컬 미리보기용)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {value ? (
          <img src={value} alt="" className="h-12 w-12 rounded border object-cover" />
        ) : null}
      </div>
    </div>
  )
}
