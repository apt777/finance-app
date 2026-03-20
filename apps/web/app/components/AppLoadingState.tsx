'use client'

import React from 'react'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'
import KablusMark from '@/components/KablusMark'

interface AppLoadingStateProps {
  label: string
  fullScreen?: boolean
}

export default function AppLoadingState({ label, fullScreen = false }: AppLoadingStateProps) {
  const { colorMode } = useColorMode()
  const { theme } = useUiTheme()
  const isDark = colorMode === 'dark'
  const isModern = theme === 'modern'
  const loadingLabel = label.includes('로딩') ? label : `${label} 로딩중...`

  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[320px]'} flex items-center justify-center px-5 py-10 md:px-8 md:py-12`}>
      <div
        className={`mx-auto w-full max-w-xl rounded-[36px] p-5 md:p-8 ${
          isModern
            ? isDark
              ? 'border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl'
              : 'border border-white/80 bg-white/70 shadow-[0_24px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl'
            : isDark
              ? 'border border-white/10 bg-slate-900/70 shadow-xl'
              : 'border border-slate-200 bg-white shadow-xl'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${
              isModern
                ? isDark
                  ? 'bg-white/10'
                  : 'bg-white/80 shadow-sm'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
            }`}
          >
            <KablusMark className="h-8 w-8" />
            <span className={`absolute inset-0 animate-ping rounded-2xl ${isDark ? 'bg-white/10' : 'bg-slate-900/10'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kablus</p>
            <p className={`mt-1 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{loadingLabel}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className={`h-3 rounded-full ${isDark ? 'bg-white/8' : 'bg-slate-200/80'}`}>
            <div
              className={`h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full ${
                isModern
                  ? isDark
                    ? 'bg-white/25'
                    : 'bg-slate-900/15'
                  : 'bg-blue-500/25'
              }`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`h-20 rounded-[24px] ${isDark ? 'bg-white/6' : 'bg-slate-100/90'}`} />
            <div className={`h-20 rounded-[24px] ${isDark ? 'bg-white/6' : 'bg-slate-100/90'}`} />
          </div>
          <div className={`h-28 rounded-[28px] ${isDark ? 'bg-white/6' : 'bg-slate-100/90'}`} />
        </div>
      </div>
    </div>
  )
}
