// src/components/Calendar/Calendar.tsx - COM PERMISSION GUARDS
import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../types';
import { firestoreService } from '../../services/firestoreService';
import { usePermissionCheck } from '../Common/withPermission'; // NOVO
import { useTeam } from '../../contexts/TeamContext'; // NOVO
import CalendarForm from './CalendarForm';
import EventView from './EventView';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  ScaleIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { startOfWeek, endOfWeek, addDays, startOfDay, endOfDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarProps {
  quickActionType?: string | null;
  onClearQuickAction: () => void;
}

// EVENT TYPES CONFIG
const EVENT_TYPES = {
  'Audiência': {
    color: 'bg-red-100 text-red-700 border-red-200',
    hoverColor: 'hover:bg-red-200',
    icon: ScaleIcon,
    iconColor: 'text-red-600'
  },
  'Reunião com Cliente': {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
    icon: UserGroupIcon,
    iconColor: 'text-blue-600'
  },
  'Prazo Processual': {
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    hoverColor: 'hover:bg-amber-200',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-amber-600'
  },
  'Prazo Interno': {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    hoverColor: 'hover:bg-orange-200',
    icon: ClockIcon,
    iconColor: 'text-orange-600'
  },
  'Ligação Importante': {
    color: 'bg-green-100 text-green-700 border-green-200',
    hoverColor: 'hover:bg-green-200',
    icon: PhoneIcon,
    iconColor: 'text-green-600'
  },
  'Outro': {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    hoverColor: 'hover:bg-gray-200',
    icon: DocumentTextIcon,
    iconColor: 'text-gray-600'
  }
};

const PRIORITY_COLORS = {
  'Baixa': 'border-l-4 border-l-green-400',
  'Média': 'border-l-4 border-l-yellow-400',
  'Alta': 'border-l-4 border-l-orange-400',
  'Urgente': 'border-l-4 border-l-red-500'
};

function Calendar({ quickActionType, onClearQuickAction }: CalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showForm, setShowForm] = useState(false);
  const [showEventView, setShowEventView] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    client: '',
    processNumber: '',
    lawyer: '',
    type: '',
    priority: '',
    status: ''
  });

  // NOVO: Permission checks
  const { hasPermission } = usePermissionCheck();
  const { isSoloMode, activeTeam } = useTeam();
  
  const canCreate = hasPermission('agenda');
  const canEdit = hasPermission('agenda');
  const canDelete = hasPermission('agenda');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (quickActionType === 'event') {
      if (canCreate) {
        setShowForm(true);
        setSelectedEvent(null);
      } else {
        alert('Você não possui permissão para criar eventos.');
      }
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction, canCreate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const loadedEvents = await firestoreService.getEvents();
      setEvents(loadedEvents);
      console.log(`${loadedEvents.length} eventos carregados`);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const getCalendarDays = () => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'day':
        return [currentDate];
      default:
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { locale: ptBR });
        const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  };

  const calendarDays = getCalendarDays();

  const formatMonthYear = (date: Date) => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(date, { locale: ptBR });
        const weekEnd = endOfWeek(date, { locale: ptBR });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, 'MMMM yyyy', { locale: ptBR });
        } else {
          return `${format(weekStart, 'MMM', { locale: ptBR })} - ${format(weekEnd, 'MMM yyyy', { locale: ptBR })}`;
        }
      case 'day':
        return format(date, 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR });
      default:
        return format(date, 'MMMM yyyy', { locale: ptBR });
    }
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      if (filters.client && !event.client?.toLowerCase().includes(filters.client.toLowerCase())) {
        return false;
      }
      if (filters.processNumber && !event.processNumber?.toLowerCase().includes(filters.processNumber.toLowerCase())) {
        return false;
      }
      if (filters.lawyer && !event.lawyers.some(lawyer => 
        lawyer.toLowerCase().includes(filters.lawyer.toLowerCase())
      )) {
        return false;
      }
      if (filters.type && event.type !== filters.type) {
        return false;
      }
      if (filters.priority && event.priority !== filters.priority) {
        return false;
      }
      if (filters.status && event.status !== filters.status) {
        return false;
      }
      return true;
    });
  };

  const getEventsForDate = (date: Date) => {
    const filteredEvents = getFilteredEvents();
    return filteredEvents.filter(event => 
      isSameDay(new Date(event.date), date)
    );
  };

  const clearFilters = () => {
    setFilters({
      client: '',
      processNumber: '',
      lawyer: '',
      type: '',
      priority: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');

  const uniqueClients = [...new Set(events.map(e => e.client).filter(Boolean))];
  const uniqueProcessNumbers = [...new Set(events.map(e => e.processNumber).filter(Boolean))];
  const uniqueLawyers = [...new Set(events.flatMap(e => e.lawyers))];

  const handleNewEvent = (date?: Date) => {
    if (!canCreate) {
      alert('Você não possui permissão para criar eventos.');
      return;
    }
    
    setSelectedDate(date || null);
    setSelectedEvent(null);
    setShowForm(true);
    setShowEventView(false);
  };

  const handleViewEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventView(true);
    setShowForm(false);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (!canEdit) {
      alert('Você não possui permissão para editar eventos.');
      return;
    }
    
    setSelectedEvent(event);
    setShowForm(true);
    setShowEventView(false);
  };

  const handleSaveEvent = async (eventData: CalendarEvent) => {
    try {
      if (selectedEvent) {
        const updatedEvent = await firestoreService.updateEvent(selectedEvent.id, eventData);
        if (updatedEvent) {
          console.log('Evento atualizado com sucesso');
          await loadEvents();
        }
      } else {
        const newEvent = await firestoreService.saveEvent(eventData);
        if (newEvent) {
          console.log('Novo evento criado com sucesso');
          await loadEvents();
        }
      }
      
      setShowForm(false);
      setShowEventView(false);
      setSelectedEvent(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Erro ao salvar evento. Tente novamente.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!canDelete) {
      alert('Você não possui permissão para excluir eventos.');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        const success = await firestoreService.deleteEvent(eventId);
        if (success) {
          await loadEvents();
          setShowEventView(false);
          setSelectedEvent(null);
        }
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento. Tente novamente.');
      }
    }
  };

  const handleBackToCalendar = () => {
    setShowForm(false);
    setShowEventView(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const navigatePrevious = () => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      default:
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      default:
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (showForm) {
    return (
      <CalendarForm
        event={selectedEvent}
        selectedDate={selectedDate}
        onBack={handleBackToCalendar}
        onSave={handleSaveEvent}
      />
    );
  }

  if (showEventView && selectedEvent) {
    return (
      <EventView
        event={selectedEvent}
        onBack={handleBackToCalendar}
        onEdit={() => handleEditEvent(selectedEvent)}
        onDelete={() => handleDeleteEvent(selectedEvent.id)}
        onUpdate={async (updatedEvent) => {
          setSelectedEvent(updatedEvent);
          await loadEvents();
        }}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600">Gerencie compromissos e eventos</p>
          {/* NOVO: Indicador de contexto */}
          {!isSoloMode && activeTeam && (
            <p className="text-xs text-blue-600 mt-1">
              📅 Visualizando agenda da equipe: {activeTeam.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(f => f !== '').length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleNewEvent()}
            disabled={!canCreate}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canCreate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canCreate ? 'Sem permissão para criar eventos' : 'Criar novo evento'}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* NOVO: Mensagem de permissão */}
      {!canCreate && !isSoloMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ Você possui acesso somente leitura. Não é possível criar ou editar eventos.
          </p>
        </div>
      )}

      {/* Resto do código do calendário permanece igual... */}
      {/* (Incluir todo o JSX do calendário aqui) */}
      
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Carregando eventos...</p>
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Calendar rendering aqui */}
          <p className="text-center py-12 text-gray-500">
            Calendário renderizado com {events.length} eventos
          </p>
        </div>
      )}
    </div>
  );
}

// NOVO: Exportar com guard
import { withPermission } from '../Common/withPermission';

export default withPermission(Calendar, 'agenda', 'any', {
  showMessage: true
});