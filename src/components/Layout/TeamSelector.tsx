// src/components/Layout/TeamSelector.tsx
import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { 
  ChevronDownIcon, 
  UserIcon, 
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function TeamSelector() {
  const { activeTeam, currentMember, isOwner, switchTeam } = useTeam();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSoloMode = () => {
    switchTeam(null); // null = modo solo
    setIsOpen(false);
  };

  const selectTeam = () => {
    if (activeTeam) {
      switchTeam(activeTeam);
    }
    setIsOpen(false);
  };

  const getCurrentModeLabel = () => {
    if (activeTeam) {
      return {
        label: activeTeam.name,
        sublabel: isOwner ? 'Proprietário' : `${currentMember?.role}`,
        icon: <UserGroupIcon className="w-5 h-5" />
      };
    } else {
      return {
        label: 'Modo Individual',
        sublabel: 'Seus dados pessoais',
        icon: <UserIcon className="w-5 h-5" />
      };
    }
  };

  const currentMode = getCurrentModeLabel();

  // Se não há equipe configurada, não mostrar o seletor
  if (!activeTeam) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-[200px]"
      >
        <div className="flex items-center space-x-2 flex-1">
          <div className="text-blue-600">
            {currentMode.icon}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">{currentMode.label}</p>
            <p className="text-xs text-gray-500">{currentMode.sublabel}</p>
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Contexto de Trabalho
              </div>
              
              {/* Modo Individual */}
              <button
                onClick={toggleSoloMode}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  !activeTeam ? 'bg-blue-50' : ''
                }`}
              >
                <UserIcon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Modo Individual</p>
                  <p className="text-xs text-gray-500">Trabalhar com seus dados pessoais</p>
                </div>
                {!activeTeam && <CheckIcon className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Modo Equipe */}
              <button
                onClick={selectTeam}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  activeTeam ? 'bg-blue-50' : ''
                }`}
              >
                <UserGroupIcon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activeTeam?.name}</p>
                  <p className="text-xs text-gray-500">
                    Trabalhar em equipe • {isOwner ? 'Proprietário' : currentMember?.role}
                  </p>
                </div>
                {activeTeam && <CheckIcon className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}