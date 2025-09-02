import React, { useState, useEffect } from 'react';
import { Team, TeamInvitation } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { 
  PlusIcon, 
  ClipboardDocumentIcon, 
  EnvelopeIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamTabProps {
  team: Team | null;
}

export default function TeamTab({ team }: TeamTabProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);

  useEffect(() => {
    if (team) {
      loadInvitations();
    }
  }, [team]);

  const loadInvitations = async () => {
    if (!team) return;
    
    try {
      setLoadingInvites(true);
      const invites = await adminService.getTeamInvitations(team.id);
      setInvitations(invites);
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!team || !inviteEmail.trim()) return;
    
    try {
      setLoading(true);
      
      const invitation = await adminService.createInvitation(team.id, inviteEmail.trim(), inviteRole);
      
      if (invitation) {
        await loadInvitations();
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteRole('viewer');
        alert('Convite criado com sucesso!');
      } else {
        alert('Erro ao criar convite. Verifique se o e-mail já não foi convidado.');
      }
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      alert('Erro ao criar convite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (confirm('Tem certeza que deseja cancelar este convite?')) {
      try {
        const success = await adminService.cancelInvitation(inviteId);
        if (success) {
          await loadInvitations();
        }
      } catch (error) {
        console.error('Erro ao cancelar convite:', error);
        alert('Erro ao cancelar convite.');
      }
    }
  };

  const copyInviteLink = (inviteId: string) => {
    const link = adminService.generateInviteLink(inviteId);
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copiado para a área de transferência!');
    }).catch(() => {
      alert('Erro ao copiar link. Tente novamente.');
    });
  };

  const openMailto = (invitation: TeamInvitation) => {
    const inviteLink = adminService.generateInviteLink(invitation.id);
    const mailtoLink = adminService.generateMailtoLink(invitation.email, inviteLink, team?.name || 'LegalX');
    window.open(mailtoLink, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-amber-500" />;
      case 'accepted':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'expired':
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Carregando dados da equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gerenciar Convites</h3>
          <p className="text-gray-600">Convide pessoas para fazer parte da sua equipe</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo Convite
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Criar Novo Convite</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail do Convidado
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="usuario@exemplo.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Função
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="viewer">Visualizador</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowInviteForm(false)}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreateInvite}
              disabled={loading || !inviteEmail.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Convite'}
            </button>
          </div>
        </div>
      )}

      {/* Invitations List */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4">Convites Enviados</h4>
        
        {loadingInvites ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Carregando convites...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum convite enviado ainda</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Convite" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(invitation.status)}
                    <div>
                      <p className="font-medium text-gray-900">{invitation.email}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Função: {invitation.role}</span>
                        <span>Criado: {formatDate(invitation.createdAt)}</span>
                        <span>Expira: {formatDate(invitation.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                      {invitation.status === 'pending' ? 'Pendente' :
                       invitation.status === 'accepted' ? 'Aceito' :
                       invitation.status === 'expired' ? 'Expirado' : 'Cancelado'}
                    </span>
                    
                    {invitation.status === 'pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyInviteLink(invitation.id)}
                          className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Copiar link"
                        >
                          <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                          Copiar Link
                        </button>
                        
                        <button
                          onClick={() => openMailto(invitation)}
                          className="flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Abrir cliente de e-mail"
                        >
                          <EnvelopeIcon className="w-3 h-3 mr-1" />
                          Enviar E-mail
                        </button>
                        
                        <button
                          onClick={() => handleCancelInvite(invitation.id)}
                          className="flex items-center px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Cancelar convite"
                        >
                          <XMarkIcon className="w-3 h-3 mr-1" />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-amber-800 mb-2">Como funciona o convite:</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>1. Crie um convite inserindo o e-mail e escolhendo a função</li>
          <li>2. Copie o link gerado ou use o botão "Enviar E-mail" para abrir seu cliente de e-mail</li>
          <li>3. Envie o link para a pessoa convidada</li>
          <li>4. A pessoa deve clicar no link e fazer login/cadastro para aceitar</li>
          <li>5. Convites expiram em 72 horas</li>
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          <strong>Nota:</strong> O envio automático de e-mails requer plano Blaze + serviço SMTP. 
          No plano gratuito, use o botão "Enviar E-mail" para abrir seu cliente de e-mail.
        </p>
      </div>
    </div>
  );
}