import React, { useState, useEffect } from 'react';
import { Revenue, Expense, Lawyer, Employee } from '../../types';
import { firestoreService } from '../../services/firestoreService';
import FinancialForm from './FinancialForm';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialProps {
  quickActionType?: string | null;
  onClearQuickAction: () => void;
}

export default function Financial({ quickActionType, onClearQuickAction }: FinancialProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'revenues' | 'expenses'>('revenues');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'revenue' | 'expense'>('revenue');
  const [selectedItem, setSelectedItem] = useState<Revenue | Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    if (quickActionType === 'revenue') {
      setFormType('revenue');
      setSelectedItem(null);
      setShowForm(true);
      onClearQuickAction();
    } else if (quickActionType === 'expense') {
      setFormType('expense');
      setSelectedItem(null);
      setShowForm(true);
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const [loadedRevenues, loadedExpenses] = await Promise.all([
        firestoreService.getRevenues(),
        firestoreService.getExpenses()
      ]);
      setRevenues(loadedRevenues);
      setExpenses(loadedExpenses);
      console.log(`${loadedRevenues.length} receitas e ${loadedExpenses.length} despesas carregadas`);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setRevenues([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewItem = (type: 'revenue' | 'expense') => {
    setFormType(type);
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: Revenue | Expense, type: 'revenue' | 'expense') => {
    setFormType(type);
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleSaveItem = async (data: Revenue | Expense, type: 'revenue' | 'expense') => {
    try {
      if (selectedItem) {
        // Atualizar item existente
        if (type === 'revenue') {
          const updatedRevenue = await firestoreService.updateRevenue(selectedItem.id, data as Partial<Revenue>);
          if (updatedRevenue) {
            console.log('Receita atualizada com sucesso');
          }
        } else {
          const updatedExpense = await firestoreService.updateExpense(selectedItem.id, data as Partial<Expense>);
          if (updatedExpense) {
            console.log('Despesa atualizada com sucesso');
          }
        }
      } else {
        // Criar novo item
        if (type === 'revenue') {
          const newRevenue = await firestoreService.saveRevenue(data as Omit<Revenue, 'id'>);
          if (newRevenue) {
            console.log('Nova receita criada com sucesso');
          }
        } else {
          const newExpense = await firestoreService.saveExpense(data as Omit<Expense, 'id'>);
          if (newExpense) {
            console.log('Nova despesa criada com sucesso');
          }
        }
      }
      
      await loadFinancialData(); // Recarregar dados
      setShowForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Erro ao salvar item financeiro:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  const handleDeleteItem = async (id: string, type: 'revenue' | 'expense') => {
    if (confirm(`Tem certeza que deseja excluir esta ${type === 'revenue' ? 'receita' : 'despesa'}?`)) {
      try {
        let success = false;
        if (type === 'revenue') {
          success = await firestoreService.deleteRevenue(id);
        } else {
          success = await firestoreService.deleteExpense(id);
        }
        
        if (success) {
          await loadFinancialData(); // Recarregar dados
        }
      } catch (error) {
        console.error('Erro ao excluir item:', error);
        alert('Erro ao excluir. Tente novamente.');
      }
    }
  };

  const handleBackToList = () => {
    setShowForm(false);
    setSelectedItem(null);
  };

  const filteredRevenues = revenues.filter(revenue => {
    const matchesSearch = revenue.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (revenue.client && revenue.client.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (revenue.description && revenue.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || revenue.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const totalRevenues = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = totalRevenues - totalExpenses;

  if (showForm) {
    return (
      <FinancialForm
        type={formType}
        item={selectedItem}
        onBack={handleBackToList}
        onSave={handleSaveItem}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
          <p className="text-gray-600">Controle de receitas e despesas do escritório</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleNewItem('revenue')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
            Nova Receita
          </button>
          <button
            onClick={() => handleNewItem('expense')}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <ArrowTrendingDownIcon className="w-5 h-5 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-green-100 text-sm">Total de Receitas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenues)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <ArrowTrendingDownIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-red-100 text-sm">Total de Despesas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 text-white ${
          balance >= 0 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
            : 'bg-gradient-to-r from-orange-500 to-orange-600'
        }`}>
          <div className="flex items-center">
            <div className="w-8 h-8 mr-3 flex items-center justify-center">
              <span className="text-2xl font-bold">₿</span>
            </div>
            <div>
              <p className={`text-sm ${balance >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>
                Saldo Atual
              </p>
              <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('revenues')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'revenues'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receitas ({revenues.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'expenses'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Despesas ({expenses.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as Categorias</option>
              {activeTab === 'revenues' ? (
                <>
                  <option value="Honorário">Honorário</option>
                  <option value="Consultoria">Consultoria</option>
                  <option value="Outro">Outro</option>
                </>
              ) : (
                <>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Internet">Internet</option>
                  <option value="Material">Material</option>
                  <option value="Outro">Outro</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Carregando dados financeiros...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'revenues' ? 'Fonte' : 'Tipo'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsável
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === 'revenues' ? (
                  filteredRevenues.map((revenue) => (
                    <tr key={revenue.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(revenue.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{revenue.source}</div>
                          {revenue.client && (
                            <div className="text-sm text-gray-500">Cliente: {revenue.client}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {revenue.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {revenue.responsibleLawyers && revenue.responsibleLawyers.length > 0 ? (
                            <>
                              <div className="font-medium">{revenue.responsibleLawyers[0]}</div>
                              {revenue.responsibleLawyers.length > 1 && (
                                <div className="text-xs text-gray-500">
                                  +{revenue.responsibleLawyers.length - 1} outros
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(revenue.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditItem(revenue, 'revenue')}
                            className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(revenue.id, 'revenue')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Excluir"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{expense.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {(expense as any).responsibleMembers && (expense as any).responsibleMembers.length > 0 ? (
                            <>
                              <div className="font-medium">{(expense as any).responsibleMembers[0]}</div>
                              {(expense as any).responsibleMembers.length > 1 && (
                                <div className="text-xs text-gray-500">
                                  +{(expense as any).responsibleMembers.length - 1} outros
                                </div>
                              )}
                            </>
                          ) : (expense as any).responsibleLawyers && (expense as any).responsibleLawyers.length > 0 ? (
                            <>
                              <div className="font-medium">{(expense as any).responsibleLawyers[0]}</div>
                              {(expense as any).responsibleLawyers.length > 1 && (
                                <div className="text-xs text-gray-500">
                                  +{(expense as any).responsibleLawyers.length - 1} outros
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditItem(expense, 'expense')}
                            className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-50"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(expense.id, 'expense')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Excluir"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Empty States */}
          {!loading && (
            <>
              {activeTab === 'revenues' && filteredRevenues.length === 0 && (
                <div className="text-center py-12">
                  <ArrowTrendingUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {revenues.length === 0 
                      ? 'Nenhuma receita cadastrada. Clique em "Nova Receita" para começar.' 
                      : 'Nenhuma receita encontrada com os filtros aplicados.'
                    }
                  </p>
                </div>
              )}
              {activeTab === 'expenses' && filteredExpenses.length === 0 && (
                <div className="text-center py-12">
                  <ArrowTrendingDownIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {expenses.length === 0 
                      ? 'Nenhuma despesa cadastrada. Clique em "Nova Despesa" para começar.' 
                      : 'Nenhuma despesa encontrada com os filtros aplicados.'
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}