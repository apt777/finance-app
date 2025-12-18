'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// userId is no longer needed from the form
interface AccountFormData {
  name: string;
  type: string;
  balance: number | string;
  currency: string;
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
    throw new Error(errorData.error || 'Failed to create account');
  }
  return res.json()
}

interface AccountFormProps {
  onAccountAdded?: () => void;
}

const AccountForm = ({ onAccountAdded }: AccountFormProps) => {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'KRW',
  })

  const mutation = useMutation<any, Error, AccountFormData>({ // Explicitly type mutation
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ name: '', type: 'checking', balance: '', currency: 'KRW' }) // Clear form
      onAccountAdded?.(); // Call the callback
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    if (!formData.name || !formData.type || !formData.balance || !formData.currency) {
      setFormError('모든 필드를 입력해 주세요.');
      return
    }
    if (isNaN(Number(formData.balance))) {
      setFormError('잔액은 숫자여야 합니다.');
      return;
    }
    mutation.mutate(formData)
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2 text-black">새 계좌 추가</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID input is removed */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">계좌 이름</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">계좌 종류</label>
          <select
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            <option value="checking">입출금</option>
            <option value="savings">예적금</option>
            <option value="credit_card">신용카드</option>
            <option value="investment">투자</option>
          </select>
        </div>
        <div>
          <label htmlFor="balance" className="block text-sm font-medium text-gray-700">잔액</label>
          <input
            type="number"
            name="balance"
            id="balance"
            value={formData.balance}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">통화</label>
          <select
            name="currency"
            id="currency"
            value={formData.currency}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            <option value="KRW">KRW</option>
            <option value="JPY">JPY</option>
            <option value="USD">USD</option>
          </select>
        </div>
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? '추가 중...' : '계좌 추가'}
        </button>
        {mutation.isError && <p className="text-red-500">오류: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">계좌가 성공적으로 추가되었습니다!</p>}
      </form>
    </div>
  )
}

export default AccountForm
