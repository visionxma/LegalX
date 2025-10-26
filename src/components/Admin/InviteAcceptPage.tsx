// DIFF: src/components/Admin/InviteAcceptPage.tsx
// Principais mudanças:
// - Validação sem auth obrigatória inicialmente
// - UI/UX melhorada para mostrar metadados do convite
// - Fluxo claro para login/signup
// - Mensagens de erro mais específicas

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { TeamInvitation, InviteValidationResult } from '../../types/admin';
import { useTeam } from '../../contexts/TeamContext'; // NOVO
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, UserPlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [validation, setValidation] = useState<InviteValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{ 
    success: boolean; 
    message: string; 
    requiresAuth?: boolean;
    isError?: boolean;
  } | null>(null);

  const inviteId = searchParams.get('inviteId');
  const token = searchParams.get('token');

  useEffect(() => {
    if (inviteId && token) {
      validateInvitation();
    } else {
      setResult({ 
        success: false, 
        message: 'Link de convite inválido - parâmetros obrigatórios não encontrados',
        isError: true
      });
      setLoading(false);
    }
  }, [inviteId, token]);

  // Auto processar convites pendentes ao carregar (se usuário está logado)
  useEffect(() => {
    const processExistingInvites = async () => {
      try {
        const pendingResult = await adminService.processPendingInvites();
        if (pendingResult.processed > 0) {
          console.log(`${pendingResult.processed} convites pendentes processados automaticamente`);
        }
      } catch (error) {
        console.error('Erro ao processar convites pendentes:', error);
      }
    };

    // Aguardar um pouco para não interferir com a validação atual
    setTimeout(processExistingInvites, 1000);
  }, []);

  const validateInvitation = async () => {
    if (!inviteId || !token) return;
    
    try {
      setLoading(true);
      console.log('Validando convite:', { inviteId, tokenLength: token.length });
      
      const validationResult = await adminService.validateInvitation(inviteId, token);
      setValidation(validationResult);
      
      if (!validationResult.valid) {
        setResult({ 
          success: false, 
          message: validationResult.error || 'Convite inválido',
          isError: true
        });
        return;
      }
      
      if (validationResult.invitation) {
        setInvitation(validationResult.invitation);
        console.log('Convite válido:', validationResult);
      }
      
    } catch (error) {
      console.error('Erro ao validar convite:', error);
      setResult({ 
        success: false, 
        message: 'Erro interno ao processar convite. Verifique sua conexão e tente novamente.',
        isError: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteId || !token) return;
    
    try {
      setAccepting(true);
      console.log('Tentando aceitar convite:', inviteId);
      
      const response = await adminService.acceptInvitation(inviteId, token);
      console.log('Resposta do acceptInvitation:', response);
      
      setResult({
        success: response.success,
        message: response.message,
        requiresAuth: response.requiresAuth,
        isError: !response.success && !response.requiresAuth
      });
      
      if (response.success) {
        // Sucesso - redirecionar para o dashboard após 3 segundos
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } else if (response.requiresAuth) {
        // Salvo no localStorage - redirecionar para login após 2 segundos  
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { 
              message: 'Faça login para aceitar o convite',
              inviteInfo: {
                email: invitation?.email,
                teamName: 'equipe' // Pode buscar nome da equipe se necessário
              }
            }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      setResult({ 
        success: false, 
        message: 'Erro interno. Verifique sua conexão e tente novamente.',
        isError: true
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', {
      state: { 
        message: 'Faça login com o e-mail correto para aceitar o convite',
        inviteInfo: {
          email: invitation?.email,
          teamName: 'equipe'
        },
        returnTo: window.location.pathname + window.location.search
      }
    });
  };

  const handleGoToSignup = () => {
    navigate('/register', {
      state: { 
        message: 'Crie sua conta para aceitar o convite',
        inviteInfo: {
          email: invitation?.email,
          teamName: 'equipe'  
        },
        returnTo: window.location.pathname + window.location.search
      }
    });
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'owner': 'Proprietário',
      'admin': 'Administrador', 
      'editor': 'Editor',
      'viewer': 'Visualizador'
    };
    return roleNames[role] || role;
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m restantes`;
    } else {
      return `${diffMins}m restantes`;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Validando convite...</p>
          <p className="text-sm text-gray-400 mt-2">Verificando token de segurança</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              🔐 Validando token criptográfico e verificando expiração
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Result State (Success, Error, or Auth Required)
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          {result.success ? (
            <>
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Aceito!</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">
                  ✓ Você foi adicionado à equipe com sucesso<br/>
                  ✓ Suas permissões foram configuradas automaticamente
                </p>
              </div>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Redirecionando para o sistema...
              </div>
            </>
          ) : result.requiresAuth ? (
            <>
              <UserPlusIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Necessário</h2>
              <p className="text-gray-600 mb-4">{result.message}</p>
              
              {invitation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Convite para:</strong> {invitation.email}
                  </p>
                  <p className="text-xs text-blue-600">
                    O convite foi salvo e será processado automaticamente após o login
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <UserPlusIcon className="w-5 h-5 mr-2" />
                  Fazer Login
                </button>
                
                <button
                  onClick={handleGoToSignup}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <UserPlusIcon className="w-5 h-5 mr-2" />
                  Criar Conta
                </button>

                <p className="text-xs text-gray-500 mt-4">
                  Você deve usar o e-mail <strong>{invitation?.email}</strong> para aceitar este convite
                </p>
              </div>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {result.isError ? 'Erro no Convite' : 'Convite Inválido'}
              </h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700">
                  ⚠️ Possíveis causas:
                </p>
                <ul className="text-xs text-red-600 mt-2 list-disc list-inside space-y-1">
                  <li>Link expirado (convites expiram em 72 horas)</li>
                  <li>Convite já foi aceito anteriormente</li>
                  <li>Convite foi cancelado pelo administrador</li>
                  <li>Token de segurança inválido</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir para o Sistema
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Main Invite Display (Valid invite, ready to accept)
  if (!invitation || !validation?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
          <p className="text-gray-600 mb-6">
            Este link de convite não é válido ou não pode ser processado.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para o Sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Legal<span className="text-amber-400">X</span>
          </h1>
          <p className="text-blue-600">Sistema de Gestão Jurídica</p>
        </div>

        {/* Invitation Details */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">Convite para Equipe</h2>
          <p className="text-gray-600 mb-4">
            Você foi convidado para fazer parte da equipe como{' '}
            <strong className="text-blue-600">{getRoleDisplayName(invitation.role)}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">E-mail:</span>
                <span className="font-medium text-blue-800">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Função:</span>
                <span className="font-medium text-blue-800">{getRoleDisplayName(invitation.role)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expira em:</span>
                <span className="font-medium text-amber-700">
                  {getTimeUntilExpiry(invitation.expiresAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Criado em:</span>
                <span className="font-medium text-gray-700">
                  {format(new Date(invitation.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {invitation.status === 'pending' ? 'Pendente' : invitation.status}
                </span>
              </div>
            </div>
            
            {/* Security indicator */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center text-xs text-blue-700">
                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                <span>Convite seguro com token criptografado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning for unauthenticated users */}
        {validation?.requiresAuth && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium mb-1">Login necessário</p>
                <p className="text-xs text-amber-700">
                  Você precisa fazer login com o e-mail <strong>{invitation.email}</strong> para aceitar este convite.
                  Se não possui conta, você pode criar uma.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {validation?.requiresAuth ? (
            <>
              <button
                onClick={handleGoToLogin}
                disabled={accepting}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                Fazer Login
              </button>
              
              <button
                onClick={handleGoToSignup}
                disabled={accepting}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                Criar Nova Conta
              </button>
              
              <p className="text-xs text-center text-gray-500">
                O convite será salvo e processado automaticamente após o login
              </p>
            </>
          ) : (
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aceitando Convite...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Aceitar Convite
                </>
              )}
            </button>
          )}
          
          <button
            onClick={() => navigate('/')}
            disabled={accepting}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>

        {/* Security & Process Info */}
        <div className="mt-6 space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-green-800 mb-1 flex items-center">
              <ShieldCheckIcon className="w-3 h-3 mr-1" />
              Processo Seguro
            </h4>
            <ul className="text-xs text-green-700 space-y-0.5">
              <li>• Token único validado via SHA-256</li>
              <li>• Verificação automática de expiração</li>
              <li>• Validação de e-mail obrigatória</li>
              <li>• Convite salvo localmente se necessário</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Este convite possui token de segurança e expira automaticamente.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ao aceitar, você terá acesso aos módulos permitidos pela sua função.
            </p>
          </div>
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <strong>Debug Info:</strong><br />
            InviteId: {inviteId}<br />
            Token: {token?.substring(0, 10)}...<br />
            RequiresAuth: {validation?.requiresAuth ? 'Yes' : 'No'}<br />
            Status: {invitation.status}<br />
            Email Match Required: {invitation.email}
          </div>
        )}
      </div>
    </div>
  );
}