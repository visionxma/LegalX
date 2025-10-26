// src/services/firestoreService.ts - ATUALIZADO COM SUPORTE A EQUIPES
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Process, CalendarEvent, Revenue, Expense, Document, Lawyer, Employee } from '../types';

class FirestoreService {
  
  // CONTEXTO DE EQUIPE ATIVA
  private activeTeamId: string | null = null;
  
  /**
   * Definir equipe ativa (chamado pelo TeamContext)
   */
  setActiveTeam(teamId: string | null) {
    this.activeTeamId = teamId;
    console.log('🔄 Contexto Firestore alterado:', teamId ? `Equipe: ${teamId}` : 'Modo Solo');
  }
  
  /**
   * Obter equipe ativa
   */
  getActiveTeam(): string | null {
    return this.activeTeamId;
  }
  
  /**
   * Obter o ID do usuário atual
   */
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user.uid;
  }

  /**
   * NOVO: Obter referência da coleção baseado no contexto
   * Se há equipe ativa: /teams/{teamId}/{collection}
   * Se modo solo: /userData/{userId}/{collection}
   */
  private getCollection(collectionName: string) {
    if (this.activeTeamId) {
      // Modo Equipe: dados compartilhados
      console.log(`📁 Acessando: teams/${this.activeTeamId}/${collectionName}`);
      return collection(db, 'teams', this.activeTeamId, collectionName);
    } else {
      // Modo Solo: dados pessoais
      const userId = this.getCurrentUserId();
      console.log(`📁 Acessando: userData/${userId}/${collectionName}`);
      return collection(db, 'userData', userId, collectionName);
    }
  }
  
  /**
   * NOVO: Adicionar campos de contexto aos dados
   */
  private addContextFields(data: any): any {
    const userId = this.getCurrentUserId();
    
    if (this.activeTeamId) {
      return {
        ...data,
        userId,
        teamId: this.activeTeamId,
        createdAt: Timestamp.now()
      };
    } else {
      return {
        ...data,
        userId,
        createdAt: Timestamp.now()
      };
    }
  }

  // ==========================================
  // PROCESSOS
  // ==========================================
  
  async getProcesses(): Promise<Process[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('processes'),
        orderBy('createdAt', 'desc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Process[];
    } catch (error) {
      console.error('❌ Erro ao buscar processos:', error);
      return [];
    }
  }

  async getProcessById(id: string): Promise<Process | null> {
    try {
      const collectionRef = this.getCollection('processes');
      const docRef = doc(collectionRef as any, id);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          id: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        } as Process;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar processo:', error);
      return null;
    }
  }

  async saveProcess(process: Omit<Process, 'id' | 'createdAt'>): Promise<Process | null> {
    try {
      const processData = this.addContextFields(process);
      const docRef = await addDoc(this.getCollection('processes'), processData);
      
      console.log('✅ Processo salvo:', docRef.id, 'Contexto:', this.activeTeamId ? 'Equipe' : 'Solo');
      
      return {
        id: docRef.id,
        ...process,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao salvar processo:', error);
      return null;
    }
  }

  async updateProcess(id: string, updatedProcess: Partial<Process>): Promise<Process | null> {
    try {
      const collectionRef = this.getCollection('processes');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, {
        ...updatedProcess,
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ Processo atualizado:', id);
      return await this.getProcessById(id);
    } catch (error) {
      console.error('❌ Erro ao atualizar processo:', error);
      return null;
    }
  }

  async deleteProcess(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('processes');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Processo excluído:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir processo:', error);
      return false;
    }
  }

  // ==========================================
  // EVENTOS (mesmo padrão)
  // ==========================================
  
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('events'),
        orderBy('date', 'desc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
    } catch (error) {
      console.error('❌ Erro ao buscar eventos:', error);
      return [];
    }
  }

  async saveEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
    try {
      const eventData = this.addContextFields(event);
      const docRef = await addDoc(this.getCollection('events'), eventData);
      
      console.log('✅ Evento salvo:', docRef.id);
      
      return {
        id: docRef.id,
        ...event
      };
    } catch (error) {
      console.error('❌ Erro ao salvar evento:', error);
      return null;
    }
  }

  async updateEvent(id: string, updatedEvent: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      const collectionRef = this.getCollection('events');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, updatedEvent);
      console.log('✅ Evento atualizado:', id);
      
      const updated = await getDoc(docRef);
      return updated.exists() ? { id: updated.id, ...updated.data() } as CalendarEvent : null;
    } catch (error) {
      console.error('❌ Erro ao atualizar evento:', error);
      return null;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('events');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Evento excluído:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir evento:', error);
      return false;
    }
  }

  // ==========================================
  // RECEITAS (mesmo padrão)
  // ==========================================
  
  async getRevenues(): Promise<Revenue[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('revenues'),
        orderBy('date', 'desc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Revenue[];
    } catch (error) {
      console.error('❌ Erro ao buscar receitas:', error);
      return [];
    }
  }

  async saveRevenue(revenue: Omit<Revenue, 'id'>): Promise<Revenue | null> {
    try {
      const revenueData = this.addContextFields(revenue);
      const docRef = await addDoc(this.getCollection('revenues'), revenueData);
      
      console.log('✅ Receita salva:', docRef.id);
      
      return {
        id: docRef.id,
        ...revenue
      };
    } catch (error) {
      console.error('❌ Erro ao salvar receita:', error);
      return null;
    }
  }

  async updateRevenue(id: string, updatedRevenue: Partial<Revenue>): Promise<Revenue | null> {
    try {
      const collectionRef = this.getCollection('revenues');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, updatedRevenue);
      console.log('✅ Receita atualizada:', id);
      
      const updated = await getDoc(docRef);
      return updated.exists() ? { id: updated.id, ...updated.data() } as Revenue : null;
    } catch (error) {
      console.error('❌ Erro ao atualizar receita:', error);
      return null;
    }
  }

  async deleteRevenue(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('revenues');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Receita excluída:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir receita:', error);
      return false;
    }
  }

  // ==========================================
  // DESPESAS (mesmo padrão)
  // ==========================================
  
  async getExpenses(): Promise<Expense[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('expenses'),
        orderBy('date', 'desc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
    } catch (error) {
      console.error('❌ Erro ao buscar despesas:', error);
      return [];
    }
  }

  async saveExpense(expense: Omit<Expense, 'id'>): Promise<Expense | null> {
    try {
      const expenseData = this.addContextFields(expense);
      const docRef = await addDoc(this.getCollection('expenses'), expenseData);
      
      console.log('✅ Despesa salva:', docRef.id);
      
      return {
        id: docRef.id,
        ...expense
      };
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
      return null;
    }
  }

  async updateExpense(id: string, updatedExpense: Partial<Expense>): Promise<Expense | null> {
    try {
      const collectionRef = this.getCollection('expenses');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, updatedExpense);
      console.log('✅ Despesa atualizada:', id);
      
      const updated = await getDoc(docRef);
      return updated.exists() ? { id: updated.id, ...updated.data() } as Expense : null;
    } catch (error) {
      console.error('❌ Erro ao atualizar despesa:', error);
      return null;
    }
  }

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('expenses');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Despesa excluída:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir despesa:', error);
      return false;
    }
  }

  // ==========================================
  // DOCUMENTOS, ADVOGADOS, COLABORADORES
  // (Mesma implementação com getCollection)
  // ==========================================

  async getDocuments(): Promise<Document[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('documents'),
        orderBy('createdAt', 'desc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Document[];
    } catch (error) {
      console.error('❌ Erro ao buscar documentos:', error);
      return [];
    }
  }

  async saveDocument(document: Omit<Document, 'id' | 'createdAt'>): Promise<Document | null> {
    try {
      const documentData = this.addContextFields(document);
      const docRef = await addDoc(this.getCollection('documents'), documentData);
      
      console.log('✅ Documento salvo:', docRef.id);
      
      return {
        id: docRef.id,
        ...document,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao salvar documento:', error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('documents');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Documento excluído:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir documento:', error);
      return false;
    }
  }

  async getLawyers(): Promise<Lawyer[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('lawyers'),
        orderBy('fullName', 'asc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Lawyer[];
    } catch (error) {
      console.error('❌ Erro ao buscar advogados:', error);
      return [];
    }
  }

  async saveLawyer(lawyer: Omit<Lawyer, 'id' | 'createdAt'>): Promise<Lawyer | null> {
    try {
      const lawyerData = this.addContextFields(lawyer);
      const docRef = await addDoc(this.getCollection('lawyers'), lawyerData);
      
      console.log('✅ Advogado salvo:', docRef.id);
      
      return {
        id: docRef.id,
        ...lawyer,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao salvar advogado:', error);
      return null;
    }
  }

  async updateLawyer(id: string, updatedLawyer: Partial<Lawyer>): Promise<Lawyer | null> {
    try {
      const collectionRef = this.getCollection('lawyers');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, updatedLawyer);
      console.log('✅ Advogado atualizado:', id);
      
      const updated = await getDoc(docRef);
      return updated.exists() ? { 
        id: updated.id, 
        ...updated.data(),
        createdAt: updated.data().createdAt?.toDate?.()?.toISOString() || updated.data().createdAt
      } as Lawyer : null;
    } catch (error) {
      console.error('❌ Erro ao atualizar advogado:', error);
      return null;
    }
  }

  async deleteLawyer(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('lawyers');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Advogado excluído:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir advogado:', error);
      return false;
    }
  }

  async getEmployees(): Promise<Employee[]> {
    try {
      const snapshot = await getDocs(query(
        this.getCollection('employees'),
        orderBy('fullName', 'asc')
      ));
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Employee[];
    } catch (error) {
      console.error('❌ Erro ao buscar colaboradores:', error);
      return [];
    }
  }

  async saveEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee | null> {
    try {
      const employeeData = this.addContextFields(employee);
      const docRef = await addDoc(this.getCollection('employees'), employeeData);
      
      console.log('✅ Colaborador salvo:', docRef.id);
      
      return {
        id: docRef.id,
        ...employee,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao salvar colaborador:', error);
      return null;
    }
  }

  async updateEmployee(id: string, updatedEmployee: Partial<Employee>): Promise<Employee | null> {
    try {
      const collectionRef = this.getCollection('employees');
      const docRef = doc(collectionRef as any, id);
      
      await updateDoc(docRef, updatedEmployee);
      console.log('✅ Colaborador atualizado:', id);
      
      const updated = await getDoc(docRef);
      return updated.exists() ? { 
        id: updated.id, 
        ...updated.data(),
        createdAt: updated.data().createdAt?.toDate?.()?.toISOString() || updated.data().createdAt
      } as Employee : null;
    } catch (error) {
      console.error('❌ Erro ao atualizar colaborador:', error);
      return null;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const collectionRef = this.getCollection('employees');
      const docRef = doc(collectionRef as any, id);
      
      await deleteDoc(docRef);
      console.log('✅ Colaborador excluído:', id);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir colaborador:', error);
      return false;
    }
  }

  // ==========================================
  // ESTATÍSTICAS (Adaptado para contexto)
  // ==========================================
  
  async getFinancialSummary() {
    try {
      const [revenues, expenses] = await Promise.all([
        this.getRevenues(),
        this.getExpenses()
      ]);
      
      const totalRevenue = revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const balance = totalRevenue - totalExpenses;

      const monthlyData = this.generateMonthlyData(revenues, expenses);

      return {
        totalRevenue,
        totalExpenses,
        balance,
        monthlyData
      };
    } catch (error) {
      console.error('❌ Erro ao calcular resumo financeiro:', error);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        balance: 0,
        monthlyData: []
      };
    }
  }

  private generateMonthlyData(revenues: Revenue[], expenses: Expense[]) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentDate = new Date();
    const monthlyData = [];

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

  async getGeneralStats() {
    try {
      const [processes, events, documents, lawyers, employees] = await Promise.all([
        this.getProcesses(),
        this.getEvents(),
        this.getDocuments(),
        this.getLawyers(),
        this.getEmployees()
      ]);

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
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      return {
        totalProcesses: 0,
        activeProcesses: 0,
        completedProcesses: 0,
        totalEvents: 0,
        pendingEvents: 0,
        completedEvents: 0,
        totalDocuments: 0,
        totalLawyers: 0,
        activeLawyers: 0,
        totalEmployees: 0,
        activeEmployees: 0
      };
    }
  }
}

export const firestoreService = new FirestoreService();
export default FirestoreService;