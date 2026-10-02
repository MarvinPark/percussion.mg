type FieldLabelProps = {
  htmlFor?: string
  children: React.ReactNode
  hint?: string
}

export function FieldLabel({ htmlFor, children, hint }: FieldLabelProps) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {children}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
