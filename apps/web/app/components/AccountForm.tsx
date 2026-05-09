'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/navigation'
import { useCategories } from '@/hooks/useCategories'

// userId is no longer needed from the form
interface AccountFormData {
  name: string;
  type: string;
  balance: number | string;
  currency: string;
  transitInferenceEnabled?: boolean;
  transitInferenceCategoryKey?: string;
}

const createAccount = async (accountData: Omit<AccountFormData, 'userId'>) => {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...accountData,
      balance: Number(accountData.balance),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error');
  }
  return res.json()
}

const updateAccount = async (accountId: string, accountData: Omit<AccountFormData, 'userId'>) => {
  const res = await fetch(`/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...accountData,
      balance: Number(accountData.balance),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Error')
  }
  return res.json()
}

interface AccountFormProps {
  onAccountAdded?: () => void;
  initialData?: Partial<AccountFormData> & { id?: string }
}

const AccountForm = ({ onAccountAdded, initialData }: AccountFormProps) => {
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const tValidation = useTranslations('validation')
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: categories = [] } = useCategories()
  const isEditMode = Boolean(initialData?.id)
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'checking',
    balance: initialData?.balance ?? '',
    currency: initialData?.currency || 'JPY',
    transitInferenceEnabled: initialData?.transitInferenceEnabled ?? false,
    transitInferenceCategoryKey: initialData?.transitInferenceCategoryKey || 'transportation',
  })

  const mutation = useMutation<any, Error, AccountFormData>({ // Explicitly type mutation
    mutationFn: (nextData) => (isEditMode && initialData?.id ? updateAccount(initialData.id, nextData) : createAccount(nextData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      if (!isEditMode) {
        setFormData({
          name: '',
          type: 'checking',
          balance: '',
          currency: 'JPY',
          transitInferenceEnabled: false,
          transitInferenceCategoryKey: 'transportation',
        })
      }
      setFormError(null)
      onAccountAdded?.();
      if (isEditMode) {
        router.push('/accounts?flash=account-updated')
      }
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData({ ...formData, [name]: checked })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    if (!formData.name || !formData.type || !formData.balance || !formData.currency) {
      setFormError(tValidation('allFieldsRequired'));
      return
    }
    if (isNaN(Number(formData.balance))) {
      setFormError(tValidation('amountMustBeNumber'));
      return;
    }
    mutation.mutate(formData)
  }

  const accountTypes = [
    { value: 'checking', label: tAccounts('checking') },
    { value: 'savings', label: tAccounts('savings') },
    { value: 'credit_card', label: tAccounts('creditCard') },
    { value: 'investment', label: tAccounts('investment') },
    { value: 'nisa', label: tAccounts('nisa') },
    { value: 'transit_card', label: tAccounts('transitCard') },
  ]

  const currencies = [
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'KRW', label: 'KRW (₩)' },
    { value: 'USD', label: 'USD ($)' },
  ]
  const isCreditCard = formData.type === 'credit_card'
  const isTransitCard = formData.type === 'transit_card'
  const transitExpenseCategories = categories.filter((category) => category.type === 'expense')
  const accountTypeHint =
    locale === 'en'
      ? ({
          checking: 'Use this for your main spending and income account.',
          savings: 'Use this for savings, fixed deposits, and money you set aside.',
          credit_card: 'Tracks billed card balances that still need to be paid.',
          investment: 'Use this for brokerage or general investment accounts.',
          nisa: 'Use this for Japan NISA accounts and tax-free investment balances.',
          transit_card: 'Use this for prepaid transit or stored-value cards such as Suica.',
        } as Record<string, string>)[formData.type]
      : locale === 'ja'
        ? ({
            checking: '普段の入出金を管理するメイン口座向けです。',
            savings: '貯蓄、定期預金、目的別の積立に向いています。',
            credit_card: 'すでに請求され、これから支払う予定の金額を管理します。',
            investment: '証券口座や一般的な投資用口座に使います。',
            nisa: '日本のNISA口座や非課税投資残高の管理に使います。',
            transit_card: 'Suica などの交通系ICやチャージ式残高の管理に使います。',
          } as Record<string, string>)[formData.type]
        : locale === 'zh'
          ? ({
              checking: '适合记录日常收支的主账户。',
              savings: '适合储蓄、定存和专门留存的资金。',
              credit_card: '用于管理已经出账、等待偿还的信用卡金额。',
              investment: '适合证券账户和一般投资账户。',
              nisa: '适合日本 NISA 账户和免税投资余额。',
              transit_card: '适合 Suica 等交通卡或其他储值型余额账户。',
            } as Record<string, string>)[formData.type]
          : ({
              checking: '일상 입출금과 생활비를 관리하는 메인 계좌에 적합합니다.',
              savings: '저축, 예적금, 따로 모아두는 자금을 관리할 때 적합합니다.',
              credit_card: '이미 청구되어 앞으로 갚아야 할 신용카드 금액을 관리합니다.',
              investment: '증권 계좌나 일반 투자용 계좌에 사용합니다.',
              nisa: '일본 NISA 계좌와 비과세 투자 잔액을 관리할 때 사용합니다.',
              transit_card: '스이카 같은 교통카드나 충전식 잔액 계좌에 사용합니다.',
            } as Record<string, string>)[formData.type]
  const transitInferenceCopy =
    locale === 'en'
      ? {
          toggle: 'Auto-categorize remaining card usage',
          desc: 'Calculate top-ups minus recorded card spending minus the current balance, then add the remainder to the selected expense category in analysis.',
          category: 'Category for inferred spending',
        }
      : locale === 'ja'
        ? {
            toggle: '残りの利用額を自動分類する',
            desc: 'チャージ額から記録済みの利用額と現在残高を引いた残りを、分析で選択した支出カテゴリへ自動で加えます。',
            category: '推定利用額のカテゴリ',
          }
        : locale === 'zh'
          ? {
              toggle: '自动归类剩余使用金额',
              desc: '用充值金额减去已记录的卡内消费和当前余额后，把剩余金额自动加入分析中的所选支出分类。',
              category: '推定支出的分类',
            }
          : {
              toggle: '남는 사용 금액 자동 분류',
              desc: '충전액에서 기록된 카드 사용액과 현재 잔액을 뺀 나머지를, 분석에서 선택한 지출 카테고리에 자동으로 합산합니다.',
              category: '추정 사용분 카테고리',
            }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-sm border border-slate-100 p-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-white">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isEditMode ? tCommon('edit') : tAccounts('addNewAccount')}</h2>
          <p className="text-sm text-slate-600">{isEditMode ? tAccounts('editAccountDesc') : tAccounts('addAccountDesc')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-2">
            {tAccounts('accountName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={tAccounts('accountNamePlaceholder')}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
            required
          />
        </div>

        {/* Account Type & Currency Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-semibold text-slate-800 mb-2">
              {tAccounts('accountType')} <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              id="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
              required
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            {accountTypeHint ? (
              <p className="mt-2 text-xs text-slate-500">{accountTypeHint}</p>
            ) : null}
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-semibold text-slate-800 mb-2">
              {tAccounts('currency')} <span className="text-red-500">*</span>
            </label>
            <select
              name="currency"
              id="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
              required
            >
              {currencies.map(curr => (
                <option key={curr.value} value={curr.value}>{curr.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Balance */}
        <div>
          <label htmlFor="balance" className="block text-sm font-semibold text-slate-800 mb-2">
            {isCreditCard ? tAccounts('paymentDueAmount') : isTransitCard ? tAccounts('balance') : tAccounts('initialBalance')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              name="balance"
              id="balance"
              value={formData.balance}
              onChange={handleChange}
              placeholder="0"
              step="1"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              required
            />
            <span className="absolute right-4 top-3 text-slate-600 font-medium">
              {formData.currency}
            </span>
          </div>
          {isCreditCard ? (
            <p className="mt-2 text-xs text-slate-500">{tAccounts('paymentDueAmountDesc')}</p>
          ) : isTransitCard ? (
            <p className="mt-2 text-xs text-slate-500">{tAccounts('transitCardBalanceDesc')}</p>
          ) : null}
        </div>

        {isTransitCard ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="transitInferenceEnabled"
                checked={Boolean(formData.transitInferenceEnabled)}
                onChange={handleCheckboxChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">{transitInferenceCopy.toggle}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{transitInferenceCopy.desc}</p>
              </div>
            </label>

            <div className="mt-4">
              <label htmlFor="transitInferenceCategoryKey" className="block text-sm font-semibold text-slate-800 mb-2">
                {transitInferenceCopy.category}
              </label>
              <select
                name="transitInferenceCategoryKey"
                id="transitInferenceCategoryKey"
                value={formData.transitInferenceCategoryKey}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
                disabled={!formData.transitInferenceEnabled}
              >
                {transitExpenseCategories.map((category) => (
                  <option key={category.id} value={category.key}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {/* Error Message */}
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{formError}</p>
          </div>
        )}

        {/* Success Message */}
        {mutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{isEditMode ? tAccounts('accountUpdated') : tAccounts('accountAdded')}</p>
          </div>
        )}

        {/* Error from API */}
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{tCommon('error')}: {mutation.error.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {mutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{tCommon('loading')}</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>{isEditMode ? tCommon('save') : tAccounts('addNewAccount')}</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default AccountForm
