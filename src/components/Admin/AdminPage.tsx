import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, CogIcon } from '@heroicons/react/24/outline';
import { auth } from '../../firebase.config'; // IMPORT AUSENTE
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aguardar o usuário estar carregado antes de tentar carregar dados
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadTeamData();
      } else {
        setLoading(false);
        setError('Usuário não autenticado');
      }
    });

    return () => unsubscribe();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Carregando dados da equipe...');
      const teamData = await adminService.getTeam();
      console.log('Dados da equipe carregados:', teamData);
      
      setTeam(teamData);
      
      // Se não existe team, NÃO criar automaticamente
      // Deixar o usuário criar manualmente através da interface
      if (!teamData) {
        console.log('Nenhuma equipe encontrada. Usuário deve criar uma.');
      }
    } catch (error) {
      console.error('Erro ao carregar dados da administração:', error);
      setError('Erro ao carregar dados da administração');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamUpdate = (updatedTeam: Team) => {
    setTeam(updatedTeam);
  };

  const handleCreateTeam = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      const newTeam = await adminService.createTeam({
        name: 'Meu Escritório',
        phones: [],
        settings: {
          allowInvitations: true,
          defaultRole: 'viewer',
          modules: ['processos', 'agenda', 'documentos', 'relatorios']
        }
      });

      if (newTeam) {
        setTeam(newTeam);
        console.log('Equipe criada com sucesso:', newTeam);
      } else {
        setError('Erro ao criar equipe');
      }
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      setError('Erro ao criar equipe');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadTeamData();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Se não há equipe, mostrar opção para criar
  if (!team) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Voltar
          </button>
        </div>
        
        <div className="max-w-md mx-auto text-center py-12">
          <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure seu Escritório</h2>
          <p className="text-gray-600 mb-6">
            Para começar a usar o sistema de administração, você precisa configurar seu escritório.
          </p>
          <button
            onClick={handleCreateTeam}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Meu Escritório'}
          </button>
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