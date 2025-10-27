import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CalendarEvent, Lawyer } from '../../types';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';
import { format } from 'date-fns';
import { usePermissionCheck } from '../Common/withPermission';

const schema = yup.object({
  title: yup.string().required('Título é obrigatório'),
  date: yup.string().required('Data é obrigatória'),
  time: yup.string().required('Horário é obrigatório'),
  client: yup.string(),
  type: yup.string().required('Tipo é obrigatório'),
  location: yup.string(),
  notes: yup.string(),
  lawyers: yup.array().min(1, 'Pelo menos um advogado é obrigatório'),
  processNumber: yup.string(),
  priority: yup.string()
});

interface CalendarFormProps {
  event?: CalendarEvent | null;
  selectedDate?: Date | null;
  onBack: () => void;
  onSave: (event: CalendarEvent) => void;
}

export default function CalendarForm({ event, selectedDate, onBack, onSave }: CalendarFormProps) {
  const [lawyers, setLawyers] = React.useState<Lawyer[]>([]);
  const [selectedLawyers, setSelectedLawyers] = React.useState<string[]>(event?.lawyers || []);
  const [processes, setProcesses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const canEdit = hasPermission('agenda');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<Partial<CalendarEvent>>({
    resolver: yupResolver(schema),
    defaultValues: event || {
      type: 'Reunião com Cliente',
      status: 'Pendente',
      priority: 'Média'
    }
  });

  const watchedProcessNumber = watch('processNumber');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (event) {
      Object.keys(event).forEach((key) => {
        setValue(key as keyof CalendarEvent, event[key as keyof CalendarEvent]);
      });
      setSelectedLawyers(event.lawyers || []);
    } else if (selectedDate) {
      setValue('date', format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [event, selectedDate, setValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [loadedLawyers, loadedProcesses] = await Promise.all([
        firestoreService.getLawyers(),
        firestoreService.getProcesses()
      ]);
      
      const activeLawyers = loadedLawyers.filter(l => l.status === 'Ativo');
      setLawyers(activeLawyers);
      setProcesses(loadedProcesses);
      
      console.log(`${activeLawyers.length} advogados ativos carregados`);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (watchedProcessNumber) {
      const selectedProcess = processes.find(p => p.processNumber === watchedProcessNumber);
      if (selectedProcess) {
        setValue('client', selectedProcess.client);
        if (selectedProcess.responsibleLawyers) {
          setSelectedLawyers(selectedProcess.responsibleLawyers);
        }
      }
    }
  }, [watchedProcessNumber, processes, setValue]);

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

  const onSubmit = (data: Partial<CalendarEvent>) => {
    if (!canEdit) {
      alert('Você não possui permissão para salvar eventos.');
      return;
    }
    
    const eventData: CalendarEvent = {
      id: event?.id || Date.now().toString(),
      status: 'Pendente',
      lawyers: selectedLawyers,
      ...data
    } as CalendarEvent;
    
    onSave(eventData);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados...</p>
          </div>
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
            Você não possui permissão para {event ? 'editar' : 'criar'} eventos.
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
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h1>
          <p className="text-gray-600">
            {event ? 'Atualize as informações do evento' : 'Cadastre um novo evento na agenda'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título do Evento *
              </label>
              <input
                {...register('title')}
                type="text"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Ex: Audiência - João Silva"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

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
                Horário *
              </label>
              <input
                {...register('time')}
                type="time"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {errors.time && (
                <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do Processo
              </label>
              <select
                {...register('processNumber')}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selecione um processo (opcional)</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.processNumber}>
                    {process.processNumber} - {process.name}
                  </option>
                ))}
              </select>
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
                Tipo de Compromisso *
              </label>
              <select
                {...register('type')}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="Audiência">Audiência</option>
                <option value="Reunião com Cliente">Reunião com Cliente</option>
                <option value="Prazo Processual">Prazo Processual</option>
                <option value="Prazo Interno">Prazo Interno</option>
                <option value="Ligação Importante">Ligação Importante</option>
                <option value="Outro">Outro</option>
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <select
                {...register('priority')}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local
              </label>
              <input
                {...register('location')}
                type="text"
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Ex: Fórum Central - Sala 205"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advogados Responsáveis *
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {lawyers.length > 0 ? (
                  <div className="space-y-2">
                    {lawyers.map((lawyer) => (
                      <label key={lawyer.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedLawyers.includes(lawyer.fullName)}
                          onChange={() => handleLawyerToggle(lawyer.fullName)}
                          disabled={!canEdit}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
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
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleLawyerToggle(lawyer)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedLawyers.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Pelo menos um advogado é obrigatório</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Observações adicionais sobre o evento..."
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
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {event ? 'Atualizar' : 'Salvar'} Evento
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}