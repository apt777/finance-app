'use client'

import React from 'react'
import { Wallet } from 'lucide-react'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'

interface AppLoadingStateProps {
  label: string
  fullScreen?: boolean
}

export default function AppLoadingState({ label, fullScreen = false }: AppLoadingStateProps) {
  const { colorMode } = useColorMode()
  const { theme } = useUiTheme()
  const isDark = colorMode === 'dark'
  const isModern = theme === 'modern'

  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'min-h-[320px]'} flex items-center justify-center px-4 py-8`}>
      <div
        className={`w-full max-w-xl rounded-[36px] p-6 md:p-8 ${
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
                  ? 'bg-white/10 text-white'
                  : 'bg-slate-900 text-white'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
            }`}
          >
            <Wallet className="h-6 w-6" />
            <span className="absolute inset-0 animate-ping rounded-2xl bg-current opacity-10" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kablus</p>
            <p className={`mt-1 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{label}</p>
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
