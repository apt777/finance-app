'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProviderClient'
import { Mail, Lock, Eye, EyeOff, Wallet, ArrowRight, CheckCircle } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const { user, signUp } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[^a-zA-Z\d]/.test(pwd)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthLabels = ['매우 약함', '약함', '보통', '강함', '매우 강함']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsLoading(true)

    if (password !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setErrorMessage('비밀번호는 최소 8자 이상이어야 합니다.')
      setIsLoading(false)
      return
    }

    const { error } = await signUp(email, password)

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    } else {
      setSuccessMessage('회원가입이 완료되었습니다! 이메일을 확인해 주세요.')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      {/* Register Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">KABLUS</h1>
            <p className="text-slate-500 text-sm">계정 생성</p>
          </div>

          {/* Form Section */}
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Email Input */}
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-2">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">비밀번호 강도</span>
                    <span className="text-xs font-medium text-slate-700">
                      {strengthLabels[passwordStrength - 1] || '입력 중'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || 'bg-gray-300'}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">최소 8자, 대문자, 숫자, 특수문자 포함 권장</p>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                비밀번호 확인
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2 flex items-center space-x-2">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">비밀번호가 일치합니다</span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-red-500"></div>
                      <span className="text-xs text-red-500">비밀번호가 일치하지 않습니다</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                <p className="font-medium">회원가입 실패</p>
                <p className="text-xs mt-1">{errorMessage}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-600 text-sm">
                <p className="font-medium">성공!</p>
                <p className="text-xs mt-1">{successMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>가입 중...</span>
                </>
              ) : (
                <>
                  <span>회원가입</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">또는</span>
            </div>
          </div>

          {/* Links Section */}
          <div className="text-center">
            <p className="text-slate-600 text-sm">
              이미 계정이 있으신가요?{' '}
              <Link 
                href="/login" 
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-400 text-xs">
          <p>KABLUS © 2024 · 개인 자산 관리</p>
        </div>
      </div>
    </div>
  )
}
