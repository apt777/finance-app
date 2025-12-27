'use client'

import React, { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

interface Language {
  code: string
  name: string
  flag: string
}

const LanguageSwitcher = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('ko')
  const [isOpen, setIsOpen] = useState(false)

  const languages: Language[] = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ]

  // 초기 언어 로드
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'ko'
    setCurrentLanguage(savedLanguage)
    document.documentElement.lang = savedLanguage
  }, [])

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode)
    localStorage.setItem('language', languageCode)
    document.documentElement.lang = languageCode
    
    // 페이지 새로고침 (i18n 라이브러리가 언어 변경을 감지하도록)
    window.location.reload()
  }

  const currentLanguageName = languages.find(lang => lang.code === currentLanguage)

  return (
    <div className="relative">
      {/* Language Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
        title="언어 변경"
      >
        <Globe className="w-5 h-5" />
        <span className="text-lg">{currentLanguageName?.flag}</span>
        <span className="hidden sm:inline text-sm font-medium">{currentLanguageName?.name}</span>
      </button>

      {/* Language Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          <div className="p-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  handleLanguageChange(language.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  currentLanguage === language.code
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl">{language.flag}</span>
                <div className="text-left">
                  <p className="font-medium">{language.name}</p>
                  <p className="text-xs text-slate-500">{language.code.toUpperCase()}</p>
                </div>
                {currentLanguage === language.code && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
