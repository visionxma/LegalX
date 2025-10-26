// src/components/Admin/TeamTab.tsx
import React, { useState, useEffect } from 'react';
import { Team, TeamInvitation } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { useTeam } from '../../contexts/TeamContext';
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

export default function TeamTab({ team }: TeamTabProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // NOVO: Verificar permissões
  const { isOwner, isSoloMode, checkPermission } = useTeam();
  const canManageTeam = isSoloMode || isOwner || checkPermission('equipe');

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
    if (!team || !inviteEmail.trim() || !canManageTeam) return;
    
    try {
      setLoading(true);
      
      const result = await adminService.createInvitation(team.id, inviteEmail.trim(), inviteRole);
      
      if (result) {
        setLastCreatedLink(result.link);
        
        await loadInvitations();
        setShowInviteForm(false);
        setInviteEmail('');
        setInviteRole('viewer');
        
        alert('Convite criado com sucesso! Copie o link seguro para enviar.');
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
    if (!canManageTeam) {
      alert('Você não possui permissão para cancelar convites.');
      return;
    }
    
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

  const copyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (e) {
        alert('Não foi possível copiar automaticamente. Link: ' + link);
      }
      document.body.removeChild(textarea);
    }
  };

  const openMailto = (email: string, link: string) => {
    const subject = encodeURIComponent(`Convite para ${team?.name} - LegalX`);
    const body = encodeURIComponent(`
Olá!

Você foi convidado(a) para fazer parte da equipe "${team?.name}" no LegalX - Sistema de Gestão Jurídica.

Para aceitar o convite, clique no link abaixo:
${link}

Este convite expira em 72 horas.

Se você ainda não possui uma conta, será direcionado para criar uma.

Atenciosamente,
Equipe LegalX
    `.trim());
    
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
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
    return hoursUntilExpiry <= 6 && hoursUntilExpiry > 0;
  };

  // GUARD: Modo visualização se não puder gerenciar
  if (!canManageTeam) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ Você não possui permissão para gerenciar convites da equipe.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Convites da Equipe</h3>
          {loadingInvites ? (
            <p className="text-gray-500">Carregando...</p>
          ) : (
            <p className="text-gray-600">
              {invitations.length} convite(s) registrado(s)
            </p>
          )}
        </div>
      </div>
    );
  }

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
          <p className="text-gray-600">Convide pessoas com links seguros que expiram automaticamente</p>
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
          <h4 className="text-md font-semibold text-gray-900 mb-4">Criar Novo Convite Seguro</h4>
          
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
                  Criar Link Seguro
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Link recém-criado */}
      {lastCreatedLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h4 className="text-md font-semibold text-green-900 mb-2">
                Convite Criado com Sucesso!
              </h4>
              <p className="text-sm text-green-700 mb-4">
                Copie o link seguro abaixo e envie para o convidado:
              </p>
              
              <div className="bg-white border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-xs text-gray-800 break-all flex-1 mr-2">
                    {lastCreatedLink}
                  </code>
                  <button
                    onClick={() => copyInviteLink(lastCreatedLink)}
                    className="flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openMailto(inviteEmail, lastCreatedLink)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Abrir E-mail
                </button>
                
                <button
                  onClick={() => setLastCreatedLink(null)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Fechar
                </button>
              </div>

              <div className="mt-3 text-xs text-green-600">
                <p><strong>⚠️ Importante:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Este link expira em <strong>72 horas</strong></li>
                  <li>Só pode ser usado pelo e-mail especificado</li>
                  <li>Contém token de segurança único</li>
                </ul>
              </div>
            </div>
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
                      <button
                        onClick={() => handleCancelInvite(invitation.id)}
                        className="flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        title="Cancelar convite"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Accepted/Used Info */}
                {invitation.status === 'accepted' && invitation.usedAt && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-green-600">
                      ✓ Aceito em {formatDate(invitation.usedAt)}
                      {invitation.acceptedBy && <span className="text-gray-500"> por {invitation.acceptedBy}</span>}
                    </p>
                  </div>
                )}

                {/* Warning para convites expirados */}
                {invitation.status === 'expired' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-red-600">
                      ⚠️ Convite expirado. Crie um novo convite se necessário.
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
          <li>• Cada convite possui um <strong>token único criptografado</strong></li>
          <li>• Links expiram automaticamente em <strong>72 horas</strong></li>
          <li>• Validação de e-mail: só funciona com o e-mail correto</li>
          <li>• Tokens não são salvos no banco - apenas hash SHA-256</li>
          <li>• Usuários não autenticados podem ver o convite mas devem fazer login para aceitar</li>
        </ul>
        <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800">
          <p><strong>Como funciona:</strong></p>
          <p>1. Crie o convite → 2. Copie o link seguro → 3. Envie via e-mail/WhatsApp → 4. Convidado clica e faz login → 5. Convite é validado e aceito automaticamente</p>
        </div>
      </div>

      {/* Manual sending instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Como Enviar Convites</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>Opção 1:</strong> Use o botão "Abrir E-mail" para enviar via seu cliente de e-mail padrão</p>
          <p><strong>Opção 2:</strong> Copie o link e envie via WhatsApp, Telegram, ou qualquer mensageiro</p>
          <p><strong>Opção 3:</strong> Copie o link e cole em seu cliente de e-mail personalizado</p>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          <p>⚠️ <strong>Importante:</strong> Cada link funciona apenas para o e-mail especificado e expira em 72h. Não compartilhe links entre pessoas diferentes.</p>
        </div>
      </div>
    </div>
  );
}