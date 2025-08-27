/**
 * Componente de Configurações do Sistema
 * 
 * Fornece interface para gerenciamento de dados, backup/restauração
 * e configurações gerais do sistema LegalX.
 */

import React, { useState, useEffect } from 'react';
import { 
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { firestoreService } from '../../services/firestoreService';
import { auth } from '../../firebase.config';

export default function Settings() {
  const [stats, setStats] = useState<any>(null);
  const [financialStats, setFinancialStats] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      // Carregar estatísticas gerais e financeiras em paralelo
      const [generalStats, financialSummary] = await Promise.all([
        firestoreService.getGeneralStats(),
        firestoreService.getFinancialSummary()
      ]);
      
      setStats(generalStats);
      setFinancialStats(financialSummary);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats(null);
      setFinancialStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleValidateData = async () => {
    setLoading(true);
    try {
      // Executar validação básica dos dados
      const [processes, events, revenues, expenses, lawyers, employees] = await Promise.all([
        firestoreService.getProcesses(),
        firestoreService.getEvents(),
        firestoreService.getRevenues(),
        firestoreService.getExpenses(),
        firestoreService.getLawyers(),
        firestoreService.getEmployees()
      ]);

      const errors: string[] = [];
      let isValid = true;

      // Validar processos
      processes.forEach((process, index) => {
        if (!process.processNumber) {
          errors.push(`Processo ${index + 1}: Número do processo ausente`);
          isValid = false;
        }
        if (!process.client) {
          errors.push(`Processo ${index + 1}: Cliente ausente`);
          isValid = false;
        }
      });

      // Validar eventos
      events.forEach((event, index) => {
        if (!event.title) {
          errors.push(`Evento ${index + 1}: Título ausente`);
          isValid = false;
        }
        if (!event.date) {
          errors.push(`Evento ${index + 1}: Data ausente`);
          isValid = false;
        }
      });

      // Validar receitas
      revenues.forEach((revenue, index) => {
        if (!revenue.source) {
          errors.push(`Receita ${index + 1}: Fonte ausente`);
          isValid = false;
        }
        if (revenue.amount <= 0) {
          errors.push(`Receita ${index + 1}: Valor inválido`);
          isValid = false;
        }
      });

      // Validar despesas
      expenses.forEach((expense, index) => {
        if (!expense.type) {
          errors.push(`Despesa ${index + 1}: Tipo ausente`);
          isValid = false;
        }
        if (expense.amount <= 0) {
          errors.push(`Despesa ${index + 1}: Valor inválido`);
          isValid = false;
        }
      });

      // Validar advogados
      lawyers.forEach((lawyer, index) => {
        if (!lawyer.oab) {
          errors.push(`Advogado ${index + 1}: OAB ausente`);
          isValid = false;
        }
        if (!lawyer.fullName) {
          errors.push(`Advogado ${index + 1}: Nome completo ausente`);
          isValid = false;
        }
      });

      // Validar colaboradores
      employees.forEach((employee, index) => {
        if (!employee.fullName) {
          errors.push(`Colaborador ${index + 1}: Nome completo ausente`);
          isValid = false;
        }
        if (!employee.position) {
          errors.push(`Colaborador ${index + 1}: Cargo ausente`);
          isValid = false;
        }
      });

      setValidationResult({
        isValid,
        errors,
        summary: {
          totalProcesses: processes.length,
          totalEvents: events.length,
          totalRevenues: revenues.length,
          totalExpenses: expenses.length,
          totalLawyers: lawyers.length,
          totalEmployees: employees.length
        }
      });

    } catch (error) {
      console.error('Erro ao validar dados:', error);
      setValidationResult({
        isValid: false,
        errors: ['Erro ao acessar os dados para validação'],
        summary: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os dados
      const [processes, events, revenues, expenses, documents, lawyers, employees] = await Promise.all([
        firestoreService.getProcesses(),
        firestoreService.getEvents(),
        firestoreService.getRevenues(),
        firestoreService.getExpenses(),
        firestoreService.getDocuments(),
        firestoreService.getLawyers(),
        firestoreService.getEmployees()
      ]);

      // Criar objeto de backup
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: auth.currentUser?.uid,
        data: {
          processes,
          events,
          revenues,
          expenses,
          documents,
          lawyers,
          employees
        }
      };

      // Criar e fazer download do arquivo
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `legalx_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Backup criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      alert('Erro ao criar backup. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validar estrutura do backup
      if (!backupData.data || !backupData.version) {
        throw new Error('Arquivo de backup inválido');
      }

      const confirmMessage = `
Esta ação irá substituir todos os dados atuais pelos dados do backup.
Backup criado em: ${new Date(backupData.timestamp).toLocaleString('pt-BR')}

Deseja continuar?
      `.trim();

      if (!confirm(confirmMessage)) {
        return;
      }

      // Restaurar dados (isso é uma operação complexa que requer cuidado)
      alert('Funcionalidade de restauração em desenvolvimento. Por segurança, esta operação requer implementação adicional para evitar perda de dados.');
      
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      alert('Erro ao importar backup. Verifique se o arquivo está correto.');
    } finally {
      setLoading(false);
      // Limpar o input
      event.target.value = '';
    }
  };

  const handleClearAllData = async () => {
    const confirmMessage = `
⚠️ ATENÇÃO: Esta ação irá excluir TODOS os seus dados permanentemente!

Isso inclui:
- Todos os processos
- Todos os eventos da agenda
- Todas as receitas e despesas
- Todos os documentos
- Todos os advogados e colaboradores

Esta ação NÃO PODE ser desfeita!

Digite "CONFIRMAR EXCLUSÃO" para prosseguir:
    `.trim();

    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'CONFIRMAR EXCLUSÃO') {
      alert('Operação cancelada.');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar todos os dados para exclusão
      const [processes, events, revenues, expenses, documents, lawyers, employees] = await Promise.all([
        firestoreService.getProcesses(),
        firestoreService.getEvents(),
        firestoreService.getRevenues(),
        firestoreService.getExpenses(),
        firestoreService.getDocuments(),
        firestoreService.getLawyers(),
        firestoreService.getEmployees()
      ]);

      // Excluir todos os dados em paralelo
      const deletePromises = [
        ...processes.map(p => firestoreService.deleteProcess(p.id)),
        ...events.map(e => firestoreService.deleteEvent(e.id)),
        ...revenues.map(r => firestoreService.deleteRevenue(r.id)),
        ...expenses.map(e => firestoreService.deleteExpense(e.id)),
        ...documents.map(d => firestoreService.deleteDocument(d.id)),
        ...lawyers.map(l => firestoreService.deleteLawyer(l.id)),
        ...employees.map(e => firestoreService.deleteEmployee(e.id))
      ];

      await Promise.all(deletePromises);
      
      // Recarregar estatísticas
      await loadStats();
      
      alert('Todos os dados foram excluídos com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      alert('Erro ao limpar dados. Alguns dados podem não ter sido excluídos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleData = async () => {
    if (!confirm('Deseja criar dados de exemplo? Isso adicionará dados fictícios ao sistema.')) {
      return;
    }

    try {
      setLoading(true);

      // Criar dados de exemplo
      const sampleLawyer = await firestoreService.saveLawyer({
        fullName: 'Dr. João Silva Santos',
        oab: 'SP123456',
        email: 'joao.silva@exemplo.com',
        phone: '(11) 99999-9999',
        specialties: ['Direito Civil', 'Direito Empresarial'],
        status: 'Ativo'
      });

      const sampleEmployee = await firestoreService.saveEmployee({
        fullName: 'Maria Oliveira',
        position: 'Secretária',
        email: 'maria.oliveira@exemplo.com',
        phone: '(11) 88888-8888',
        status: 'Ativo'
      });

      const sampleProcess = await firestoreService.saveProcess({
        processNumber: '1234567-89.2024.8.26.0001',
        client: 'Empresa ABC Ltda',
        description: 'Ação de cobrança contra fornecedor',
        status: 'Em andamento',
        court: 'Vara Cível Central',
        responsibleLawyers: sampleLawyer ? [sampleLawyer.fullName] : [],
        value: 50000,
        area: 'Direito Empresarial'
      });

      await firestoreService.saveEvent({
        title: 'Audiência de Conciliação',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        type: 'Audiência',
        client: 'Empresa ABC Ltda',
        processNumber: '1234567-89.2024.8.26.0001',
        lawyers: sampleLawyer ? [sampleLawyer.fullName] : [],
        location: 'Fórum Central',
        priority: 'Alta',
        status: 'Pendente'
      });

      await firestoreService.saveRevenue({
        date: new Date().toISOString().split('T')[0],
        amount: 15000,
        source: 'Empresa ABC Ltda',
        category: 'Honorário',
        client: 'Empresa ABC Ltda',
        responsibleLawyers: sampleLawyer ? [sampleLawyer.fullName] : [],
        description: 'Honorários advocatícios - entrada do processo'
      });

      await firestoreService.saveExpense({
        date: new Date().toISOString().split('T')[0],
        amount: 1200,
        type: 'Aluguel do escritório',
        category: 'Aluguel',
        description: 'Aluguel mensal do escritório',
        responsibleMembers: sampleEmployee ? [sampleEmployee.fullName] : []
      });

      // Recarregar estatísticas
      await loadStats();
      
      alert('Dados de exemplo criados com sucesso!');
    } catch (error) {
      console.error('Erro ao criar dados de exemplo:', error);
      alert('Erro ao criar dados de exemplo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600">Gerencie dados, backup e configurações gerais</p>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Estatísticas do Sistema
          </h3>
          
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-2">Carregando estatísticas...</p>
            </div>
          ) : stats && financialStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-600">Processos</p>
                  <p className="text-xl font-bold text-blue-700">{stats.totalProcesses}</p>
                  <p className="text-xs text-blue-500">
                    {stats.activeProcesses} ativos, {stats.completedProcesses} concluídos
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Eventos</p>
                  <p className="text-xl font-bold text-green-700">{stats.totalEvents}</p>
                  <p className="text-xs text-green-500">
                    {stats.pendingEvents} pendentes, {stats.completedEvents} concluídos
                  </p>
                </div>
                
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-sm text-purple-600">Receitas</p>
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(financialStats.totalRevenue)}</p>
                </div>
                
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm text-red-600">Despesas</p>
                  <p className="text-lg font-bold text-red-700">{formatCurrency(financialStats.totalExpenses)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Documentos</p>
                  <p className="text-lg font-bold text-gray-700">{stats.totalDocuments}</p>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded">
                  <p className="text-sm text-indigo-600">Equipe</p>
                  <p className="text-lg font-bold text-indigo-700">{stats.totalLawyers + stats.totalEmployees}</p>
                  <p className="text-xs text-indigo-500">
                    {stats.activeLawyers} advogados, {stats.activeEmployees} colaboradores
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Armazenamento (Firestore)</p>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: "5%" }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs text-gray-500">
                    Ilimitado (Cloud Firestore)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-red-500">Erro ao carregar estatísticas</p>
          )}
        </div>

        {/* Data Validation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Validação de Dados
          </h3>
          
          <div className="space-y-4">
            <button
              onClick={handleValidateData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Validando...' : 'Validar Integridade dos Dados'}
            </button>
            
            {validationResult && (
              <div className={`p-4 rounded-lg ${
                validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  {validationResult.isValid ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${
                    validationResult.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {validationResult.isValid ? 'Dados íntegros' : 'Problemas encontrados'}
                  </span>
                </div>
                
                {validationResult.summary && (
                  <div className="text-xs text-gray-600 mb-2">
                    Analisados: {validationResult.summary.totalProcesses} processos, {' '}
                    {validationResult.summary.totalEvents} eventos, {' '}
                    {validationResult.summary.totalRevenues} receitas, {' '}
                    {validationResult.summary.totalExpenses} despesas
                  </div>
                )}
                
                {validationResult.errors.length > 0 && (
                  <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Backup & Restore */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup e Restauração</h3>
          
          <div className="space-y-4">
            <button
              onClick={handleExportBackup}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              {loading ? 'Criando Backup...' : 'Fazer Backup dos Dados'}
            </button>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurar Backup
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecione um arquivo de backup (.json) para restaurar
              </p>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciamento de Dados</h3>
          
          <div className="space-y-4">
            <button
              onClick={handleCreateSampleData}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
              {loading ? 'Criando...' : 'Criar Dados de Exemplo'}
            </button>
            
            <div className="border-t pt-4">
              <button
                onClick={handleClearAllData}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                {loading ? 'Limpando...' : 'Limpar Todos os Dados'}
              </button>
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Instruções de Uso</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Backup:</strong> Recomendamos fazer backup regularmente dos seus dados. Os dados são exportados em formato JSON.</p>
          <p><strong>Validação:</strong> Execute a validação periodicamente para garantir a integridade dos dados no Firestore.</p>
          <p><strong>Armazenamento:</strong> Os dados são salvos no Cloud Firestore com isolamento por usuário.</p>
          <p><strong>Dados de Exemplo:</strong> Use para testar o sistema com dados fictícios (advogado, colaborador, processo, evento, receita e despesa).</p>
          <p><strong>Segurança:</strong> Todos os dados são associados ao seu usuário autenticado e não são visíveis a outros usuários.</p>
        </div>
      </div>
    </div>
  );
}