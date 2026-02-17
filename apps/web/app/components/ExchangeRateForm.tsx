'use client'

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';

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

  const handleSwapCurrencies = () => {
    setFormData({ ...formData, from: formData.to, to: formData.from });
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

  const currencies = [
    { value: 'KRW', label: '한국 원 (₩)' },
    { value: 'JPY', label: '일본 엔 (¥)' },
    { value: 'USD', label: '미국 달러 ($)' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-sm border border-slate-100 p-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">새 환율 추가</h2>
          <p className="text-sm text-slate-600">복수 통화 간의 환율을 설정하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency Selection */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 mb-4">환율 설정</label>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* From Currency */}
            <div className="flex-1">
              <label htmlFor="from" className="block text-xs font-semibold text-slate-600 mb-2 uppercase">
                출발 통화
              </label>
              <select
                name="from"
                id="from"
                value={formData.from}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white text-slate-900 font-medium"
                required
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex-shrink-0 mt-6 md:mt-0">
              <button
                type="button"
                onClick={handleSwapCurrencies}
                className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                title="통화 교환"
              >
                <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
              </button>
            </div>

            {/* To Currency */}
            <div className="flex-1">
              <label htmlFor="to" className="block text-xs font-semibold text-slate-600 mb-2 uppercase">
                대상 통화
              </label>
              <select
                name="to"
                id="to"
                value={formData.to}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white text-slate-900 font-medium"
                required
              >
                {currencies.map(currency => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Exchange Rate Input */}
        <div>
          <label htmlFor="rate" className="block text-sm font-semibold text-slate-800 mb-2">
            환율 (1 {formData.from} = ? {formData.to}) *
          </label>
          <div className="relative">
            <input
              type="number"
              name="rate"
              id="rate"
              value={formData.rate}
              onChange={handleChange}
              placeholder="0.0000"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              step="0.0001"
              required
            />
            <span className="absolute right-4 top-3 text-slate-600 font-medium text-sm">
              {formData.to}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            예: 1 {formData.from}가 {formData.to}로 얼마인지 입력하세요
          </p>
        </div>

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
            <p className="text-green-700 text-sm">환율이 성공적으로 추가되었습니다!</p>
          </div>
        )}

        {/* Error from API */}
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">오류: {mutation.error.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {mutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>추가 중...</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>환율 추가</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ExchangeRateForm;
