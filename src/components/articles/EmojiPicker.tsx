'use client'

import { useState, useEffect, useRef } from 'react'
import { Smile } from 'lucide-react'

const EMOJIS = [
  '👍', '❤️', '👏', '🙏', '💡', '🔧', '⚡', '✅', '🎉', '🙂',
  '😊', '🙌', '👌', '💪', '🤝', '🌟', '🚀', '✨', '📝', '📌',
  '📅', '⏰', '📞', '🙋', '🙇', '🤔', '👀', '🔥', '⭐', '🛠️',
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={false}
        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
        title="افزودن ایموجی"
      >
        <Smile className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-xl shadow-xl p-2 grid grid-cols-6 gap-1 z-50 w-64">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji)
                setOpen(false)
              }}
              className="text-xl p-1 hover:bg-gray-100 rounded-lg transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
