/**
 * Arquivo de dados mockados - REMOVIDO
 * 
 * Este arquivo foi completamente limpo. Todos os dados mockados foram removidos
 * e substituídos por arrays vazios. O sistema agora utiliza exclusivamente
 * o localStorage para persistência de dados.
 * 
 * IMPORTANTE: Não adicione dados mockados aqui. Use o localStorageService
 * para todas as operações de dados.
 */

import { Process, CalendarEvent, Revenue, Expense, Document, FinancialSummary } from '../types';

// Arrays vazios - dados agora vêm do localStorage
export const mockProcesses: Process[] = [];
export const mockEvents: CalendarEvent[] = [];
export const mockRevenues: Revenue[] = [];
export const mockExpenses: Expense[] = [];
export const mockDocuments: Document[] = [];

// Resumo financeiro vazio - será calculado dinamicamente
export const mockFinancialSummary: FinancialSummary = {
  totalRevenue: 0,
  totalExpenses: 0,
  balance: 0,
  monthlyData: []
};

/**
 * AVISO: Este arquivo foi limpo de todos os dados mockados.
 * 
 * Para adicionar dados de teste, use o console do navegador:
 * 
 * import { localStorageService } from './services/localStorage';
 * 
 * // Exemplo de adição de processo
 * localStorageService.saveProcess({
 *   name: 'Processo Teste',
 *   processNumber: '123456',
 *   client: 'Cliente Teste',
 *   // ... outros campos
 * });
 */