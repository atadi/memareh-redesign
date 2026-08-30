import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error message; when present the field renders in the danger state and the
   *  message is wired to the input via aria-describedby for screen readers. */
  error?: string
  label?: string
  /** Optional helper text shown beneath the field when there is no error. */
  hint?: string
}

/**
 * Shared text input primitive with built-in error/label support and ARIA
 * wiring. Forwards refs so it works inside forms and controlled components.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name ?? undefined
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            error
              ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-300'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
