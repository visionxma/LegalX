import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../types';
import { firestoreService } from '../../services/firestoreService';
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

// Configuração de tipos de evento com cores e ícones
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

export default function Calendar({ quickActionType, onClearQuickAction }: CalendarProps) {
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

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (quickActionType === 'event') {
      setShowForm(true);
      setSelectedEvent(null);
      onClearQuickAction();
    }
  }, [quickActionType, onClearQuickAction]);

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
  
  // Calcular dias baseado no modo de visualização
  const getCalendarDays = () => {
    switch (viewMode) {
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'day':
        return [currentDate];
      default: // month
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        // Incluir dias da semana anterior e posterior para completar o grid
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

  // Função para filtrar eventos
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

  // Obter listas únicas para os filtros
  const uniqueClients = [...new Set(events.map(e => e.client).filter(Boolean))];
  const uniqueProcessNumbers = [...new Set(events.map(e => e.processNumber).filter(Boolean))];
  const uniqueLawyers = [...new Set(events.flatMap(e => e.lawyers))];

  const handleNewEvent = (date?: Date) => {
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
    setSelectedEvent(event);
    setShowForm(true);
    setShowEventView(false);
  };

  const handleSaveEvent = async (eventData: CalendarEvent) => {
    try {
      if (selectedEvent) {
        // Atualizar evento existente
        const updatedEvent = await firestoreService.updateEvent(selectedEvent.id, eventData);
        if (updatedEvent) {
          console.log('Evento atualizado com sucesso');
          await loadEvents(); // Recarregar eventos
        }
      } else {
        // Criar novo evento
        const newEvent = await firestoreService.saveEvent(eventData);
        if (newEvent) {
          console.log('Novo evento criado com sucesso');
          await loadEvents(); // Recarregar eventos
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
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        const success = await firestoreService.deleteEvent(eventId);
        if (success) {
          await loadEvents(); // Recarregar eventos
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
      default: // month
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
      default: // month
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
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Inteligentes</h3>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
                >
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  Limpar Filtros
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={filters.client}
                onChange={(e) => setFilters({...filters, client: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os clientes</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Número do Processo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número do Processo
              </label>
              <select
                value={filters.processNumber}
                onChange={(e) => setFilters({...filters, processNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os processos</option>
                {uniqueProcessNumbers.map(processNumber => (
                  <option key={processNumber} value={processNumber}>{processNumber}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Advogado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advogado Responsável
              </label>
              <select
                value={filters.lawyer}
                onChange={(e) => setFilters({...filters, lawyer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os advogados</option>
                {uniqueLawyers.map(lawyer => (
                  <option key={lawyer} value={lawyer}>{lawyer}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Evento
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os tipos</option>
                {Object.keys(EVENT_TYPES).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as prioridades</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Legenda de Tipos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Legenda de Tipos de Evento</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(EVENT_TYPES).map(([type, config]) => {
            const IconComponent = config.icon;
            return (
              <div key={type} className="flex items-center space-x-2">
                <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
                <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
                  {type}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'day'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Dia
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={navigatePrevious}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Hoje
          </button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {formatMonthYear(currentDate)}
          </h2>
          <button
            onClick={navigateNext}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Carregando eventos...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Calendar Grid */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 bg-gray-50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-32 p-2 group ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        <button
                          onClick={() => handleNewEvent(day)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all"
                          title="Adicionar evento"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const eventConfig = EVENT_TYPES[event.type] || EVENT_TYPES['Outro'];
                          const IconComponent = eventConfig.icon;
                          const priorityClass = event.priority ? PRIORITY_COLORS[event.priority] : '';
                          
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-2 rounded border cursor-pointer group ${eventConfig.color} ${eventConfig.hoverColor} ${priorityClass}`}
                              title={`${event.title} - ${event.time}`}
                              onClick={() => handleViewEvent(event)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1 flex-1 min-w-0">
                                  <IconComponent className={`w-3 h-3 ${eventConfig.iconColor} flex-shrink-0`} />
                                  <span className="truncate font-medium">{event.title}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewEvent(event);
                                    }}
                                    className={`${eventConfig.iconColor} hover:opacity-75`}
                                  >
                                    <EyeIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditEvent(event);
                                    }}
                                    className={`${eventConfig.iconColor} hover:opacity-75`}
                                  >
                                    <PencilIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs opacity-75">
                                {event.time}
                                {event.client && (
                                  <span className="ml-1">• {event.client}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 bg-gray-50">
                {calendarDays.map(day => (
                  <div key={day.toISOString()} className="p-4 text-center">
                    <div className="text-sm font-medium text-gray-500">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={`text-lg font-semibold mt-1 ${
                      isSameDay(day, new Date())
                        ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                        : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7 divide-x divide-gray-200 min-h-96">
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-3 group ${
                        isToday ? 'bg-blue-50' : 'bg-white'
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => handleNewEvent(day)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all"
                          title="Adicionar evento"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {dayEvents.map(event => {
                          const eventConfig = EVENT_TYPES[event.type] || EVENT_TYPES['Outro'];
                          const IconComponent = eventConfig.icon;
                          const priorityClass = event.priority ? PRIORITY_COLORS[event.priority] : '';
                          
                          return (
                            <div
                              key={event.id}
                              className={`text-sm p-2 rounded border cursor-pointer group ${eventConfig.color} ${eventConfig.hoverColor} ${priorityClass}`}
                              title={`${event.title} - ${event.time}`}
                              onClick={() => handleViewEvent(event)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1 flex-1 min-w-0">
                                  <IconComponent className={`w-3 h-3 ${eventConfig.iconColor} flex-shrink-0`} />
                                  <span className="truncate font-medium">{event.title}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewEvent(event);
                                    }}
                                    className={`${eventConfig.iconColor} hover:opacity-75`}
                                  >
                                    <EyeIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditEvent(event);
                                    }}
                                    className={`${eventConfig.iconColor} hover:opacity-75`}
                                  >
                                    <PencilIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteEvent(event.id);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <TrashIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs opacity-75">
                                {event.time}
                                {event.client && (
                                  <span className="ml-1">• {event.client}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Day Header */}
              <div className="bg-gray-50 p-6 text-center border-b">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {format(currentDate, 'EEEE', { locale: ptBR })}
                </div>
                <div className={`text-2xl font-bold ${
                  isSameDay(currentDate, new Date())
                    ? 'text-blue-600'
                    : 'text-gray-900'
                }`}>
                  {format(currentDate, 'd \'de\' MMMM', { locale: ptBR })}
                </div>
                <button
                  onClick={() => handleNewEvent(currentDate)}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Novo Evento
                </button>
              </div>

              {/* Day Events */}
              <div className="p-6">
                {(() => {
                  const dayEvents = getEventsForDate(currentDate).sort((a, b) => a.time.localeCompare(b.time));
                  
                  if (dayEvents.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum evento agendado para este dia</p>
                        <button
                          onClick={() => handleNewEvent(currentDate)}
                          className="mt-4 text-blue-600 hover:text-blue-800"
                        >
                          Adicionar primeiro evento
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {dayEvents.map(event => {
                        const eventConfig = EVENT_TYPES[event.type] || EVENT_TYPES['Outro'];
                        const IconComponent = eventConfig.icon;
                        const priorityClass = event.priority ? PRIORITY_COLORS[event.priority] : '';
                        
                        return (
                          <div
                            key={event.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer group ${eventConfig.color} ${eventConfig.hoverColor} ${priorityClass}`}
                            onClick={() => handleViewEvent(event)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <IconComponent className={`w-6 h-6 ${eventConfig.iconColor} flex-shrink-0 mt-1`} />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {event.title}
                                  </h3>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                    <span className="font-medium">{event.time}</span>
                                    {event.client && (
                                      <span>Cliente: {event.client}</span>
                                    )}
                                    {event.location && (
                                      <span>Local: {event.location}</span>
                                    )}
                                  </div>
                                  {event.notes && (
                                    <p className="text-sm text-gray-700 mt-2">
                                      {event.notes}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-3">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      event.status === 'Concluído'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {event.status}
                                    </span>
                                    {event.priority && (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[event.priority]}`}>
                                        {event.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 flex space-x-2 ml-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewEvent(event);
                                  }}
                                  className={`p-2 ${eventConfig.iconColor} hover:opacity-75 rounded-lg hover:bg-white`}
                                  title="Visualizar"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditEvent(event);
                                  }}
                                  className={`p-2 ${eventConfig.iconColor} hover:opacity-75 rounded-lg hover:bg-white`}
                                  title="Editar"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(event.id);
                                  }}
                                  className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-white"
                                  title="Excluir"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}