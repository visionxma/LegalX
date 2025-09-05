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
  ExclamationTriangleIcon,
  LinkIcon,
  ShieldCheckIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamTabProps {
  team: Team | null;
}

interface InviteWithToken {
  invitation: TeamInvitation;
  token: string;
  link: string;
}

export default function TeamTab({ team }: TeamTabProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [inviteTokens, setInviteTokens] = useState<Map<string, string>>(new Map());
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

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
      
      const result = await adminService.createInvitation(team.id, inviteEmail.trim(), inviteRole);
      
      if (result) {
        // Salvar token temporariamente para mostrar link
        setInviteTokens(prev => new Map(prev.set(result.invitation.id, result.token)));
        
        await loadInvitations();
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteRole('viewer');
        
        // Expandir automaticamente o convite recém criado para mostrar o link
        setExpandedInvite(result.invitation.id);
        
        alert('Convite criado com sucesso! Use o botão "Ver Link" para copiar o link seguro.');
      } else {
        alert('Erro ao criar convite. Verifique se o e-mail já não foi convidado.');
      }
    } catch (error: any) {
      console.error('Erro ao criar convite:', error);
      
      if (error.message?.includes('já existe')) {
        alert('Já existe um convite pendente para este e-mail.');
      } else if (error.message?.includes('já é membro')) {
        alert('Este usuário já é membro da equipe.');
      } else {
        alert('Erro ao criar convite. Tente novamente.');
      }
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
          // Remover token da memória
          setInviteTokens(prev => {
            const updated = new Map(prev);
            updated.delete(inviteId);
            return updated;
          });
        }
      } catch (error) {
        console.error('Erro ao cancelar convite:', error);
        alert('Erro ao cancelar convite.');
      }
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (confirm('Tem certeza que deseja revogar este convite? Esta ação não pode ser desfeita.')) {
      try {
        const success = await adminService.revokeInvitation(inviteId);
        if (success) {
          await loadInvitations();
          setInviteTokens(prev => {
            const updated = new Map(prev);
            updated.delete(inviteId);
            return updated;
          });
        }
      } catch (error) {
        console.error('Erro ao revogar convite:', error);
        alert('Erro ao revogar convite.');
      }
    }
  };

  const copyInviteLink = async (inviteId: string) => {
    const token = inviteTokens.get(inviteId);
    if (!token) {
      alert('Token não disponível. Este link só pode ser copiado logo após a criação do convite por segurança.');
      return;
    }

    const link = adminService.generateInviteLink(inviteId, token);
    
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInvite(inviteId);
      setTimeout(() => setCopiedInvite(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      // Fallback para browsers sem clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedInvite(inviteId);
        setTimeout(() => setCopiedInvite(null), 2000);
      } catch (e) {
        alert('Não foi possível copiar automaticamente. Link: ' + link);
      }
      document.body.removeChild(textarea);
    }
  };

  const openMailto = (invitation: TeamInvitation) => {
    const token = inviteTokens.get(invitation.id);
    if (!token) {
      alert('Token não disponível para envio de e-mail. Copie o link manualmente.');
      return;
    }

    const inviteLink = adminService.generateInviteLink(invitation.id, token);
    const mailtoLink = adminService.generateMailtoLink(invitation.email, inviteLink, team?.name || 'LegalX');
    window.open(mailtoLink, '_blank');
  };

  const toggleExpandInvite = (inviteId: string) => {
    setExpandedInvite(expandedInvite === inviteId ? null : inviteId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-amber-500" />;
      case 'accepted':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'expired':
      case 'cancelled':
      case 'revoked':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'expired': return 'Expirado';
      case 'cancelled': return 'Cancelado';
      case 'revoked': return 'Revogado';
      default: return status;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="w-4 h-4 text-blue-500" />;
      case 'editor':
        return <PlusIcon className="w-4 h-4 text-green-500" />;
      case 'viewer':
        return <EyeIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <EyeIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 6 && hoursUntilExpiry > 0; // Últimas 6 horas
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
          <p className="text-gray-600">Convide pessoas para fazer parte da sua equipe com links seguros</p>
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
                E-mail do Convidado *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="usuario@exemplo.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Função *
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4 mr-2" />
                  Criar Convite Seguro
                </>
              )}
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
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum convite enviado ainda</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Convite" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(invitation.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{invitation.email}</p>
                        {getRoleIcon(invitation.role)}
                        {isExpiringSoon(invitation.expiresAt) && invitation.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Expira em breve
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>Função: <span className="capitalize font-medium">{invitation.role}</span></span>
                        <span>Criado: {formatDate(invitation.createdAt)}</span>
                        <span>Expira: {formatDate(invitation.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(invitation.status)}`}>
                      {getStatusText(invitation.status)}
                    </span>
                    
                    {invitation.status === 'pending' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleExpandInvite(invitation.id)}
                          className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          title="Ver opções"
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {expandedInvite === invitation.id ? 'Ocultar' : 'Ver Link'}
                        </button>
                        
                        <button
                          onClick={() => handleCancelInvite(invitation.id)}
                          className="flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          title="Cancelar convite"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {invitation.status === 'accepted' && (
                      <button
                        onClick={() => handleRevokeInvite(invitation.id)}
                        className="flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        title="Revogar acesso"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Actions */}
                {expandedInvite === invitation.id && invitation.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="space-y-3">
                      {inviteTokens.has(invitation.id) ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => copyInviteLink(invitation.id)}
                              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                              {copiedInvite === invitation.id ? 'Link Copiado!' : 'Copiar Link Seguro'}
                            </button>
                            
                            <button
                              onClick={() => openMailto(invitation)}
                              className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <EnvelopeIcon className="w-4 h-4 mr-2" />
                              Abrir E-mail
                            </button>
                          </div>

                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                            <p><strong>Link seguro disponível</strong></p>
                            <p>Este link contém um token único e seguro que expira em 72 horas.</p>
                            <p className="mt-1 text-amber-600">
                              <strong>Importante:</strong> O link completo só está disponível logo após a criação por segurança.
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 p-3 rounded">
                          <p><strong>Token de segurança não disponível</strong></p>
                          <p>Por segurança, o token do convite só está disponível imediatamente após a criação.</p>
                          <p className="mt-1">Para reenviar, cancele este convite e crie um novo.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Accepted/Used Info */}
                {invitation.status === 'accepted' && invitation.usedAt && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-green-600">
                      ✓ Aceito em {formatDate(invitation.usedAt)}
                      {invitation.acceptedBy && <span className="text-gray-500"> por {invitation.acceptedBy}</span>}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
          <ShieldCheckIcon className="w-4 h-4 mr-2" />
          Sistema de Convites Seguros
        </h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Cada convite possui um token único e criptografado</li>
          <li>• Links expiram automaticamente em 72 horas</li>
          <li>• Tokens só são visíveis imediatamente após a criação</li>
          <li>• Usuários precisam fazer login com o e-mail correto para aceitar</li>
          <li>• Convites são salvos automaticamente para usuários não autenticados</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">
          <strong>Dica:</strong> Para reenviar um convite, cancele o atual e crie um novo para gerar um novo link seguro.
        </p>
      </div>

      {/* Plano Spark Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Funcionalidade Completa no Plano Gratuito</h4>
        <p className="text-sm text-blue-700">
          O sistema de convites funciona completamente no plano Spark (gratuito). 
          Use o botão "Abrir E-mail" para enviar via seu cliente de e-mail padrão.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          Para envio automático de e-mails, considere upgradar para o plano Blaze + configurar função Cloud.
        </p>
      </div>
    </div>
  );
}