import React from 'react';
import { Lawyer } from '../../types';
import { ArrowLeftIcon, PencilIcon, UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission';

interface LawyerViewProps {
  lawyer: Lawyer;
  onBack: () => void;
  onEdit: () => void;
  onUpdate?: (lawyer: Lawyer) => void;
}

export default function LawyerView({ lawyer, onBack, onEdit, onUpdate }: LawyerViewProps) {
  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('equipe');

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleToggleStatus = async () => {
    if (!canEdit) {
      alert('Você não possui permissão para alterar o status do advogado.');
      return;
    }

    const newStatus = lawyer.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const action = newStatus === 'Ativo' ? 'ativar' : 'inativar';
    
    if (confirm(`Tem certeza que deseja ${action} este advogado?`)) {
      try {
        const updatedLawyer = await firestoreService.updateLawyer(lawyer.id, {
          status: newStatus
        });
        
        if (updatedLawyer && onUpdate) {
          onUpdate(updatedLawyer);
        }
      } catch (error) {
        console.error('Erro ao atualizar status do advogado:', error);
        alert('Erro ao atualizar advogado. Tente novamente.');
      }
    }
  };

  const handleEditClick = () => {
    if (!canEdit) {
      alert('Você não possui permissão para editar advogados.');
      return;
    }
    onEdit();
  };

  return (
    <div className="p-6">
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
            <h1 className="text-2xl font-bold text-gray-900">{lawyer.fullName}</h1>
            <p className="text-gray-600">Informações detalhadas do advogado</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleStatus}
            disabled={!canEdit}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canEdit
                ? lawyer.status === 'Ativo'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canEdit ? 'Sem permissão para alterar status' : undefined}
          >
            {lawyer.status === 'Ativo' ? 'Inativar' : 'Ativar'}
          </button>
          <button
            onClick={handleEditClick}
            disabled={!canEdit}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canEdit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canEdit ? 'Sem permissão para editar' : 'Editar advogado'}
          >
            <PencilIcon className="w-5 h-5 mr-2" />
            Editar
          </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-6 mb-6">
            {lawyer.photo ? (
              <img
                src={lawyer.photo}
                alt={lawyer.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-blue-600" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{lawyer.fullName}</h2>
              <p className="text-lg text-gray-600">OAB: {lawyer.oab}</p>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                  lawyer.status === 'Ativo'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {lawyer.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                CPF
              </label>
              <p className="text-gray-900">{formatCpf(lawyer.cpf)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Comissão
              </label>
              <p className="text-gray-900 font-semibold">{lawyer.commission}%</p>
            </div>

            {lawyer.email && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Email
                </label>
                <div className="flex items-center">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{lawyer.email}</p>
                </div>
              </div>
            )}

            {lawyer.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Telefone
                </label>
                <div className="flex items-center">
                  <PhoneIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{lawyer.phone}</p>
                </div>
              </div>
            )}

            {lawyer.address && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Endereço
                </label>
                <div className="flex items-center">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900">{lawyer.address}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Data de Cadastro
              </label>
              <p className="text-gray-900">{formatDate(lawyer.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Especialidades</h3>
          {lawyer.specialties && lawyer.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lawyer.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma especialidade cadastrada</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-blue-600">Processos Ativos</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-green-600">Processos Concluídos</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">R$ 0,00</p>
              <p className="text-sm text-purple-600">Comissões do Mês</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}