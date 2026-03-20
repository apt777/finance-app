'use client'

import React, { useState, useTransition } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/navigation'

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
]

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
      setIsOpen(false)
    })
  }

  const currentLanguage = languages.find((lang) => lang.code === locale) ?? languages[0]!;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center space-x-2 rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-md"
        title="언어 변경"
      >
        <Globe className="w-5 h-5 text-slate-500" />
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden md:inline text-sm font-medium">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl">
            <div className="p-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={isPending}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                    locale === language.code
                      ? 'bg-slate-100 text-slate-950'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                  </div>
                  {locale === language.code && (
                    <Check className="w-4 h-4 text-slate-900" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
