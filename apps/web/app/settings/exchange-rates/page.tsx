'use client'

import React from 'react';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import ExchangeRateForm from '../../components/ExchangeRateForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, TrendingUp, AlertCircle, Loader } from 'lucide-react';

interface ExchangeRate {
  id: string;
  from: string;
  to: string;
  rate: number;
}

const deleteExchangeRate = async (rateId: string) => {
  const res = await fetch(`/api/exchange-rates/${rateId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '환율 삭제 실패');
  }
  return res.json();
};

const ExchangeRateManagementPage = () => {
  const queryClient = useQueryClient();
  const { data: exchangeRates, isLoading, isError } = useExchangeRates();

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: deleteExchangeRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
    },
  });

  const handleDelete = (rateId: string) => {
    if (confirm('이 환율을 정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(rateId);
    }
  };

  const rates: ExchangeRate[] = (exchangeRates as ExchangeRate[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">환율 관리</h1>
            <p className="text-slate-600">복수 통화 간의 환율을 설정하고 관리하세요</p>
          </div>
        </div>

        {/* Form Section */}
        <ExchangeRateForm />

        {/* Exchange Rates List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">현재 환율</h2>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-3">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-slate-600">환율 정보를 불러오는 중...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-semibold">환율 로딩 오류</p>
                <p className="text-red-600 text-sm">{deleteMutation.error?.message || '알 수 없는 오류가 발생했습니다.'}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && rates.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">등록된 환율이 없습니다.</p>
              <p className="text-slate-500 text-sm mt-1">위의 폼에서 환율을 추가하세요.</p>
            </div>
          )}

          {/* Exchange Rates Grid */}
          {!isLoading && !isError && rates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 hover:shadow-md transition-all group"
                >
                  {/* Currency Pair */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{rate.from}</span>
                      </div>
                      <span className="text-slate-400">→</span>
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-600">{rate.to}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      disabled={deleteMutation.isPending}
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Exchange Rate */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">환율</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {rate.rate.toFixed(4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      1 {rate.from} = {rate.rate.toFixed(4)} {rate.to}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Error Message */}
          {deleteMutation.isError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">삭제 오류: {deleteMutation.error.message}</p>
            </div>
          )}

          {/* Delete Success Message */}
          {deleteMutation.isSuccess && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 text-sm">환율이 성공적으로 삭제되었습니다!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateManagementPage;
