import React from 'react';
import { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentTextIcon, 
  CalendarIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import FinancialCard from './FinancialCard';
import StatsCard from './StatsCard';
import CashFlowChart from './CashFlowChart';
import RecentItems from './RecentItems';
import { firestoreService } from '../../services/firestoreService';
import { Process, CalendarEvent, Document } from '../../types';
import { authService } from '../../services/authService';

export default function Dashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);

  // Obter usuário atual para exibir informações personalizadas
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar todos os dados em paralelo
      const [
        processesData,
        eventsData,
        documentsData,
        financialData
      ] = await Promise.all([
        firestoreService.getProcesses(),
        firestoreService.getEvents(),
        firestoreService.getDocuments(),
        firestoreService.getFinancialSummary()
      ]);
      
      setProcesses(processesData);
      setEvents(eventsData);
      setDocuments(documentsData);
      setFinancialSummary(financialData);
      
      console.log('Dados do dashboard carregados do Firestore:', {
        processes: processesData.length,
        events: eventsData.length,
        documents: documentsData.length,
        financialSummary: financialData
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      // Em caso de erro, manter valores padrão
      setProcesses([]);
      setEvents([]);
      setDocuments([]);
      setFinancialSummary({
        totalRevenue: 0,
        totalExpenses: 0,
        balance: 0,
        monthlyData: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Recarregar dados periodicamente (a cada 2 minutos)
  useEffect(() => {
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeProcesses = processes.filter(p => p.status === 'Em andamento').length;
  const completedProcesses = processes.filter(p => p.status === 'Concluído').length;
  const upcomingEvents = events.filter(e => e.status === 'Pendente').length;
  const recentDocuments = documents.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo{currentUser ? `, ${currentUser.officeName}` : ''}!
        </h1>
        <p className="text-gray-600">Visão geral do seu escritório de advocacia</p>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinancialCard
          title="Receitas do Mês"
          amount={financialSummary.totalRevenue}
          type="revenue"
          change={12.5}
        />
        <FinancialCard
          title="Despesas do Mês"
          amount={financialSummary.totalExpenses}
          type="expense"
          change={-3.2}
        />
        <FinancialCard
          title="Saldo Atual"
          amount={financialSummary.balance}
          type="balance"
          change={18.7}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Processos Ativos"
          value={activeProcesses}
          icon={FolderIcon}
          color="bg-blue-500"
          description="Em andamento"
        />
        <StatsCard
          title="Processos Concluídos"
          value={completedProcesses}
          icon={CheckCircleIcon}
          color="bg-green-500"
          description="Este mês"
        />
        <StatsCard
          title="Próximos Compromissos"
          value={upcomingEvents}
          icon={CalendarIcon}
          color="bg-amber-500"
          description="Próximos 7 dias"
        />
        <StatsCard
          title="Documentos Emitidos"
          value={recentDocuments}
          icon={DocumentTextIcon}
          color="bg-purple-500"
          description="Este mês"
        />
      </div>

      {/* Charts and Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart data={financialSummary.monthlyData} />
        <div className="space-y-6">
          <RecentItems
            title="Próximos Compromissos"
            items={events.filter(e => e.status === 'Pendente').slice(0, 5)}
            type="events"
          />
          <RecentItems
            title="Documentos Recentes"
            items={documents.slice(0, 5)}
            type="documents"
          />
        </div>
      </div>
    </div>
  );
}