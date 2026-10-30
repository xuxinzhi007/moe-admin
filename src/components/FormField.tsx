import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}

export function FormField({ label, required, hint, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <span className="form-field-label">
        {label}
        {required ? <span className="form-field-required">*</span> : null}
      </span>
      {children}
      {hint ? <span className="form-field-hint">{hint}</span> : null}
    </div>
  )
}
