// src/components/Admin/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, CogIcon } from '@heroicons/react/24/outline';
import { auth } from '../../firebase.config';
import { adminService } from '../../services/adminService';
import { Team } from '../../types/admin';
import { useTeam } from '../../contexts/TeamContext';
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
  
  // NOVO: Verificar permissões
  const { isOwner, isSoloMode, checkPermission } = useTeam();
  const canAccessAdmin = isSoloMode || isOwner || checkPermission('configuracoes');

  useEffect(() => {
    // GUARD: Redirecionar se não tiver permissão
    if (!canAccessAdmin && !loading) {
      alert('Você não possui permissão para acessar a área administrativa.');
      onBack();
      return;
    }
    
    loadTeamData();
  }, [canAccessAdmin]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!auth.currentUser) {
        console.log('Aguardando autenticação...');
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });
      }

      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      console.log('Usuário autenticado:', auth.currentUser.uid);
      console.log('Carregando dados da equipe...');
      
      const teamData = await adminService.getTeam();
      console.log('Dados da equipe carregados:', teamData);
      
      setTeam(teamData);
      
    } catch (error: any) {
      console.error('Erro ao carregar dados da administração:', error);
      
      let errorMessage = 'Erro ao carregar dados da administração';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Sem permissão para acessar os dados. Verifique as regras do Firestore.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns momentos.';
      } else if (error.message.includes('não autenticado')) {
        errorMessage = 'Sessão expirada. Faça login novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
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
      setError(null);
      
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Criando nova equipe...');
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
        throw new Error('Falha ao criar equipe');
      }
    } catch (error: any) {
      console.error('Erro ao criar equipe:', error);
      setError(error.message || 'Erro ao criar equipe');
    } finally {
      setLoading(false);
    }
  };

  // GUARD: Bloquear acesso se não tiver permissão
  if (!canAccessAdmin && !loading) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CogIcon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não possui permissão para acessar a área administrativa.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

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
          <div className="space-y-2">
            <button
              onClick={loadTeamData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mr-2"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              disabled={!isOwner && !checkPermission('equipe')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } ${!isOwner && !checkPermission('equipe') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Grupo de Envolvidos
            </button>
            <button
              onClick={() => setActiveTab('access')}
              disabled={!isOwner}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'access'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isOwner ? 'Apenas o proprietário pode gerenciar acessos' : ''}
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