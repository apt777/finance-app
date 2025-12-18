'use client'

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ExchangeRateFormData {
  from: string;
  to: string;
  rate: number | string;
}

const createExchangeRate = async (rateData: ExchangeRateFormData) => {
  const res = await fetch('/api/exchange-rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...rateData,
      rate: Number(rateData.rate),
    }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '환율 생성 실패');
  }
  return res.json();
};

const ExchangeRateForm = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ExchangeRateFormData>({
    from: 'KRW',
    to: 'JPY',
    rate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation<any, Error, ExchangeRateFormData>({
    mutationFn: createExchangeRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setFormData({ from: 'KRW', to: 'JPY', rate: '' }); // Clear form
      setFormError(null);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.from || !formData.to || !formData.rate) {
      setFormError('모든 필드를 입력해 주세요.');
      return;
    }
    if (isNaN(Number(formData.rate)) || Number(formData.rate) <= 0) {
      setFormError('환율은 0보다 큰 숫자여야 합니다.');
      return;
    }
    if (formData.from === formData.to) {
      setFormError('시작 통화와 대상 통화는 같을 수 없습니다.');
      return;
    }

    mutation.mutate(formData);
  };

  const currencies = ['KRW', 'JPY', 'USD'];

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2 text-black">새 환율 추가</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="from" className="block text-sm font-medium text-gray-700">시작 통화</label>
          <select
            name="from"
            id="from"
            value={formData.from}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            {currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-700">대상 통화</label>
          <select
            name="to"
            id="to"
            value={formData.to}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            {currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rate" className="block text-sm font-medium text-gray-700">환율</label>
          <input
            type="number"
            name="rate"
            id="rate"
            value={formData.rate}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            step="0.0001" // Allow decimal rates
            required
          />
        </div>
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? '추가 중...' : '환율 추가'}
        </button>
        {mutation.isError && <p className="text-red-500">오류: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">환율이 성공적으로 추가되었습니다!</p>}
      </form>
    </div>
  );
};

export default ExchangeRateForm;
