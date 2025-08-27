import React from 'react';
import { Employee } from '../../types';
import { ArrowLeftIcon, PencilIcon, BriefcaseIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestoreService } from '../../services/firestoreService';

interface EmployeeViewProps {
  employee: Employee;
  onBack: () => void;
  onEdit: () => void;
  onUpdate?: (employee: Employee) => void;
}

export default function EmployeeView({ employee, onBack, onEdit, onUpdate }: EmployeeViewProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleToggleStatus = async () => {
    const newStatus = employee.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const action = newStatus === 'Ativo' ? 'ativar' : 'inativar';
    
    if (confirm(`Tem certeza que deseja ${action} este colaborador?`)) {
      try {
        const updatedEmployee = await firestoreService.updateEmployee(employee.id, {
          status: newStatus
        });
        
        if (updatedEmployee && onUpdate) {
          onUpdate(updatedEmployee);
        }
      } catch (error) {
        console.error('Erro ao atualizar status do colaborador:', error);
        alert('Erro ao atualizar colaborador. Tente novamente.');
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
            <p className="text-gray-600">Informações detalhadas do colaborador</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleStatus}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              employee.status === 'Ativo'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {employee.status === 'Ativo' ? 'Inativar' : 'Ativar'}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="w-5 h-5 mr-2" />
            Editar
          </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-6 mb-6">
            {employee.photo ? (
              <img
                src={employee.photo}
                alt={employee.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <BriefcaseIcon className="w-12 h-12 text-green-600" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{employee.fullName}</h2>
              <p className="text-lg text-gray-600">{employee.position}</p>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                  employee.status === 'Ativo'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {employee.status}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                CPF
              </label>
              <p className="text-gray-900">{formatCpf(employee.cpf)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Salário
              </label>
              <p className="text-gray-900 font-semibold">{formatCurrency(employee.salary)}</p>
            </div>

            {employee.email && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <div className="flex items-center">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{employee.email}</p>
                </div>
              </div>
            )}

            {employee.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Telefone
                </label>
                <div className="flex items-center">
                  <PhoneIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{employee.phone}</p>
                </div>
              </div>
            )}

            {employee.address && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Endereço
                </label>
                <div className="flex items-center">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{employee.address}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Data de Cadastro
              </label>
              <p className="text-gray-900">{formatDate(employee.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-blue-600">Tarefas Concluídas</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-green-600">Projetos Ativos</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(employee.salary * 12)}</p>
              <p className="text-sm text-purple-600">Salário Anual</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}