/**
 * Utilitário para Gerenciamento de Dados - LegalX
 * 
 * Este arquivo fornece funções utilitárias para gerenciamento de dados,
 * incluindo limpeza, backup, restauração e migração de dados.
 */

import { localStorageService } from '../services/localStorage';

/**
 * Classe para gerenciamento avançado de dados
 */
export class DataManager {
  
  /**
   * Limpar todos os dados do sistema
   */
  static clearAllData(): void {
    if (confirm('ATENÇÃO: Esta ação irá remover TODOS os dados do sistema. Esta ação não pode ser desfeita. Deseja continuar?')) {
      try {
        localStorageService.clearAllData();
        alert('Todos os dados foram removidos com sucesso!');
        window.location.reload(); // Recarregar página para refletir mudanças
      } catch (error) {
        console.error('Erro ao limpar dados:', error);
        alert('Erro ao limpar dados. Tente novamente.');
      }
    }
  }

  /**
   * Fazer backup de todos os dados
   */
  static exportBackup(): void {
    try {
      const backupData = localStorageService.exportData();
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `legalx_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('Backup exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao exportar backup. Tente novamente.');
    }
  }

  /**
   * Restaurar dados de backup
   */
  static importBackup(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const jsonData = e.target?.result as string;
          const success = localStorageService.importData(jsonData);
          
          if (success) {
            alert('Backup restaurado com sucesso!');
            window.location.reload(); // Recarregar página
            resolve(true);
          } else {
            alert('Erro ao restaurar backup. Verifique o arquivo.');
            resolve(false);
          }
        } catch (error) {
          console.error('Erro ao processar arquivo de backup:', error);
          alert('Arquivo de backup inválido.');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        alert('Erro ao ler arquivo.');
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Obter estatísticas do sistema
   */
  static getSystemStats() {
    const stats = localStorageService.getGeneralStats();
    const financialSummary = localStorageService.getFinancialSummary();
    
    return {
      ...stats,
      ...financialSummary,
      storageUsed: this.getStorageUsage()
    };
  }

  /**
   * Calcular uso do localStorage
   */
  private static getStorageUsage(): { used: number; total: number; percentage: number } {
    let used = 0;
    
    // Calcular tamanho usado
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('legalx_')) {
        used += localStorage[key].length;
      }
    }
    
    // Estimar limite do localStorage (geralmente 5-10MB)
    const total = 5 * 1024 * 1024; // 5MB em bytes
    const percentage = (used / total) * 100;
    
    return {
      used,
      total,
      percentage: Math.round(percentage * 100) / 100
    };
  }

  /**
   * Validar integridade dos dados
   */
  static validateDataIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Validar processos
      const processes = localStorageService.getProcesses();
      processes.forEach((process, index) => {
        if (!process.id || !process.name || !process.client) {
          errors.push(`Processo ${index + 1}: dados incompletos`);
        }
      });

      // Validar eventos
      const events = localStorageService.getEvents();
      events.forEach((event, index) => {
        if (!event.id || !event.title || !event.date) {
          errors.push(`Evento ${index + 1}: dados incompletos`);
        }
      });

      // Validar receitas
      const revenues = localStorageService.getRevenues();
      revenues.forEach((revenue, index) => {
        if (!revenue.id || !revenue.source || revenue.amount <= 0) {
          errors.push(`Receita ${index + 1}: dados inválidos`);
        }
      });

      // Validar despesas
      const expenses = localStorageService.getExpenses();
      expenses.forEach((expense, index) => {
        if (!expense.id || !expense.type || expense.amount <= 0) {
          errors.push(`Despesa ${index + 1}: dados inválidos`);
        }
      });

    } catch (error) {
      errors.push(`Erro ao validar dados: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Criar dados de exemplo para demonstração
   */
  static createSampleData(): void {
    if (confirm('Deseja criar dados de exemplo? Isso irá adicionar alguns registros para demonstração.')) {
      try {
        // Advogado de exemplo
        localStorageService.saveLawyer({
          fullName: 'Dr. Maria Santos Silva',
          cpf: '12345678901',
          oab: '123456/SP',
          commission: 15,
          email: 'maria.santos@exemplo.com',
          phone: '(11) 99999-9999',
          address: 'Rua das Flores, 123 - São Paulo/SP',
          specialties: ['Direito Trabalhista', 'Direito Civil', 'Direito Previdenciário'],
          status: 'Ativo'
        });

        // Segundo advogado de exemplo
        localStorageService.saveLawyer({
          fullName: 'Dr. João Carlos Oliveira',
          cpf: '98765432100',
          oab: '654321/SP',
          commission: 20,
          email: 'joao.oliveira@exemplo.com',
          phone: '(11) 88888-8888',
          address: 'Av. Paulista, 456 - São Paulo/SP',
          specialties: ['Direito Empresarial', 'Direito Tributário'],
          status: 'Ativo'
        });

        // Colaborador de exemplo
        localStorageService.saveEmployee({
          fullName: 'Ana Paula Santos',
          cpf: '11122233344',
          salary: 3500,
          position: 'Secretária Jurídica',
          email: 'ana.santos@exemplo.com',
          phone: '(11) 77777-7777',
          address: 'Rua das Acácias, 789 - São Paulo/SP',
          status: 'Ativo'
        });

        // Segundo colaborador de exemplo
        localStorageService.saveEmployee({
          fullName: 'Carlos Eduardo Lima',
          cpf: '55566677788',
          salary: 4200,
          position: 'Assistente Jurídico',
          email: 'carlos.lima@exemplo.com',
          phone: '(11) 66666-6666',
          address: 'Av. Brasil, 321 - São Paulo/SP',
          status: 'Ativo'
        });

        // Processo de exemplo
        localStorageService.saveProcess({
          name: 'Ação Trabalhista - Exemplo',
          processNumber: '0001234-56.2024.5.02.0001',
          client: 'João da Silva',
          opposingParty: 'Empresa ABC Ltda.',
          court: 'TRT 2ª Região - 15ª Vara do Trabalho',
          responsibleLawyers: ['Dr. Maria Santos Silva', 'Dr. João Carlos Oliveira'],
          startDate: '2024-01-15',
          status: 'Em andamento',
          description: 'Ação de cobrança de verbas rescisórias e danos morais por demissão sem justa causa.',
          notes: 'Cliente possui todos os documentos necessários. Primeira audiência agendada.'
        });

        // Evento de exemplo
        localStorageService.saveEvent({
          title: 'Audiência - João da Silva',
          date: '2024-02-15',
          time: '14:00',
          client: 'João da Silva',
          type: 'Audiência',
          location: 'TRT 2ª Região - Sala 205',
          notes: 'Audiência de conciliação',
          status: 'Pendente',
          lawyers: ['Dr. Maria Santos Silva']
        });

        // Receita de exemplo
        localStorageService.saveRevenue({
          date: '2024-01-20',
          amount: 2500,
          source: 'João da Silva',
          category: 'Honorário',
          responsibleLawyers: ['Dr. Maria Santos Silva'],
          client: 'João da Silva',
          description: 'Honorários contratuais - Ação Trabalhista'
        });

        // Despesa de exemplo
        localStorageService.saveExpense({
          date: '2024-01-05',
          amount: 1200,
          type: 'Aluguel do escritório',
          category: 'Aluguel',
          responsibleLawyers: ['Dr. João Carlos Oliveira'],
          description: 'Aluguel mensal do escritório - Janeiro 2024'
        });

        alert('Dados de exemplo criados com sucesso!');
        window.location.reload();
      } catch (error) {
        console.error('Erro ao criar dados de exemplo:', error);
        alert('Erro ao criar dados de exemplo.');
      }
    }
  }
}

// Exportar funções individuais para uso direto
export const clearAllData = DataManager.clearAllData;
export const exportBackup = DataManager.exportBackup;
export const importBackup = DataManager.importBackup;
export const getSystemStats = DataManager.getSystemStats;
export const validateDataIntegrity = DataManager.validateDataIntegrity;
export const createSampleData = DataManager.createSampleData;