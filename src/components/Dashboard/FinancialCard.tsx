import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface FinancialCardProps {
  title: string;
  amount: number;
  type: 'revenue' | 'expense' | 'balance';
  change?: number;
}

export default function FinancialCard({ title, amount, type, change }: FinancialCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCardColor = () => {
    switch (type) {
      case 'revenue':
        return 'border-green-200 bg-green-50';
      case 'expense':
        return 'border-red-200 bg-red-50';
      case 'balance':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getAmountColor = () => {
    switch (type) {
      case 'revenue':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      case 'balance':
        return amount >= 0 ? 'text-blue-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${getCardColor()} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${getAmountColor()}`}>
            {formatCurrency(amount)}
          </p>
        </div>
        {change !== undefined && (
          <div className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? (
              <ArrowUpIcon className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownIcon className="w-4 h-4 mr-1" />
            )}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}