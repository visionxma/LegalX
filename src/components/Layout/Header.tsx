// src/components/Layout/Header.tsx - ATUALIZADO COM TEAMSELECTOR
import React from 'react';
import { User } from '../../types/auth';
import { authService } from '../../services/authService';
import { useTeam } from '../../contexts/TeamContext';
import TeamSelector from './TeamSelector';
import { 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export default function Header({ user, onLogout, onOpenAdmin }: HeaderProps) {
  const { activeTeam, currentMember, isSoloMode } = useTeam();

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      authService.logout();
      onLogout();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Office Info + Team Selector */}
        <div className="flex items-center space-x-4">
          {/* Office Badge */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">
                {user.officeName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.officeName}</h2>
              <p className="text-sm text-gray-500">OAB: {user.oabNumber}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-gray-300" />

          {/* Team Selector - NOVO */}
          <TeamSelector />
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center space-x-4">
          {/* Context Indicator - NOVO */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500">
                {isSoloMode ? (
                  'Modo Individual'
                ) : (
                  <>
                    {activeTeam?.name}
                    {currentMember && (
                      <span className="ml-1 text-blue-600">
                        • {currentMember.role === 'owner' ? 'Proprietário' : 
                           currentMember.role === 'admin' ? 'Admin' :
                           currentMember.role === 'editor' ? 'Editor' : 'Visualizador'}
                      </span>
                    )}
                  </>
                )}
              </p>
              {!isSoloMode && currentMember && (
                <ShieldCheckIcon className="w-3 h-3 text-blue-600" />
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Administração"
              >
                <CogIcon className="w-4 h-4 mr-1" />
                Admin
              </button>
            )}
            <UserCircleIcon className="w-8 h-8 text-gray-400" />
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sair"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}