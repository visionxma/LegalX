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
  CogIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onQuickAction: (action: string) => void;
}

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
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => onSectionChange(item.href)}
              className={clsx(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                activeSection === item.href
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="px-4 py-4 border-t border-blue-800">
          <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
            Ações Rápidas
          </h3>
          <div className="space-y-1">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => onQuickAction(action.action)}
                className="w-full flex items-center px-2 py-1.5 text-xs text-blue-100 hover:bg-blue-800 rounded transition-colors"
              >
                <PlusIcon className="w-3 h-3 mr-2" />
                {action.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
