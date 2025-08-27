/**
 * Serviço de Armazenamento Local para LegalX
 * 
 * Este serviço gerencia toda a persistência de dados no localStorage do navegador.
 * Fornece métodos para CRUD (Create, Read, Update, Delete) de todas as entidades
 * do sistema: Processos, Eventos, Receitas, Despesas e Documentos.
 */

import { Process, CalendarEvent, Revenue, Expense, Document } from '../types';
import { Lawyer, Employee } from '../types';

// Chaves para o localStorage
const STORAGE_KEYS = {
  PROCESSES: 'legalx_processes',
  EVENTS: 'legalx_events',
  REVENUES: 'legalx_revenues',
  EXPENSES: 'legalx_expenses',
  DOCUMENTS: 'legalx_documents',
  LAWYERS: 'legalx_lawyers',
  EMPLOYEES: 'legalx_employees',
  SETTINGS: 'legalx_settings'
} as const;

/**
 * Classe principal para gerenciamento do armazenamento local
 */
class LocalStorageService {
  
  /**
   * Métodos genéricos para manipulação do localStorage
   */
  private getItem<T>(key: string): T[] {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(`Erro ao recuperar dados do localStorage (${key}):`, error);
      return [];
    }
  }

  private setItem<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Erro ao salvar dados no localStorage (${key}):`, error);
      throw new Error(`Falha ao salvar dados: ${error}`);
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * PROCESSOS - Métodos CRUD
   */
  
  // Buscar todos os processos
  getProcesses(): Process[] {
    return this.getItem<Process>(STORAGE_KEYS.PROCESSES);
  }

  // Buscar processo por ID
  getProcessById(id: string): Process | null {
    const processes = this.getProcesses();
    return processes.find(process => process.id === id) || null;
  }

  // Salvar novo processo
  saveProcess(process: Omit<Process, 'id' | 'createdAt'>): Process {
    const processes = this.getProcesses();
    const newProcess: Process = {
      ...process,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    processes.push(newProcess);
    this.setItem(STORAGE_KEYS.PROCESSES, processes);
    
    console.log('Processo salvo:', newProcess.name);
    return newProcess;
  }

  // Atualizar processo existente
  updateProcess(id: string, updatedProcess: Partial<Process>): Process | null {
    const processes = this.getProcesses();
    const index = processes.findIndex(process => process.id === id);
    
    if (index === -1) {
      console.error('Processo não encontrado para atualização:', id);
      return null;
    }

    processes[index] = { ...processes[index], ...updatedProcess };
    this.setItem(STORAGE_KEYS.PROCESSES, processes);
    
    console.log('Processo atualizado:', processes[index].name);
    return processes[index];
  }

  // Excluir processo
  deleteProcess(id: string): boolean {
    const processes = this.getProcesses();
    const filteredProcesses = processes.filter(process => process.id !== id);
    
    if (filteredProcesses.length === processes.length) {
      console.error('Processo não encontrado para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.PROCESSES, filteredProcesses);
    console.log('Processo excluído:', id);
    return true;
  }

  /**
   * EVENTOS DA AGENDA - Métodos CRUD
   */
  
  getEvents(): CalendarEvent[] {
    return this.getItem<CalendarEvent>(STORAGE_KEYS.EVENTS);
  }

  getEventById(id: string): CalendarEvent | null {
    const events = this.getEvents();
    return events.find(event => event.id === id) || null;
  }

  saveEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const events = this.getEvents();
    const newEvent: CalendarEvent = {
      ...event,
      id: this.generateId()
    };
    
    events.push(newEvent);
    this.setItem(STORAGE_KEYS.EVENTS, events);
    
    console.log('Evento salvo:', newEvent.title);
    return newEvent;
  }

  updateEvent(id: string, updatedEvent: Partial<CalendarEvent>): CalendarEvent | null {
    const events = this.getEvents();
    const index = events.findIndex(event => event.id === id);
    
    if (index === -1) {
      console.error('Evento não encontrado para atualização:', id);
      return null;
    }

    events[index] = { ...events[index], ...updatedEvent };
    this.setItem(STORAGE_KEYS.EVENTS, events);
    
    console.log('Evento atualizado:', events[index].title);
    return events[index];
  }

  deleteEvent(id: string): boolean {
    const events = this.getEvents();
    const filteredEvents = events.filter(event => event.id !== id);
    
    if (filteredEvents.length === events.length) {
      console.error('Evento não encontrado para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.EVENTS, filteredEvents);
    console.log('Evento excluído:', id);
    return true;
  }

  /**
   * RECEITAS - Métodos CRUD
   */
  
  getRevenues(): Revenue[] {
    return this.getItem<Revenue>(STORAGE_KEYS.REVENUES);
  }

  getRevenueById(id: string): Revenue | null {
    const revenues = this.getRevenues();
    return revenues.find(revenue => revenue.id === id) || null;
  }

  saveRevenue(revenue: Omit<Revenue, 'id'>): Revenue {
    const revenues = this.getRevenues();
    const newRevenue: Revenue = {
      ...revenue,
      id: this.generateId()
    };
    
    revenues.push(newRevenue);
    this.setItem(STORAGE_KEYS.REVENUES, revenues);
    
    console.log('Receita salva:', newRevenue.source, '-', newRevenue.amount);
    return newRevenue;
  }

  updateRevenue(id: string, updatedRevenue: Partial<Revenue>): Revenue | null {
    const revenues = this.getRevenues();
    const index = revenues.findIndex(revenue => revenue.id === id);
    
    if (index === -1) {
      console.error('Receita não encontrada para atualização:', id);
      return null;
    }

    revenues[index] = { ...revenues[index], ...updatedRevenue };
    this.setItem(STORAGE_KEYS.REVENUES, revenues);
    
    console.log('Receita atualizada:', revenues[index].source);
    return revenues[index];
  }

  deleteRevenue(id: string): boolean {
    const revenues = this.getRevenues();
    const filteredRevenues = revenues.filter(revenue => revenue.id !== id);
    
    if (filteredRevenues.length === revenues.length) {
      console.error('Receita não encontrada para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.REVENUES, filteredRevenues);
    console.log('Receita excluída:', id);
    return true;
  }

  /**
   * DESPESAS - Métodos CRUD
   */
  
  getExpenses(): Expense[] {
    return this.getItem<Expense>(STORAGE_KEYS.EXPENSES);
  }

  getExpenseById(id: string): Expense | null {
    const expenses = this.getExpenses();
    return expenses.find(expense => expense.id === id) || null;
  }

  saveExpense(expense: Omit<Expense, 'id'>): Expense {
    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: this.generateId()
    };
    
    expenses.push(newExpense);
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    
    console.log('Despesa salva:', newExpense.type, '-', newExpense.amount);
    return newExpense;
  }

  updateExpense(id: string, updatedExpense: Partial<Expense>): Expense | null {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(expense => expense.id === id);
    
    if (index === -1) {
      console.error('Despesa não encontrada para atualização:', id);
      return null;
    }

    expenses[index] = { ...expenses[index], ...updatedExpense };
    this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    
    console.log('Despesa atualizada:', expenses[index].type);
    return expenses[index];
  }

  deleteExpense(id: string): boolean {
    const expenses = this.getExpenses();
    const filteredExpenses = expenses.filter(expense => expense.id !== id);
    
    if (filteredExpenses.length === expenses.length) {
      console.error('Despesa não encontrada para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.EXPENSES, filteredExpenses);
    console.log('Despesa excluída:', id);
    return true;
  }

  /**
   * DOCUMENTOS - Métodos CRUD
   */
  
  getDocuments(): Document[] {
    return this.getItem<Document>(STORAGE_KEYS.DOCUMENTS);
  }

  getDocumentById(id: string): Document | null {
    const documents = this.getDocuments();
    return documents.find(document => document.id === id) || null;
  }

  saveDocument(document: Omit<Document, 'id' | 'createdAt'>): Document {
    const documents = this.getDocuments();
    const newDocument: Document = {
      ...document,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    documents.push(newDocument);
    this.setItem(STORAGE_KEYS.DOCUMENTS, documents);
    
    console.log('Documento salvo:', newDocument.type, '-', newDocument.client);
    return newDocument;
  }

  updateDocument(id: string, updatedDocument: Partial<Document>): Document | null {
    const documents = this.getDocuments();
    const index = documents.findIndex(document => document.id === id);
    
    if (index === -1) {
      console.error('Documento não encontrado para atualização:', id);
      return null;
    }

    documents[index] = { ...documents[index], ...updatedDocument };
    this.setItem(STORAGE_KEYS.DOCUMENTS, documents);
    
    console.log('Documento atualizado:', documents[index].type);
    return documents[index];
  }

  deleteDocument(id: string): boolean {
    const documents = this.getDocuments();
    const filteredDocuments = documents.filter(document => document.id !== id);
    
    if (filteredDocuments.length === documents.length) {
      console.error('Documento não encontrado para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.DOCUMENTS, filteredDocuments);
    console.log('Documento excluído:', id);
    return true;
  }

  /**
   * ADVOGADOS - Métodos CRUD
   */
  
  getLawyers(): Lawyer[] {
    return this.getItem<Lawyer>(STORAGE_KEYS.LAWYERS);
  }

  getLawyerById(id: string): Lawyer | null {
    const lawyers = this.getLawyers();
    return lawyers.find(lawyer => lawyer.id === id) || null;
  }

  saveLawyer(lawyer: Omit<Lawyer, 'id' | 'createdAt'>): Lawyer {
    const lawyers = this.getLawyers();
    const newLawyer: Lawyer = {
      ...lawyer,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    lawyers.push(newLawyer);
    this.setItem(STORAGE_KEYS.LAWYERS, lawyers);
    
    console.log('Advogado salvo:', newLawyer.fullName);
    return newLawyer;
  }

  updateLawyer(id: string, updatedLawyer: Partial<Lawyer>): Lawyer | null {
    const lawyers = this.getLawyers();
    const index = lawyers.findIndex(lawyer => lawyer.id === id);
    
    if (index === -1) {
      console.error('Advogado não encontrado para atualização:', id);
      return null;
    }

    lawyers[index] = { ...lawyers[index], ...updatedLawyer };
    this.setItem(STORAGE_KEYS.LAWYERS, lawyers);
    
    console.log('Advogado atualizado:', lawyers[index].fullName);
    return lawyers[index];
  }

  deleteLawyer(id: string): boolean {
    const lawyers = this.getLawyers();
    const filteredLawyers = lawyers.filter(lawyer => lawyer.id !== id);
    
    if (filteredLawyers.length === lawyers.length) {
      console.error('Advogado não encontrado para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.LAWYERS, filteredLawyers);
    console.log('Advogado excluído:', id);
    return true;
  }

  /**
   * MÉTODOS DE LIMPEZA E MANUTENÇÃO
   */
  
  // Limpar todos os dados do sistema
  clearAllData(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Todos os dados foram limpos do sistema');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw new Error('Falha ao limpar dados do sistema');
    }
  }

  // Limpar dados específicos por categoria
  clearProcesses(): void {
    localStorage.removeItem(STORAGE_KEYS.PROCESSES);
    console.log('Processos limpos');
  }

  clearEvents(): void {
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    console.log('Eventos limpos');
  }

  clearRevenues(): void {
    localStorage.removeItem(STORAGE_KEYS.REVENUES);
    console.log('Receitas limpas');
  }

  clearExpenses(): void {
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    console.log('Despesas limpas');
  }

  clearDocuments(): void {
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    console.log('Documentos limpos');
  }

  clearLawyers(): void {
    localStorage.removeItem(STORAGE_KEYS.LAWYERS);
    console.log('Advogados limpos');
  }

  /**
   * COLABORADORES - Métodos CRUD
   */
  
  getEmployees(): Employee[] {
    return this.getItem<Employee>(STORAGE_KEYS.EMPLOYEES);
  }

  getEmployeeById(id: string): Employee | null {
    const employees = this.getEmployees();
    return employees.find(employee => employee.id === id) || null;
  }

  saveEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const employees = this.getEmployees();
    const newEmployee: Employee = {
      ...employee,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    employees.push(newEmployee);
    this.setItem(STORAGE_KEYS.EMPLOYEES, employees);
    
    console.log('Colaborador salvo:', newEmployee.fullName);
    return newEmployee;
  }

  updateEmployee(id: string, updatedEmployee: Partial<Employee>): Employee | null {
    const employees = this.getEmployees();
    const index = employees.findIndex(employee => employee.id === id);
    
    if (index === -1) {
      console.error('Colaborador não encontrado para atualização:', id);
      return null;
    }

    employees[index] = { ...employees[index], ...updatedEmployee };
    this.setItem(STORAGE_KEYS.EMPLOYEES, employees);
    
    console.log('Colaborador atualizado:', employees[index].fullName);
    return employees[index];
  }

  deleteEmployee(id: string): boolean {
    const employees = this.getEmployees();
    const filteredEmployees = employees.filter(employee => employee.id !== id);
    
    if (filteredEmployees.length === employees.length) {
      console.error('Colaborador não encontrado para exclusão:', id);
      return false;
    }

    this.setItem(STORAGE_KEYS.EMPLOYEES, filteredEmployees);
    console.log('Colaborador excluído:', id);
    return true;
  }

  clearEmployees(): void {
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    console.log('Colaboradores limpos');
  }

  /**
   * MÉTODOS DE ESTATÍSTICAS E RELATÓRIOS
   */
  
  // Obter resumo financeiro
  getFinancialSummary() {
    const revenues = this.getRevenues();
    const expenses = this.getExpenses();
    
    const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalRevenue - totalExpenses;

    // Dados mensais para gráficos (últimos 6 meses)
    const monthlyData = this.generateMonthlyData(revenues, expenses);

    return {
      totalRevenue,
      totalExpenses,
      balance,
      monthlyData
    };
  }

  private generateMonthlyData(revenues: Revenue[], expenses: Expense[]) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentDate = new Date();
    const monthlyData = [];

    // Gerar dados dos últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthRevenues = revenues.filter(r => r.date.startsWith(monthKey));
      const monthExpenses = expenses.filter(e => e.date.startsWith(monthKey));
      
      const revenue = monthRevenues.reduce((sum, r) => sum + r.amount, 0);
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      monthlyData.push({
        month: months[date.getMonth()],
        revenue,
        expenses: expense
      });
    }

    return monthlyData;
  }

  // Obter estatísticas gerais
  getGeneralStats() {
    const processes = this.getProcesses();
    const events = this.getEvents();
    const documents = this.getDocuments();
    const lawyers = this.getLawyers();
    const employees = this.getEmployees();

    return {
      totalProcesses: processes.length,
      activeProcesses: processes.filter(p => p.status === 'Em andamento').length,
      completedProcesses: processes.filter(p => p.status === 'Concluído').length,
      totalEvents: events.length,
      pendingEvents: events.filter(e => e.status === 'Pendente').length,
      completedEvents: events.filter(e => e.status === 'Concluído').length,
      totalDocuments: documents.length,
      totalLawyers: lawyers.length,
      activeLawyers: lawyers.filter(l => l.status === 'Ativo').length,
      totalEmployees: employees.length,
      activeEmployees: employees.filter(e => e.status === 'Ativo').length
    };
  }

  /**
   * MÉTODOS DE BACKUP E RESTAURAÇÃO
   */
  
  // Exportar todos os dados para backup
  exportData() {
    const data = {
      processes: this.getProcesses(),
      events: this.getEvents(),
      revenues: this.getRevenues(),
      expenses: this.getExpenses(),
      documents: this.getDocuments(),
      lawyers: this.getLawyers(),
      employees: this.getEmployees(),
      exportDate: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }

  // Importar dados de backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.processes) this.setItem(STORAGE_KEYS.PROCESSES, data.processes);
      if (data.events) this.setItem(STORAGE_KEYS.EVENTS, data.events);
      if (data.revenues) this.setItem(STORAGE_KEYS.REVENUES, data.revenues);
      if (data.expenses) this.setItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.documents) this.setItem(STORAGE_KEYS.DOCUMENTS, data.documents);
      if (data.lawyers) this.setItem(STORAGE_KEYS.LAWYERS, data.lawyers);
      if (data.employees) this.setItem(STORAGE_KEYS.EMPLOYEES, data.employees);

      console.log('Dados importados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }
}

// Instância singleton do serviço
export const localStorageService = new LocalStorageService();

// Exportar também a classe para casos específicos
export default LocalStorageService;