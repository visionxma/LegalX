import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, CogIcon } from '@heroicons/react/24/outline';
import { adminService } from '../../services/adminService';
import { Team } from '../../types/admin';
import OfficeTab from './OfficeTab';
import TeamTab from './TeamTab';
import AccessTab from './AccessTab';

interface AdminPageProps {
  onBack: () => void;
}

export default function AdminPage({ onBack }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'office' | 'team' | 'access'>('office');
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await adminService.getTeam();
      setTeam(teamData);
      
      // Se não existe team, criar um básico
      if (!teamData) {
        const user = auth.currentUser;
        if (user) {
          const newTeam = await adminService.createTeam({
            name: 'Meu Escritório',
            phones: [],
            settings: {
              allowInvitations: true,
              defaultRole: 'viewer',
              modules: ['processos', 'agenda', 'documentos', 'relatorios']
            }
          });
          setTeam(newTeam);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da administração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamUpdate = (updatedTeam: Team) => {
    setTeam(updatedTeam);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando administração...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Voltar
        </button>
        <div className="flex items-center">
          <CogIcon className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
            <p className="text-gray-600">Gerencie seu escritório e equipe</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('office')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'office'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Escritório
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Grupo de Envolvidos
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'access'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Acesso
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'office' && (
            <OfficeTab team={team} onUpdate={handleTeamUpdate} />
          )}
          {activeTab === 'team' && (
            <TeamTab team={team} />
          )}
          {activeTab === 'access' && (
            <AccessTab team={team} />
          )}
        </div>
      </div>
    </div>
  );
}