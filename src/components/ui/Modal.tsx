'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Optional footer (action buttons). Rendered in a separated row. */
  footer?: ReactNode
  className?: string
}

/**
 * Lightweight, dependency-free modal rendered into a portal at document.body.
 * Handles: overlay click to close, Escape to close, body scroll lock, and
 * aria-modal/focus semantics. Kept minimal on purpose — no animation lib.
 */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        // Close only when the backdrop itself is clicked, not the panel.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900',
          className,
        )}
      >
        {title && (
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        )}
        <div className="text-gray-700 dark:text-gray-200">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

Modal.displayName = 'Modal'

export default Modal
