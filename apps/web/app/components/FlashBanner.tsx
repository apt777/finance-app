'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface FlashBannerProps {
  message: string
  onDone?: () => void
}

export default function FlashBanner({ message, onDone }: FlashBannerProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setVisible(false), 3000)
    const cleanupTimer = window.setTimeout(() => onDone?.(), 3400)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(cleanupTimer)
    }
  }, [onDone])

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      </div>
    </div>
  )
}
