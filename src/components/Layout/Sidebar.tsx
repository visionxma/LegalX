// src/components/Layout/Sidebar.tsx - ATUALIZADO COM PERMISSION GUARDS
import React from 'react';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  FolderIcon,
  ChartBarIcon,
  UserGroupIcon,
  PlusIcon,
  CogIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useTeam } from '../../contexts/TeamContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onQuickAction: (action: string) => void;
}

// Mapeamento de módulos para permissões
const MODULE_PERMISSIONS = {
  'dashboard': null, // Sempre visível
  'processes': 'processos',
  'calendar': 'agenda',
  'financial': 'financas',
  'team': 'equipe',
  'documents': 'documentos',
  'reports': 'relatorios',
  'settings': 'configuracoes'
} as const;

// Mapeamento de quick actions para permissões
const QUICK_ACTION_PERMISSIONS = {
  'new-power-of-attorney': 'documentos',
  'new-receipt': 'documentos',
  'new-revenue': 'financas',
  'new-expense': 'financas',
  'new-process': 'processos',
  'new-event': 'agenda',
  'new-lawyer': 'equipe',
  'new-employee': 'equipe'
} as const;

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: HomeIcon },
  { name: 'Processos', href: 'processes', icon: FolderIcon },
  { name: 'Agenda', href: 'calendar', icon: CalendarIcon },
  { name: 'Financeiro', href: 'financial', icon: CurrencyDollarIcon },
  { name: 'Equipe', href: 'team', icon: UserGroupIcon },
  { name: 'Documentos', href: 'documents', icon: DocumentTextIcon },
  { name: 'Relatórios', href: 'reports', icon: ChartBarIcon },
  { name: 'Configurações', href: 'settings', icon: CogIcon },
];

const quickActions = [
  { name: 'Nova Procuração', action: 'new-power-of-attorney' },
  { name: 'Novo Recibo', action: 'new-receipt' },
  { name: 'Nova Receita', action: 'new-revenue' },
  { name: 'Nova Despesa', action: 'new-expense' },
  { name: 'Novo Processo', action: 'new-process' },
  { name: 'Novo Evento', action: 'new-event' },
  { name: 'Novo Advogado', action: 'new-lawyer' },
  { name: 'Novo Colaborador', action: 'new-employee' },
];

export default function Sidebar({ activeSection, onSectionChange, onQuickAction }: SidebarProps) {
  const { checkPermission, isSoloMode } = useTeam();

  /**
   * Verifica se um módulo deve ser visível
   */
  const canAccessModule = (moduleKey: string): boolean => {
    const permission = MODULE_PERMISSIONS[moduleKey as keyof typeof MODULE_PERMISSIONS];
    
    // Módulos sem permissão associada são sempre visíveis
    if (!permission) return true;
    
    return checkPermission(permission as any);
  };

  /**
   * Verifica se uma quick action deve ser visível
   */
  const canUseQuickAction = (actionKey: string): boolean => {
    const permission = QUICK_ACTION_PERMISSIONS[actionKey as keyof typeof QUICK_ACTION_PERMISSIONS];
    
    if (!permission) return true;
    
    return checkPermission(permission as any);
  };

  /**
   * Filtra navegação e quick actions baseado em permissões
   */
  const visibleNavigation = navigation.filter(item => canAccessModule(item.href));
  const visibleQuickActions = quickActions.filter(action => canUseQuickAction(action.action));

  return (
    <div className="flex flex-col w-64 bg-blue-900 text-white h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-blue-800">
        <h1 className="text-2xl font-bold">
          Legal<span className="text-amber-400">X</span>
        </h1>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {visibleNavigation.map((item) => {
            const hasPermission = canAccessModule(item.href);
            
            return (
              <button
                key={item.name}
                onClick={() => hasPermission && onSectionChange(item.href)}
                disabled={!hasPermission}
                className={clsx(
                  'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  activeSection === item.href
                    ? 'bg-blue-800 text-white'
                    : hasPermission
                    ? 'text-blue-100 hover:bg-blue-800 hover:text-white'
                    : 'text-blue-400 cursor-not-allowed opacity-50'
                )}
                title={!hasPermission ? 'Sem permissão de acesso' : undefined}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {!hasPermission && (
                  <LockClosedIcon className="w-3 h-3 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        {visibleQuickActions.length > 0 && (
          <div className="px-4 py-4 border-t border-blue-800">
            <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
              Ações Rápidas
            </h3>
            <div className="space-y-1">
              {visibleQuickActions.map((action) => {
                const hasPermission = canUseQuickAction(action.action);
                
                return (
                  <button
                    key={action.action}
                    onClick={() => hasPermission && onQuickAction(action.action)}
                    disabled={!hasPermission}
                    className={clsx(
                      'w-full flex items-center px-2 py-1.5 text-xs rounded transition-colors',
                      hasPermission
                        ? 'text-blue-100 hover:bg-blue-800'
                        : 'text-blue-400 cursor-not-allowed opacity-50'
                    )}
                    title={!hasPermission ? 'Sem permissão' : undefined}
                  >
                    <PlusIcon className="w-3 h-3 mr-2" />
                    {action.name}
                    {!hasPermission && (
                      <LockClosedIcon className="w-2 h-2 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Context Info - NOVO */}
        <div className="px-4 py-4 border-t border-blue-800">
          <div className="text-xs text-blue-300">
            <p className="font-semibold mb-1">Contexto Atual:</p>
            <p className="text-blue-100">
              {isSoloMode ? '🔒 Modo Individual' : '👥 Modo Equipe'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}