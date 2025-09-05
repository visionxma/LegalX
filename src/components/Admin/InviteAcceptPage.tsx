import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { TeamInvitation, InviteValidationResult } from '../../types/admin';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [validation, setValidation] = useState<InviteValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; requiresAuth?: boolean } | null>(null);

  const inviteId = searchParams.get('inviteId');
  const token = searchParams.get('token');

  useEffect(() => {
    if (inviteId && token) {
      validateInvitation();
    } else {
      setResult({ success: false, message: 'Link de convite inválido - parâmetros em falta' });
      setLoading(false);
    }
  }, [inviteId, token]);

  // Auto processar convites pendentes ao carregar (se usuário está logado)
  useEffect(() => {
    const processExistingInvites = async () => {
      try {
        const pendingResult = await adminService.processPendingInvites();
        if (pendingResult.processed > 0) {
          console.log(`${pendingResult.processed} convites pendentes processados`);
        }
      } catch (error) {
        console.error('Erro ao processar convites pendentes:', error);
      }
    };

    processExistingInvites();
  }, []);

  const validateInvitation = async () => {
    if (!inviteId || !token) return;
    
    try {
      setLoading(true);
      console.log('Validando convite:', { inviteId, tokenLength: token.length });
      
      const validationResult = await adminService.validateInvitation(inviteId, token);
      setValidation(validationResult);
      
      if (!validationResult.valid) {
        setResult({ success: false, message: validationResult.error || 'Convite inválido' });
        return;
      }
      
      if (validationResult.invitation) {
        setInvitation(validationResult.invitation);
        
        // Se usuário não está autenticado, mostrar opção de login
        if (validationResult.requiresAuth) {
          console.log('Convite válido mas requer autenticação');
        } else {
          console.log('Convite válido e usuário autenticado');
        }
      }
      
    } catch (error) {
      console.error('Erro ao validar convite:', error);
      setResult({ success: false, message: 'Erro ao processar convite. Tente novamente.' });
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
      
      setResult(response);
      
      if (response.success) {
        // Redirecionar para o dashboard após 3 segundos
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } else if (response.requiresAuth) {
        // Redirecionar para login após salvar convite pendente
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { message: 'Faça login para aceitar o convite' }
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      setResult({ success: false, message: 'Erro interno. Tente novamente.' });
    } finally {
      setAccepting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login', {
      state: { 
        message: 'Faça login para aceitar o convite',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando convite...</p>
          <p className="text-sm text-gray-400 mt-2">Verificando token de segurança</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          {result.success ? (
            <>
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Aceito!</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <div className="flex items-center justify-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Redirecionando para o sistema...
              </div>
            </>
          ) : result.requiresAuth ? (
            <>
              <UserPlusIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Necessário</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fazer Login
                </button>
                <p className="text-xs text-gray-500">
                  O convite será processado automaticamente após o login
                </p>
              </div>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro no Convite</h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
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

  if (!invitation || !validation?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
          <p className="text-gray-600 mb-6">
            Este link de convite não é válido, expirou ou já foi usado.
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
          <ClockIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Convite para Equipe</h2>
          <p className="text-gray-600 mb-4">
            Você foi convidado para fazer parte da equipe como{' '}
            <strong className="text-blue-600">{getRoleDisplayName(invitation.role)}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">E-mail:</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Função:</span>
                <span className="font-medium">{getRoleDisplayName(invitation.role)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expira em:</span>
                <span className="font-medium">
                  {format(new Date(invitation.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {invitation.status === 'pending' ? 'Pendente' : invitation.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning for unauthenticated users */}
        {validation?.requiresAuth && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800">
                  Você precisa fazer login ou criar uma conta para aceitar este convite.
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
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <UserPlusIcon className="w-5 h-5 mr-2" />
                Fazer Login para Aceitar
              </button>
              <p className="text-xs text-center text-gray-500">
                O convite será salvo e processado automaticamente após o login
              </p>
            </>
          ) : (
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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

        {/* Security Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Este convite possui token de segurança e expira automaticamente.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ao aceitar, você terá acesso aos módulos permitidos pela sua função.
          </p>
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <strong>Debug:</strong><br />
            InviteId: {inviteId}<br />
            Token: {token?.substring(0, 10)}...<br />
            RequiresAuth: {validation?.requiresAuth ? 'Yes' : 'No'}<br />
            Status: {invitation.status}
          </div>
        )}
      </div>
    </div>
  );
}