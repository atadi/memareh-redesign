'use client'

import { useState } from 'react'
import { Phone, X, AlertTriangle } from 'lucide-react'

export function EmergencyBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-red-600 text-white relative">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span className="font-medium">خدمات اضطراری ۲۴ ساعته</span>
            <span className="hidden md:inline">- رفع قطعی برق در کمتر از ۱ ساعت</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="tel:02112345678" 
              className="flex items-center gap-2 bg-white text-red-600 px-4 py-1.5 rounded-full hover:bg-red-50 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="font-bold">۰۲۱-۱۲۳۴۵۶۷۸</span>
            </a>
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-red-700 rounded transition-colors"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}