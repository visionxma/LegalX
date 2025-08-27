import React, { useState, useEffect } from 'react';
import { 
  DocumentChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  FolderIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { firestoreService } from '../../services/firestoreService';
import { Process, CalendarEvent } from '../../types';
import jsPDF from 'jspdf';

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0,
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const [loadedProcesses, loadedEvents, loadedFinancialSummary] = await Promise.all([
        firestoreService.getProcesses(),
        firestoreService.getEvents(),
        firestoreService.getFinancialSummary()
      ]);
      
      setProcesses(loadedProcesses);
      setEvents(loadedEvents);
      setFinancialSummary(loadedFinancialSummary);
      
      console.log('Dados do relatório carregados');
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Financial data
  const totalRevenue = financialSummary.totalRevenue;
  const totalExpenses = financialSummary.totalExpenses;
  const netProfit = totalRevenue - totalExpenses;
  
  // Process data
  const activeProcesses = processes.filter(p => p.status === 'Em andamento').length;
  const completedProcesses = processes.filter(p => p.status === 'Concluído').length;
  
  // Events data
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'Concluído').length;
  
  // Chart data
  const processStatusData = [
    { name: 'Em andamento', value: activeProcesses, color: '#f59e0b' },
    { name: 'Concluídos', value: completedProcesses, color: '#10b981' }
  ];
  
  const monthlyFinancialData = financialSummary.monthlyData.map(item => ({
    ...item,
    profit: item.revenue - item.expenses
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Cores da identidade visual
    const primaryBlue = [37, 99, 235]; // #2563eb
    const accentAmber = [245, 158, 11]; // #f59e0b
    const darkGray = [55, 65, 81]; // #374151
    const lightGray = [156, 163, 175]; // #9ca3af
    const successGreen = [34, 197, 94]; // #22c55e
    const dangerRed = [239, 68, 68]; // #ef4444
    
    // Header com logo e identidade visual
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 25, 'F');
    
    // Logo LegalX
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Legal', 20, 17);
    doc.setTextColor(...accentAmber);
    doc.text('X', 50, 17);
    
    // Subtítulo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Gestão Jurídica', 20, 22);
    
    // Título do documento
    doc.setTextColor(...darkGray);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO FINANCEIRO E OPERACIONAL', 105, 45, { align: 'center' });
    
    // Linha decorativa
    doc.setDrawColor(...accentAmber);
    doc.setLineWidth(2);
    doc.line(20, 50, 190, 50);
    
    doc.setTextColor(...lightGray);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${selectedPeriod === 'month' ? 'Mês Atual' : selectedPeriod === 'quarter' ? 'Trimestre' : 'Ano'}`, 105, 55, { align: 'center' });
    
    let yPosition = 70;
    
    // Resumo Financeiro com boxes coloridos
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO FINANCEIRO', 20, yPosition);
    yPosition += 15;
    
    // Box para receitas
    doc.setFillColor(240, 253, 244); // bg-green-50
    doc.setDrawColor(...successGreen);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPosition - 5, 170, 12, 2, 2, 'FD');
    
    doc.setTextColor(...successGreen);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`✓ Total de Receitas: ${formatCurrency(totalRevenue)}`, 25, yPosition + 3);
    yPosition += 10;
    
    // Box para despesas
    doc.setFillColor(254, 242, 242); // bg-red-50
    doc.setDrawColor(...dangerRed);
    doc.roundedRect(20, yPosition - 5, 170, 12, 2, 2, 'FD');
    
    doc.setTextColor(...dangerRed);
    doc.text(`✗ Total de Despesas: ${formatCurrency(totalExpenses)}`, 25, yPosition + 3);
    yPosition += 10;
    
    // Box para lucro líquido
    const profitColor = netProfit >= 0 ? successGreen : dangerRed;
    const profitBg = netProfit >= 0 ? [240, 253, 244] : [254, 242, 242];
    doc.setFillColor(...profitBg);
    doc.setDrawColor(...profitColor);
    doc.setLineWidth(1);
    doc.roundedRect(20, yPosition - 5, 170, 12, 2, 2, 'FD');
    
    doc.setTextColor(...profitColor);
    doc.setFont(undefined, 'bold');
    doc.text(`${netProfit >= 0 ? '↗' : '↘'} Lucro Líquido: ${formatCurrency(netProfit)}`, 25, yPosition + 3);
    yPosition += 20;
    
    // Resumo de Processos
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO DE PROCESSOS', 20, yPosition);
    yPosition += 15;
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`• Processos em Andamento: ${activeProcesses}`, 25, yPosition);
    yPosition += 10;
    doc.text(`• Processos Concluídos: ${completedProcesses}`, 25, yPosition);
    yPosition += 10;
    doc.text(`• Total de Processos: ${activeProcesses + completedProcesses}`, 25, yPosition);
    yPosition += 20;
    
    // Resumo de Eventos
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO DE EVENTOS', 20, yPosition);
    yPosition += 15;
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`• Total de Eventos: ${totalEvents}`, 25, yPosition);
    yPosition += 10;
    doc.text(`• Eventos Concluídos: ${completedEvents}`, 25, yPosition);
    yPosition += 10;
    doc.text(`• Taxa de Conclusão: ${totalEvents > 0 ? ((completedEvents / totalEvents) * 100).toFixed(1) : 0}%`, 25, yPosition);
    
    // Footer com informações do sistema
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(20, 280, 190, 280);
    
    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Relatório gerado pelo LegalX - Sistema de Gestão Jurídica', 20, 285);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 290);
    
    // Número da página
    doc.text('Página 1 de 1', 190, 290, { align: 'right' });
    
    doc.save(`relatorio_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6">
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando dados do relatório...</p>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Análise completa dos dados do escritório</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Mês Atual</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Ano</option>
          </select>
          <button
            onClick={generatePDFReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-green-100 text-sm">Receitas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-red-100 text-sm">Despesas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <FolderIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-blue-100 text-sm">Processos Ativos</p>
              <p className="text-2xl font-bold">{activeProcesses}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3" />
            <div>
              <p className="text-purple-100 text-sm">Eventos do Mês</p>
              <p className="text-2xl font-bold">{totalEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Financial Flow Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fluxo Financeiro Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyFinancialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Despesas" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Process Status Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Processos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {processStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Financeira</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Receita Bruta</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Despesas Totais</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
              <span className="text-gray-900 font-medium">Lucro Líquido</span>
              <span className="font-bold text-blue-600">{formatCurrency(netProfit)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Margem de Lucro</span>
              <span className="font-semibold">{((netProfit / totalRevenue) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Operational Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Operacional</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Total de Processos</span>
              <span className="font-semibold">{activeProcesses + completedProcesses}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Processos Concluídos</span>
              <span className="font-semibold text-green-600">{completedProcesses}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Taxa de Conclusão</span>
              <span className="font-semibold">{((completedProcesses / (activeProcesses + completedProcesses)) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Eventos Realizados</span>
              <span className="font-semibold">{completedEvents}/{totalEvents}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}