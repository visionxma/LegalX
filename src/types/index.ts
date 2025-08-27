export interface Process {
  id: string;
  name: string;
  processNumber: string;
  client: string;
  opposingParty?: string;
  court: string;
  responsibleLawyers: string[];
  startDate: string;
  status: 'Em andamento' | 'Concluído';
  description: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  client?: string;
  type: 'Audiência' | 'Reunião com Cliente' | 'Prazo Processual' | 'Prazo Interno' | 'Ligação Importante' | 'Outro';
  location?: string;
  notes?: string;
  status: 'Pendente' | 'Concluído';
  lawyers: string[];
  processNumber?: string;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
}

export interface Revenue {
  id: string;
  date: string;
  amount: number;
  source: string;
  category: 'Honorário' | 'Consultoria' | 'Outro';
  responsibleLawyers?: string[];
  client?: string;
  description?: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  type: string;
  category: 'Aluguel' | 'Internet' | 'Material' | 'Outro';
  responsibleLawyers?: string[];
  responsibleMembers?: string[];
  description?: string;
  receipt?: string;
}

export interface Document {
  id: string;
  type: 'Procuração' | 'Recibo';
  client: string;
  createdAt: string;
  data: any;
}

export interface Lawyer {
  id: string;
  fullName: string;
  cpf: string;
  oab: string;
  photo?: string;
  commission: number; // Percentual de comissão (0-100)
  email?: string;
  phone?: string;
  address?: string;
  specialties?: string[];
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  cpf: string;
  photo?: string;
  salary: number;
  position: string; // Função/cargo
  email?: string;
  phone?: string;
  address?: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
}

// Re-export auth types for convenience
export type { User, AuthState } from './auth';