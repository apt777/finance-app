'use client'

import React from 'react';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import ExchangeRateForm from '../../components/ExchangeRateForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

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

  if (isLoading) return <div className="text-black">환율 로딩 중...</div>;
  if (isError) return <div className="text-red-500">환율 로딩 오류: {deleteMutation.error?.message || '알 수 없는 오류'}</div>;

  const rates: ExchangeRate[] = (exchangeRates as ExchangeRate[]) || [];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-black">환율 관리</h1>

      <ExchangeRateForm />

      <div className="bg-white p-4 rounded shadow mt-8">
        <h2 className="text-xl font-semibold mb-4 text-black">현재 환율</h2>
        {rates.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시작 통화</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대상 통화</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">환율</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rate.from}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.to}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.rate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="text-red-600 hover:text-red-900 ml-4"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-black">등록된 환율이 없습니다.</p>
        )}
        {deleteMutation.isError && <p className="text-red-500">삭제 오류: {deleteMutation.error.message}</p>}
        {deleteMutation.isSuccess && <p className="text-green-500">환율이 성공적으로 삭제되었습니다!</p>}
      </div>
    </div>
  );
};

export default ExchangeRateManagementPage;
