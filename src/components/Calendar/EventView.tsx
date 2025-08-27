import React from 'react';
import { CalendarEvent } from '../../types';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  TrashIcon,
  ScaleIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  DocumentTextIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { firestoreService } from '../../services/firestoreService';

interface EventViewProps {
  event: CalendarEvent;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate?: (event: CalendarEvent) => void;
}

// Configuração de tipos de evento com cores e ícones
const EVENT_TYPES = {
  'Audiência': {
    color: 'bg-red-100 text-red-800',
    icon: ScaleIcon,
    iconColor: 'text-red-600'
  },
  'Reunião com Cliente': {
    color: 'bg-blue-100 text-blue-800',
    icon: UserGroupIcon,
    iconColor: 'text-blue-600'
  },
  'Prazo Processual': {
    color: 'bg-amber-100 text-amber-800',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-amber-600'
  },
  'Prazo Interno': {
    color: 'bg-orange-100 text-orange-800',
    icon: ClockIcon,
    iconColor: 'text-orange-600'
  },
  'Ligação Importante': {
    color: 'bg-green-100 text-green-800',
    icon: PhoneIcon,
    iconColor: 'text-green-600'
  },
  'Outro': {
    color: 'bg-gray-100 text-gray-800',
    icon: DocumentTextIcon,
    iconColor: 'text-gray-600'
  }
};

const PRIORITY_COLORS = {
  'Baixa': 'bg-green-100 text-green-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-orange-100 text-orange-800',
  'Urgente': 'bg-red-100 text-red-800'
};

export default function EventView({ event, onBack, onEdit, onDelete, onUpdate }: EventViewProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const handleMarkAsCompleted = async () => {
    if (confirm('Tem certeza que deseja marcar este evento como concluído?')) {
      try {
        const updatedEvent = await firestoreService.updateEvent(event.id, {
          status: 'Concluído'
        });
        
        if (updatedEvent && onUpdate) {
          onUpdate(updatedEvent);
        }
      } catch (error) {
        console.error('Erro ao atualizar status do evento:', error);
        alert('Erro ao atualizar evento. Tente novamente.');
      }
    }
  };

  const handleMarkAsPending = async () => {
    if (confirm('Tem certeza que deseja marcar este evento como pendente?')) {
      try {
        const updatedEvent = await firestoreService.updateEvent(event.id, {
          status: 'Pendente'
        });
        
        if (updatedEvent && onUpdate) {
          onUpdate(updatedEvent);
        }
      } catch (error) {
        console.error('Erro ao atualizar status do evento:', error);
        alert('Erro ao atualizar evento. Tente novamente.');
      }
    }
  };

  const eventConfig = EVENT_TYPES[event.type] || EVENT_TYPES['Outro'];
  const IconComponent = eventConfig.icon;

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
            <div className="flex items-center space-x-3">
              <IconComponent className={`w-8 h-8 ${eventConfig.iconColor}`} />
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            </div>
            <p className="text-gray-600">Detalhes do compromisso</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {event.status === 'Pendente' ? (
            <button
              onClick={handleMarkAsCompleted}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Marcar como Concluído
            </button>
          ) : (
            <button
              onClick={handleMarkAsPending}
              className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <ClockIcon className="w-5 h-5 mr-2" />
              Marcar como Pendente
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="w-5 h-5 mr-2" />
            Remarcar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            Excluir
          </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Event Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Evento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Data
              </label>
              <p className="text-gray-900 font-medium">{formatDate(event.date)}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Horário
              </label>
              <p className="text-gray-900 font-medium">{formatTime(event.time)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Tipo
              </label>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${eventConfig.color}`}>
                <IconComponent className={`w-4 h-4 mr-2 ${eventConfig.iconColor}`} />
                {event.type}
              </span>
            </div>

            {event.priority && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Prioridade
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${PRIORITY_COLORS[event.priority]}`}>
                  {event.priority}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status
              </label>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  event.status === 'Concluído'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {event.status}
              </span>
            </div>

            {event.client && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Cliente
                </label>
                <p className="text-gray-900">{event.client}</p>
              </div>
            )}

            {event.processNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Número do Processo
                </label>
                <div className="flex items-center">
                  <FolderIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-gray-900 font-mono">{event.processNumber}</p>
                </div>
              </div>
            )}

            {event.location && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Local
                </label>
                <p className="text-gray-900">{event.location}</p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Advogados Responsáveis
              </label>
              <div>
                {event.lawyers && event.lawyers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {event.lawyers.map((lawyer, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                      >
                        {lawyer}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Não definido</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {event.notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{event.notes}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="flex flex-wrap gap-3">
            {event.status === 'Pendente' ? (
              <button
                onClick={handleMarkAsCompleted}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Marcar como Concluído
              </button>
            ) : (
              <button
                onClick={handleMarkAsPending}
                className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <ClockIcon className="w-4 h-4 mr-2" />
                Marcar como Pendente
              </button>
            )}
            
            <button
              onClick={onEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Remarcar Evento
            </button>
            
            <button
              onClick={onDelete}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Excluir Evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}