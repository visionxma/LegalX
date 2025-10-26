// src/components/Financial/Financial.tsx - COM PERMISSION GUARDS
import React, { useState, useEffect } from 'react';
import { Revenue, Expense } from '../../types';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission'; // NOVO
import { useTeam } from '../../contexts/TeamContext'; // NOVO
import FinancialForm from './FinancialForm';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialProps {
  quickActionType?: string | null;
  onClearQuickAction: () => void;
}

function Financial({ quickActionType, onClearQuickAction }: FinancialProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'revenues' | 'expenses'>('revenues');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'revenue' | 'expense'>('revenue');
  const [selectedItem, setSelectedItem] = useState<Revenue | Expense | null>(null);
  const [loading, setLoading] = useState(true);

  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const { isSoloMode, activeTeam } = useTeam();
  
  const canCreate = hasPermission('financas');
  const canEdit = hasPermission('financas');
  const canDelete = hasPermission('financas');

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    if (quickActionType === 'revenue' && canCreate) {
      setFormType('revenue');
      setSelectedItem(null);
      setShowForm(true);
      onClearQuickAction();
    } else if (quickActionType === 'expense' && canCreate) {
      setFormType('expense');
      setSelectedItem(null);
      setShowForm(true);
      onClearQuickAction();
    } else if ((quickActionType === 'revenue' || quickActionType === 'expense') && !canCreate) {
      alert('Você não possui permissão para criar registros financeiros.');
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction, canCreate]);

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
    if (!canCreate) {
      alert('Você não possui permissão para criar registros financeiros.');
      return;
    }
    
    setFormType(type);
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: Revenue | Expense, type: 'revenue' | 'expense') => {
    if (!canEdit) {
      alert('Você não possui permissão para editar registros financeiros.');
      return;
    }
    
    setFormType(type);
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleSaveItem = async (data: Revenue | Expense, type: 'revenue' | 'expense') => {
    try {
      if (selectedItem) {
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
      
      await loadFinancialData();
      setShowForm(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Erro ao salvar item financeiro:', error);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  const handleDeleteItem = async (id: string, type: 'revenue' | 'expense') => {
    if (!canDelete) {
      alert('Você não possui permissão para excluir registros financeiros.');
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir esta ${type === 'revenue' ? 'receita' : 'despesa'}?`)) {
      try {
        let success = false;
        if (type === 'revenue') {
          success = await firestoreService.deleteRevenue(id);
        } else {
          success = await firestoreService.deleteExpense(id);
        }
        
        if (success) {
          await loadFinancialData();
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
          {/* NOVO: Indicador de contexto */}
          {!isSoloMode && activeTeam && (
            <p className="text-xs text-blue-600 mt-1">
              💰 Visualizando finanças da equipe: {activeTeam.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleNewItem('revenue')}
            disabled={!canCreate}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canCreate
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canCreate ? 'Sem permissão para criar receitas' : 'Nova receita'}
          >
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
            Nova Receita
          </button>
          <button
            onClick={() => handleNewItem('expense')}
            disabled={!canCreate}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canCreate
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canCreate ? 'Sem permissão para criar despesas' : 'Nova despesa'}
          >
            <ArrowTrendingDownIcon className="w-5 h-5 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* NOVO: Mensagem de permissão */}
      {!canCreate && !isSoloMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Você possui acesso somente leitura. Não é possível criar ou editar dados financeiros.
          </p>
        </div>
      )}

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

      {/* Tabs e conteúdo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
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

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-2">Carregando dados financeiros...</p>
            </div>
          ) : activeTab === 'revenues' ? (
            <div className="space-y-3">
              {filteredRevenues.map((revenue) => (
                <div key={revenue.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(revenue.amount)}
                      </span>
                      <span className="text-gray-900 font-medium">{revenue.source}</span>
                      {revenue.client && (
                        <span className="text-sm text-gray-500">• {revenue.client}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <span>{formatDate(revenue.date)}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                        {revenue.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditItem(revenue, 'revenue')}
                      disabled={!canEdit}
                      className={`p-2 rounded ${
                        canEdit
                          ? 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={!canEdit ? 'Sem permissão para editar' : 'Editar'}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(revenue.id, 'revenue')}
                      disabled={!canDelete}
                      className={`p-2 rounded ${
                        canDelete
                          ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={!canDelete ? 'Sem permissão para excluir' : 'Excluir'}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredRevenues.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {revenues.length === 0 
                    ? canCreate 
                      ? 'Nenhuma receita cadastrada. Clique em "Nova Receita" para começar.' 
                      : 'Nenhuma receita cadastrada ainda.'
                    : 'Nenhuma receita encontrada com os filtros aplicados.'
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </span>
                      <span className="text-gray-900 font-medium">{expense.type}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <span>{formatDate(expense.date)}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditItem(expense, 'expense')}
                      disabled={!canEdit}
                      className={`p-2 rounded ${
                        canEdit
                          ? 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={!canEdit ? 'Sem permissão para editar' : 'Editar'}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(expense.id, 'expense')}
                      disabled={!canDelete}
                      className={`p-2 rounded ${
                        canDelete
                          ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={!canDelete ? 'Sem permissão para excluir' : 'Excluir'}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredExpenses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {expenses.length === 0 
                    ? canCreate 
                      ? 'Nenhuma despesa cadastrada. Clique em "Nova Despesa" para começar.' 
                      : 'Nenhuma despesa cadastrada ainda.'
                    : 'Nenhuma despesa encontrada com os filtros aplicados.'
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// NOVO: Exportar com guard
import { withPermission } from '../Common/withPermission';

export default withPermission(Financial, 'financas', 'any', {
  showMessage: true
});