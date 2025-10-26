// src/components/Processes/ProcessForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Process, Lawyer } from '../../types';
import { usePermissionCheck } from '../Common/withPermission';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';

const schema = yup.object({
  name: yup.string().required('Nome do processo é obrigatório'),
  processNumber: yup.string().required('Número do processo é obrigatório'),
  client: yup.string().required('Cliente é obrigatório'),
  opposingParty: yup.string(),
  court: yup.string().required('Fórum/Comarca é obrigatório'),
  responsibleLawyers: yup.array().min(1, 'Pelo menos um advogado responsável é obrigatório'),
  startDate: yup.string().required('Data de início é obrigatória'),
  status: yup.string().required('Status é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
  notes: yup.string()
});

interface ProcessFormProps {
  process?: Process | null;
  onBack: () => void;
  onSave: (process: Process) => void;
}

export default function ProcessForm({ process, onBack, onSave }: ProcessFormProps) {
  const [attachments, setAttachments] = useState<string[]>(process?.attachments || []);
  const [selectedLawyers, setSelectedLawyers] = useState<string[]>(process?.responsibleLawyers || []);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLawyers, setLoadingLawyers] = useState(true);
  
  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('processos');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<Partial<Process>>({
    resolver: yupResolver(schema),
    defaultValues: process || {
      status: 'Em andamento'
    }
  });

  useEffect(() => {
    loadLawyers();
    
    if (process) {
      Object.keys(process).forEach((key) => {
        setValue(key as keyof Process, process[key as keyof Process]);
      });
      setAttachments(process.attachments || []);
      setSelectedLawyers(process.responsibleLawyers || []);
    }
  }, [process, setValue]);

  const loadLawyers = async () => {
    try {
      setLoadingLawyers(true);
      const loadedLawyers = await firestoreService.getLawyers();
      const activeLawyers = loadedLawyers.filter(l => l.status === 'Ativo');
      setLawyers(activeLawyers);
    } catch (error) {
      console.error('Erro ao carregar advogados:', error);
      alert('Erro ao carregar lista de advogados.');
    } finally {
      setLoadingLawyers(false);
    }
  };

  const handleLawyerToggle = (lawyerName: string) => {
    if (!canEdit) return;
    
    setSelectedLawyers(prev => {
      if (prev.includes(lawyerName)) {
        return prev.filter(name => name !== lawyerName);
      } else {
        return [...prev, lawyerName];
      }
    });
  };

  const addAttachment = () => {
    if (!canEdit) {
      alert('Você não possui permissão para adicionar anexos.');
      return;
    }
    
    const fileName = prompt('Nome do arquivo anexado:');
    if (fileName && fileName.trim()) {
      setAttachments([...attachments, fileName.trim()]);
    }
  };

  const removeAttachment = (index: number) => {
    if (!canEdit) return;
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: Partial<Process>) => {
    if (loading || !canEdit) return;
    
    try {
      setLoading(true);
      
      if (process) {
        // Atualizar processo existente
        const updatedProcess = await firestoreService.updateProcess(process.id, {
          ...data,
          attachments,
          responsibleLawyers: selectedLawyers
        } as Partial<Process>);
        
        if (updatedProcess) {
          console.log('Processo atualizado com sucesso');
          onSave(updatedProcess);
        } else {
          alert('Erro ao atualizar processo');
        }
      } else {
        // Criar novo processo
        const newProcess = await firestoreService.saveProcess({
          ...data,
          attachments,
          responsibleLawyers: selectedLawyers
        } as Omit<Process, 'id' | 'createdAt'>);
        
        console.log('Novo processo criado com sucesso');
        onSave(newProcess);
      }
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      alert('Erro ao salvar processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // GUARD: Mensagem se não tiver permissão
  if (!canEdit && !loadingLawyers) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Sem Permissão</h3>
            <p className="text-amber-700 mb-4">
              Você não possui permissão para {process ? 'editar' : 'criar'} processos.
            </p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          disabled={loading}
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Voltar
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {process ? 'Editar Processo' : 'Novo Processo'}
          </h1>
          <p className="text-gray-600">
            {process ? 'Atualize as informações do processo' : 'Cadastre um novo processo jurídico'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Processo *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Ex: Execução Fiscal – José Santos"
                  disabled={loading || !canEdit}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Processo *
                </label>
                <input
                  {...register('processNumber')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="0001234-56.2023.8.02.0001"
                  disabled={loading || !canEdit}
                />
                {errors.processNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.processNumber.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <input
                  {...register('client')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Nome do cliente"
                  disabled={loading || !canEdit}
                />
                {errors.client && (
                  <p className="text-red-500 text-sm mt-1">{errors.client.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parte Contrária
                </label>
                <input
                  {...register('opposingParty')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Nome da parte contrária"
                  disabled={loading || !canEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fórum/Comarca e Vara *
                </label>
                <input
                  {...register('court')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Comarca de São Paulo - 1ª Vara Cível"
                  disabled={loading || !canEdit}
                />
                {errors.court && (
                  <p className="text-red-500 text-sm mt-1">{errors.court.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advogados Responsáveis *
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {loadingLawyers ? (
                    <p className="text-gray-500 text-sm">Carregando advogados...</p>
                  ) : lawyers.length > 0 ? (
                    <div className="space-y-2">
                      {lawyers.map((lawyer) => (
                        <label key={lawyer.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedLawyers.includes(lawyer.fullName)}
                            onChange={() => handleLawyerToggle(lawyer.fullName)}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                            disabled={loading || !canEdit}
                          />
                          <span className="text-sm text-gray-700">
                            {lawyer.fullName} - OAB: {lawyer.oab}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum advogado disponível</p>
                  )}
                </div>
                {selectedLawyers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Selecionados:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedLawyers.map((lawyer, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {lawyer}
                          <button
                            type="button"
                            onClick={() => handleLawyerToggle(lawyer)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                            disabled={loading || !canEdit}
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedLawyers.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">Pelo menos um advogado é obrigatório</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Início *
                </label>
                <input
                  {...register('startDate')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={loading || !canEdit}
                />
                {errors.startDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={loading || !canEdit}
                >
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes do Caso</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição Principal *
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Descreva os detalhes principais do caso..."
                  disabled={loading || !canEdit}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anotações Complementares
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Observações adicionais..."
                  disabled={loading || !canEdit}
                />
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Documentos Anexos</h3>
              <button
                type="button"
                onClick={addAttachment}
                disabled={loading || !canEdit}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  canEdit && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!canEdit ? 'Sem permissão para adicionar anexos' : 'Adicionar anexo'}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Adicionar Anexo
              </button>
            </div>
            
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">{attachment}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      disabled={loading || !canEdit}
                      className={`p-2 rounded ${
                        canEdit && !loading
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhum documento anexado</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !canEdit}
              className={`px-6 py-2 rounded-lg transition-colors ${
                canEdit && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!canEdit ? 'Sem permissão para salvar' : 'Salvar processo'}
            >
              {loading ? 'Salvando...' : (process ? 'Atualizar' : 'Salvar')} Processo
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}