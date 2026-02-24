'use client'

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertCircle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl'

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
    throw new Error(errorData.error || 'Failed to create exchange rate');
  }
  return res.json();
};

const ExchangeRateForm = () => {
  const tSettings = useTranslations('settings')
  const tCommon = useTranslations('common')
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
      setFormError('Please fill in all fields.');
      return;
    }
    if (isNaN(Number(formData.rate)) || Number(formData.rate) <= 0) {
      setFormError('Rate must be greater than 0.');
      return;
    }
    if (formData.from === formData.to) {
      setFormError('Source and destination currency cannot be the same.');
      return;
    }

    mutation.mutate(formData);
  };

  const currencies = [
    { value: 'KRW', label: 'KRW (₩)' },
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'USD', label: 'USD ($)' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-sm border border-slate-100 p-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Add New Rate</h2>
          <p className="text-sm text-slate-600">Configure exchange rates between currencies</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency Selection */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 mb-4">Rate Settings</label>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* From Currency */}
            <div className="flex-1">
              <label htmlFor="from" className="block text-xs font-semibold text-slate-600 mb-2 uppercase">
                {tSettings('from')}
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
                title="Swap"
              >
                <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
              </button>
            </div>

            {/* To Currency */}
            <div className="flex-1">
              <label htmlFor="to" className="block text-xs font-semibold text-slate-600 mb-2 uppercase">
                {tSettings('to')}
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
            {tSettings('rate')} (1 {formData.from} = ? {formData.to}) *
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
            e.g., How much is 1 {formData.from} in {formData.to}?
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
            <p className="text-green-700 text-sm">Exchange rate added successfully!</p>
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
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {mutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{tCommon('loading')}</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Add Rate</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ExchangeRateForm;
