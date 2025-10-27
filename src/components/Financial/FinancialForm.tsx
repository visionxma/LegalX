import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Revenue, Expense, Lawyer, Employee } from '../../types';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission';

const revenueSchema = yup.object({
  date: yup.string().required('Data é obrigatória'),
  amount: yup.number().positive('Valor deve ser positivo').required('Valor é obrigatório'),
  source: yup.string().required('Fonte é obrigatória'),
  category: yup.string().required('Categoria é obrigatória'),
  responsibleLawyers: yup.array(),
  client: yup.string(),
  description: yup.string()
});

const expenseSchema = yup.object({
  date: yup.string().required('Data é obrigatória'),
  amount: yup.number().positive('Valor deve ser positivo').required('Valor é obrigatório'),
  type: yup.string().required('Tipo é obrigatório'),
  category: yup.string().required('Categoria é obrigatória'),
  responsibleMembers: yup.array(),
  description: yup.string(),
  receipt: yup.string()
});

interface FinancialFormProps {
  type: 'revenue' | 'expense';
  item?: Revenue | Expense | null;
  onBack: () => void;
  onSave: (data: Revenue | Expense, type: 'revenue' | 'expense') => void;
}

export default function FinancialForm({ type, item, onBack, onSave }: FinancialFormProps) {
  const [lawyers, setLawyers] = React.useState<Lawyer[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>(
    (item as any)?.responsibleLawyers || (item as any)?.responsibleMembers || []
  );
  const [loading, setLoading] = React.useState(true);
  
  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('financas');
  
  const schema = type === 'revenue' ? revenueSchema : expenseSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: item || (type === 'revenue' ? { category: 'Honorário' } : { category: 'Aluguel' })
  });

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (item) {
      Object.keys(item).forEach((key) => {
        setValue(key as any, (item as any)[key]);
      });
      const responsibleMembers = (item as any)?.responsibleMembers || (item as any)?.responsibleLawyers || [];
      setSelectedMembers(responsibleMembers);
    }
  }, [item, setValue]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const [loadedLawyers, loadedEmployees] = await Promise.all([
        firestoreService.getLawyers(),
        firestoreService.getEmployees()
      ]);
      
      setLawyers(loadedLawyers.filter(l => l.status === 'Ativo'));
      setEmployees(loadedEmployees.filter(e => e.status === 'Ativo'));
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      setLawyers([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (memberName: string) => {
    if (!canEdit) return;
    
    setSelectedMembers(prev => {
      if (prev.includes(memberName)) {
        return prev.filter(name => name !== memberName);
      } else {
        return [...prev, memberName];
      }
    });
  };

  const onSubmit = (data: any) => {
    if (!canEdit) {
      alert('Você não possui permissão para salvar registros financeiros.');
      return;
    }
    
    const itemData = {
      id: item?.id || Date.now().toString(),
      responsibleMembers: selectedMembers,
      ...(type === 'revenue' && { responsibleLawyers: selectedMembers }),
      ...data
    };
    
    onSave(itemData, type);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  // NOVO: Guard de permissão
  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sem Permissão</h2>
          <p className="text-gray-600 mb-4">
            Você não possui permissão para {item ? 'editar' : 'criar'} {type === 'revenue' ? 'receitas' : 'despesas'}.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {item ? 'Editar' : 'Nova'} {type === 'revenue' ? 'Receita' : 'Despesa'}
          </h1>
          <p className="text-gray-600">
            {item ? 'Atualize as informações' : 'Cadastre uma nova entrada'} 
            {type === 'revenue' ? ' de receita' : ' de despesa'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                {...register('date')}
                type="date"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor *
              </label>
              <input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            {type === 'revenue' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fonte *
                  </label>
                  <input
                    {...register('source')}
                    type="text"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Ex: João Silva"
                  />
                  {errors.source && (
                    <p className="text-red-500 text-sm mt-1">{errors.source.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    {...register('category')}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="Honorário">Honorário</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Outro">Outro</option>
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente
                  </label>
                  <input
                    {...register('client')}
                    type="text"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Nome do cliente (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsáveis
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {(lawyers.length > 0 || employees.length > 0) ? (
                      <div className="space-y-2">
                        {lawyers.length > 0 && (
                          <>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Advogados</p>
                            {lawyers.map((lawyer) => (
                              <label key={`lawyer-${lawyer.id}`} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(lawyer.fullName)}
                                  onChange={() => handleMemberToggle(lawyer.fullName)}
                                  disabled={!canEdit}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">
                                  {lawyer.fullName} - OAB: {lawyer.oab}
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                        
                        {employees.length > 0 && (
                          <>
                            {lawyers.length > 0 && <div className="border-t border-gray-200 my-2"></div>}
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Colaboradores</p>
                            {employees.map((employee) => (
                              <label key={`employee-${employee.id}`} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(employee.fullName)}
                                  onChange={() => handleMemberToggle(employee.fullName)}
                                  disabled={!canEdit}
                                  className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">
                                  {employee.fullName} - {employee.position}
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Nenhum responsável disponível</p>
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {selectedMembers.map((member, index) => {
                          const isLawyer = lawyers.some(l => l.fullName === member);
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isLawyer 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {member}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleMemberToggle(member)}
                                  className={`ml-1 hover:${isLawyer ? 'text-blue-800' : 'text-green-800'}`}
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <input
                    {...register('type')}
                    type="text"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Ex: Aluguel do escritório"
                  />
                  {errors.type && (
                    <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    {...register('category')}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="Aluguel">Aluguel</option>
                    <option value="Internet">Internet</option>
                    <option value="Material">Material</option>
                    <option value="Energia">Energia</option>
                    <option value="Salário">Salário</option>
                    <option value="Alimentação/Bebidas">Alimentação/Bebidas</option>
                    <option value="Evento">Evento</option>
                    <option value="Outro">Outro</option>
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comprovante
                  </label>
                  <input
                    {...register('receipt')}
                    type="text"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Nome do arquivo ou referência"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsável pela despesa
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {(lawyers.length > 0 || employees.length > 0) ? (
                      <div className="space-y-2">
                        {lawyers.length > 0 && (
                          <>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Advogados</p>
                            {lawyers.map((lawyer) => (
                              <label key={`lawyer-${lawyer.id}`} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(lawyer.fullName)}
                                  onChange={() => handleMemberToggle(lawyer.fullName)}
                                  disabled={!canEdit}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">
                                  {lawyer.fullName} - OAB: {lawyer.oab}
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                        
                        {employees.length > 0 && (
                          <>
                            {lawyers.length > 0 && <div className="border-t border-gray-200 my-2"></div>}
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Colaboradores</p>
                            {employees.map((employee) => (
                              <label key={`employee-${employee.id}`} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(employee.fullName)}
                                  onChange={() => handleMemberToggle(employee.fullName)}
                                  disabled={!canEdit}
                                  className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-700">
                                  {employee.fullName} - {employee.position}
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Nenhum responsável disponível</p>
                    )}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {selectedMembers.map((member, index) => {
                          const isLawyer = lawyers.some(l => l.fullName === member);
                          return (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isLawyer 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {member}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleMemberToggle(member)}
                                  className={`ml-1 hover:${isLawyer ? 'text-blue-800' : 'text-green-800'}`}
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                {...register('description')}
                rows={3}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Descrição adicional (opcional)"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canEdit}
              className={`px-6 py-2 rounded-lg transition-colors ${
                canEdit
                  ? type === 'revenue'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {item ? 'Atualizar' : 'Salvar'} {type === 'revenue' ? 'Receita' : 'Despesa'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}